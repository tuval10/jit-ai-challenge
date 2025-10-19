import { DockerGenerationState } from "../types";
import { DOCKERFILE_GENERATION_PROMPT } from "../prompts";

const MAX_RETRIES = 3;

export async function dockerfileGenerationNode(
  state: DockerGenerationState,
  llm: any
): Promise<Partial<DockerGenerationState>> {
  const retryCount = state.dockerfileGenerationRetries || 0;

  try {
    if (!state.detectedLanguage) {
      throw new Error(
        "Language detection must be completed before Dockerfile generation"
      );
    }

    const prompt = DOCKERFILE_GENERATION_PROMPT(
      state.detectedLanguage,
      state.usageInfo,
      state.scriptPath
    );

    const response = await llm.invoke([{ role: "user", content: prompt }]);

    let dockerfile = response.content.trim();

    // Clean up the response - remove markdown if present
    if (
      dockerfile.startsWith("```dockerfile") ||
      dockerfile.startsWith("```")
    ) {
      dockerfile = dockerfile
        .replace(/^```(dockerfile)?\n/, "")
        .replace(/\n```$/, "");
    }

    // Validate basic Dockerfile structure
    if (!dockerfile.includes("FROM ")) {
      throw new Error("Generated Dockerfile missing required FROM instruction");
    }

    console.log(`📝 Generated Dockerfile for ${state.detectedLanguage.name}`);
    console.log(`   Base image: ${state.detectedLanguage.baseImage}`);

    return {
      dockerfile,
      dockerfileGenerationRetries: 0, // Reset on success
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Dockerfile generation failed (attempt ${retryCount + 1}):`,
      errorMessage
    );

    // Return state for potential retry
    return {
      dockerfileGenerationRetries: retryCount + 1,
      maxRetries: MAX_RETRIES,
    };
  }
}

// Helper function to determine if we should retry dockerfile generation
export function shouldRetryDockerfileGeneration(
  state: DockerGenerationState
): "retry" | "fail" | "continue" {
  const retryCount = state.dockerfileGenerationRetries || 0;
  const maxRetries = state.maxRetries || MAX_RETRIES;

  // If we have a dockerfile, continue
  if (state.dockerfile && state.dockerfile.includes("FROM ")) {
    return "continue";
  }

  // If we haven't exceeded retries, retry
  if (retryCount < maxRetries) {
    console.log(
      `⚠️  Dockerfile generation failed, retrying (${retryCount}/${maxRetries})`
    );
    return "retry";
  }

  // Otherwise, fail
  console.error("❌ Dockerfile generation failed after maximum retries");
  return "fail";
}
