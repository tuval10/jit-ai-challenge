import { DockerGenerationState, DetectedLanguage } from "../types";
import { LANGUAGE_DETECTION_PROMPT } from "../prompts";
import { validateDetectedLanguage, safeJsonParse } from "../schemas";

const MAX_RETRIES = 3;

export async function languageDetectionNode(
  state: DockerGenerationState,
  llm: any
): Promise<Partial<DockerGenerationState>> {
  const retryCount = state.languageDetectionRetries || 0;

  try {
    const prompt = LANGUAGE_DETECTION_PROMPT(
      state.scriptContent,
      state.scriptPath,
      state.usageInfo,
      retryCount > 0 ? retryCount : undefined // Pass retry context to prompt
    );

    const response = await llm.invoke([{ role: "user", content: prompt }]);

    // Parse and validate the JSON response using Zod
    let detectedLanguage: DetectedLanguage;
    try {
      // First try direct parsing
      detectedLanguage = safeJsonParse(
        response.content,
        validateDetectedLanguage
      );
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        detectedLanguage = safeJsonParse(
          jsonMatch[0],
          validateDetectedLanguage
        );
      } else {
        throw new Error(
          `Failed to parse JSON response. Response: ${response.content.substring(
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

// Helper function to determine if we should retry language detection
export function shouldRetryLanguageDetection(
  state: DockerGenerationState
): "retry" | "fail" | "continue" {
  const retryCount = state.languageDetectionRetries || 0;
  const maxRetries = state.maxRetries || MAX_RETRIES;

  console.log(`[DEBUG] shouldRetryLanguageDetection - retryCount: ${retryCount}, maxRetries: ${maxRetries}, hasDetectedLanguage: ${!!state.detectedLanguage}`);

  // If we have a detected language, continue
  if (state.detectedLanguage) {
    console.log("✅ Language detected, continuing to next step");
    return "continue";
  }

  // If we haven't exceeded retries, retry
  if (retryCount < maxRetries) {
    console.log(
      `⚠️  Language detection failed, retrying (${retryCount}/${maxRetries})`
    );
    return "retry";
  }

  // Otherwise, fail
  console.error(`❌ Language detection failed after maximum retries (${retryCount}/${maxRetries})`);
  return "fail";
}
