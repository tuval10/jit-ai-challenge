import { readFile } from 'fs/promises';
import { type DockerGenerationState } from '../../types';
import { SCRIPT_ANALYSIS_PROMPT } from './script-analysis.prompts';
import {
  validateScriptAnalysis,
  safeJsonParse,
  type ValidatedScriptAnalysis,
} from './schemas';
import { ROUTES } from '../../graphs/docker-generation-graph';
import { type SupportedLLM } from '../../config/llm-providers';

const MAX_RETRIES = 3;

/**
 * Comprehensive script analysis node
 * Analyzes both script content and README to extract:
 * - Language detection (runtime, base image, dependencies)
 * - Usage information (command, example, expected output)
 */
export async function scriptAnalysisNode(
  state: DockerGenerationState,
  llm: SupportedLLM
): Promise<Partial<DockerGenerationState>> {
  const retryCount = state.scriptAnalysisRetries ?? 0;

  // If both language and usage are already present, skip analysis
  if (state.detectedLanguage && state.usageInfo) {
    console.log('✅ Script already analyzed, skipping...');
    return {
      detectedLanguage: state.detectedLanguage,
      usageInfo: state.usageInfo,
      scriptAnalysisRetries: 0,
    };
  }

  try {
    console.log('🔍 Performing comprehensive script analysis...');

    // Read README content
    const readmeContent = await readFile(state.readmePath, 'utf8');

    // Use unified LLM prompt for comprehensive analysis
    const prompt = SCRIPT_ANALYSIS_PROMPT(
      state.scriptContent,
      state.scriptPath,
      readmeContent,
      state.readmePath,
      retryCount > 0 ? retryCount : undefined
    );

    const response = await llm.invoke([{ role: 'user', content: prompt }]);

    // Extract string content from LLM response
    const responseContent =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    // Parse and validate the JSON response using Zod schema
    let analysis: ValidatedScriptAnalysis;

    try {
      // First try direct parsing with Zod validation
      analysis = safeJsonParse(responseContent, validateScriptAnalysis);
    } catch (parseError) {
      // Fallback: try multiple strategies to extract JSON from wrapped response
      let extractedJson: string | null = null;

      // Strategy 1: Remove markdown code blocks (```json ... ``` or ``` ... ```)
      const markdownMatch = responseContent.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?```/
      );
      if (markdownMatch) {
        extractedJson = markdownMatch[1].trim();
      }

      // Strategy 2: Extract from first { to last } (greedy match)
      if (!extractedJson) {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedJson = jsonMatch[0];
        }
      }

      // Strategy 3: Try to find JSON object boundaries more carefully
      if (!extractedJson) {
        const firstBrace = responseContent.indexOf('{');
        const lastBrace = responseContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          extractedJson = responseContent.substring(firstBrace, lastBrace + 1);
        }
      }

      if (extractedJson) {
        try {
          analysis = safeJsonParse(extractedJson, validateScriptAnalysis);
          console.log('⚠️  Had to extract JSON from wrapped response');
        } catch (extractError) {
          throw new Error(
            `Failed to parse extracted JSON: ${
              extractError instanceof Error
                ? extractError.message
                : String(extractError)
            }`
          );
        }
      } else {
        throw new Error(
          `Failed to parse LLM response as JSON: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }. Response did not contain valid JSON.`
        );
      }
    }

    console.log('✅ Script analysis completed');
    console.log(
      `   Language: ${analysis.language.name} (${analysis.language.runtime})`
    );
    console.log(`   Command: ${analysis.usage.command}`);
    console.log(`   Example: ${analysis.usage.example}`);

    return {
      detectedLanguage: analysis.language,
      usageInfo: analysis.usage,
      scriptAnalysisRetries: 0, // Reset on success
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Script analysis failed (attempt ${retryCount + 1}):`,
      errorMessage
    );

    // Return state for potential retry
    return {
      scriptAnalysisRetries: retryCount + 1,
      maxRetries: MAX_RETRIES,
      failedStep: 'script_analysis',
      errorMessage,
    };
  }
}

// Type for script analysis routes
type ScriptAnalysisRoute =
  (typeof ROUTES.SCRIPT_ANALYSIS)[keyof typeof ROUTES.SCRIPT_ANALYSIS];

// Helper function to determine if we should retry script analysis
export function shouldRetryScriptAnalysis(
  state: DockerGenerationState
): ScriptAnalysisRoute {
  const retryCount = state.scriptAnalysisRetries ?? 0;
  const maxRetries = state.maxRetries ?? MAX_RETRIES;

  console.log(
    `[DEBUG] shouldRetryScriptAnalysis - retryCount: ${retryCount}, maxRetries: ${maxRetries}, hasLanguage: ${!!state.detectedLanguage}, hasUsage: ${!!state.usageInfo}`
  );

  // If we have both language and usage info, continue
  if (state.detectedLanguage && state.usageInfo) {
    console.log('✅ Script analysis complete, continuing to next step');
    return ROUTES.SCRIPT_ANALYSIS.CONTINUE;
  }

  // If we haven't exceeded retries, retry
  if (retryCount < maxRetries) {
    console.log(
      `⚠️  Script analysis failed, retrying (${retryCount}/${maxRetries})`
    );
    return ROUTES.SCRIPT_ANALYSIS.RETRY;
  }

  // Otherwise, fail
  console.error(
    `❌ Script analysis failed after maximum retries (${retryCount}/${maxRetries})`
  );
  return ROUTES.SCRIPT_ANALYSIS.FAIL;
}
