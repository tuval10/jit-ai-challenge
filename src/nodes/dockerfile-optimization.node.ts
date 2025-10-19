import { DockerGenerationState } from "../types";
import { DOCKERFILE_OPTIMIZATION_PROMPT } from "../prompts";

export async function dockerfileOptimizationNode(
  state: DockerGenerationState,
  llm: any
): Promise<Partial<DockerGenerationState>> {
  try {
    if (!state.dockerfile || !state.detectedLanguage) {
      throw new Error(
        "Dockerfile and language detection must be completed before optimization"
      );
    }

    const prompt = DOCKERFILE_OPTIMIZATION_PROMPT(
      state.dockerfile,
      state.detectedLanguage
    );

    const response = await llm.invoke([{ role: "user", content: prompt }]);

    let optimizedDockerfile = response.content.trim();

    // Clean up the response - remove markdown if present
    if (
      optimizedDockerfile.startsWith("```dockerfile") ||
      optimizedDockerfile.startsWith("```")
    ) {
      optimizedDockerfile = optimizedDockerfile
        .replace(/^```(dockerfile)?\n/, "")
        .replace(/\n```$/, "");
    }

    // Validate basic Dockerfile structure
    if (!optimizedDockerfile.includes("FROM ")) {
      console.log("⚠️  Optimization failed - using original Dockerfile");
      return {
        optimizationApplied: false,
      };
    }

    console.log(`🚀 Dockerfile optimized for ${state.detectedLanguage.name}`);

    return {
      dockerfile: optimizedDockerfile,
      optimizationApplied: true,
    };
  } catch (error: any) {
    console.error("Dockerfile optimization failed:", error.message);
    console.log("⚠️  Using original Dockerfile without optimization");

    return {
      optimizationApplied: false,
    };
  }
}
