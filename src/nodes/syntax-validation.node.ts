import { DockerGenerationState, ValidationResult } from "../types";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function syntaxValidationNode(
  state: DockerGenerationState
): Promise<Partial<DockerGenerationState>> {
  try {
    if (!state.dockerfile) {
      throw new Error("Dockerfile must be generated before validation");
    }

    const validationResult = await validateDockerfileSyntax(state.dockerfile);

    if (validationResult.isValid) {
      console.log("✅ Dockerfile syntax validation passed");
    } else {
      console.log("❌ Dockerfile syntax validation failed:");
      validationResult.errors.forEach((error) => console.log(`   - ${error}`));
    }

    return {
      validationResult,
    };
  } catch (error: any) {
    console.error("Syntax validation failed:", error.message);
    const validationResult: ValidationResult = {
      isValid: false,
      errors: [`Validation error: ${error.message}`],
    };

    return {
      validationResult,
    };
  }
}

async function validateDockerfileSyntax(
  dockerfileContent: string
): Promise<ValidationResult> {
  const tempPath = `/tmp/claude/Dockerfile.${Date.now()}`;

  try {
    // Ensure temp directory exists
    await execAsync("mkdir -p /tmp/claude");

    // Write dockerfile to temp file
    await writeFile(tempPath, dockerfileContent);

    // Use Docker BuildKit --check for accurate syntax validation
    await execAsync(
      `DOCKER_BUILDKIT=1 docker build --check -f ${tempPath} /tmp/claude`
    );

    // Cleanup
    await unlink(tempPath);

    return { isValid: true, errors: [] };
  } catch (error: any) {
    // Cleanup on error
    try {
      await unlink(tempPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    // Parse Docker error message
    const errorMessage = error.message || "Unknown Docker validation error";

    return {
      isValid: false,
      errors: [errorMessage],
    };
  }
}
