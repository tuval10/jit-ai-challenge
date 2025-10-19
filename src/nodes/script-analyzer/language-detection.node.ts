import { type DockerGenerationState } from '../../types';
import { type DetectedLanguage } from './types';
import { SCRIPT_ANALYSIS_PROMPT } from './script-analysis.prompts';
import {
  validateDetectedLanguage,
  validateScriptAnalysis,
  safeJsonParse,
} from './schemas';
import { ROUTES } from '../../graphs/docker-generation-graph';
import { type SupportedLLM } from '../../config/llm-providers';

const MAX_RETRIES = 3;

export async function languageDetectionNode(
  state: DockerGenerationState,
  llm: SupportedLLM
): Promise<Partial<DockerGenerationState>> {
  // If language is already detected (from comprehensive analysis), skip detection
  if (state.detectedLanguage) {
    console.log(
      `✅ Language already detected: ${state.detectedLanguage.name} (${state.detectedLanguage.runtime})`
    );
    return {
      detectedLanguage: state.detectedLanguage,
      languageDetectionRetries: 0,
    };
  }

  // Otherwise, perform language detection (fallback for legacy flows)
  const retryCount = state.languageDetectionRetries ?? 0;

  try {
    console.log('🔍 Detecting language...');

    // Note: This is a fallback path. The preferred flow is to use
    // ScriptAnalyzer.analyzeScript() which does comprehensive analysis
    const prompt = SCRIPT_ANALYSIS_PROMPT(
      state.scriptContent,
      state.scriptPath,
      '', // No README content in fallback path
      '',
      retryCount > 0 ? retryCount : undefined
    );

    const response = await llm.invoke([{ role: 'user', content: prompt }]);

    // Parse and validate the JSON response using Zod
    let detectedLanguage: DetectedLanguage;
    const responseText =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    try {
      // Try to parse as comprehensive analysis first
      const analysis = safeJsonParse(responseText, validateScriptAnalysis);
      detectedLanguage = analysis.language;
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = safeJsonParse(jsonMatch[0], validateScriptAnalysis);
          detectedLanguage = analysis.language;
        } catch {
          // Last resort: try parsing as just language
          detectedLanguage = safeJsonParse(
            jsonMatch[0],
            validateDetectedLanguage
          );
        }
      } else {
        throw new Error(
          `Failed to parse JSON response. Response: ${responseText.substring(
            0,
            200
          )}...`
        );
      }
    }

    console.log(
      `🔍 Detected language: ${detectedLanguage.name} (${detectedLanguage.runtime})`
    );

    return {
      detectedLanguage,
      languageDetectionRetries: 0, // Reset on success
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Language detection failed (attempt ${retryCount + 1}):`,
      errorMessage
    );

    // Return state for potential retry
    return {
      languageDetectionRetries: retryCount + 1,
      maxRetries: MAX_RETRIES,
    };
  }
}

// Type for language detection routes
type LanguageDetectionRoute =
  (typeof ROUTES.LANGUAGE_DETECTION)[keyof typeof ROUTES.LANGUAGE_DETECTION];

// Helper function to determine if we should retry language detection
export function shouldRetryLanguageDetection(
  state: DockerGenerationState
): LanguageDetectionRoute {
  const retryCount = state.languageDetectionRetries ?? 0;
  const maxRetries = state.maxRetries ?? MAX_RETRIES;

  console.log(
    `[DEBUG] shouldRetryLanguageDetection - retryCount: ${retryCount}, maxRetries: ${maxRetries}, hasDetectedLanguage: ${!!state.detectedLanguage}`
  );

  // If we have a detected language, continue
  if (state.detectedLanguage) {
    console.log('✅ Language detected, continuing to next step');
    return ROUTES.LANGUAGE_DETECTION.CONTINUE;
  }

  // If we haven't exceeded retries, retry
  if (retryCount < maxRetries) {
    console.log(
      `⚠️  Language detection failed, retrying (${retryCount}/${maxRetries})`
    );
    return ROUTES.LANGUAGE_DETECTION.RETRY;
  }

  // Otherwise, fail
  console.error(
    `❌ Language detection failed after maximum retries (${retryCount}/${maxRetries})`
  );
  return ROUTES.LANGUAGE_DETECTION.FAIL;
}
