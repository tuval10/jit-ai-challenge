import { type DockerGenerationState } from '../../types';
import { DOCKERFILE_OPTIMIZATION_PROMPT } from './dockerfile-optimization.prompts';
import { type SupportedLLM } from '../../config/llm-providers';
import { validateDockerfileSyntax } from '../../utils/docker-validation';

const MAX_RETRIES = 3;

export async function dockerfileOptimizationNode(
  state: DockerGenerationState,
  llm: SupportedLLM
): Promise<Partial<DockerGenerationState>> {
  const retryCount = state.dockerfileOptimizationRetries ?? 0;

  try {
    if (!state.dockerfile || !state.detectedLanguage) {
      throw new Error(
        'Dockerfile and language detection must be completed before optimization'
      );
    }

    const prompt = DOCKERFILE_OPTIMIZATION_PROMPT(
      state.dockerfile,
      state.detectedLanguage
    );

    const response = await llm.invoke([{ role: 'user', content: prompt }]);

    const responseText =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    let optimizedDockerfile = responseText.trim();

    // Clean up the response - remove markdown if present
    if (
      optimizedDockerfile.startsWith('```dockerfile') ||
      optimizedDockerfile.startsWith('```')
    ) {
      optimizedDockerfile = optimizedDockerfile
        .replace(/^```(dockerfile)?\n/, '')
        .replace(/\n```$/, '');
    }

    // Validate basic Dockerfile structure
    if (!optimizedDockerfile.includes('FROM ')) {
      throw new Error('Optimized Dockerfile missing required FROM instruction');
    }

    // Validate Dockerfile syntax with Docker
    console.log('🔍 Validating optimized Dockerfile syntax...');
    const validationResult = await validateDockerfileSyntax(
      optimizedDockerfile
    );

    if (!validationResult.isValid) {
      console.log('❌ Optimized Dockerfile syntax validation failed:');
      validationResult.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
      throw new Error(
        `Optimization validation failed: ${validationResult.errors.join(', ')}`
      );
    }

    console.log('✅ Optimized Dockerfile syntax validated');
    console.log(`🚀 Dockerfile optimized for ${state.detectedLanguage.name}`);

    return {
      dockerfile: optimizedDockerfile,
      validationResult,
      optimizationApplied: true,
      dockerfileOptimizationRetries: 0, // Reset on success
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Dockerfile optimization failed (attempt ${retryCount + 1}):`,
      errorMessage
    );

    // If we've exceeded retries, use original Dockerfile
    if (retryCount >= MAX_RETRIES - 1) {
      console.log('⚠️  Using original Dockerfile without optimization');
      return {
        optimizationApplied: false,
        dockerfileOptimizationRetries: retryCount + 1,
        failedStep: 'dockerfile_optimization',
        errorMessage,
      };
    }

    // Return state for retry
    return {
      dockerfileOptimizationRetries: retryCount + 1,
      maxRetries: MAX_RETRIES,
      failedStep: 'dockerfile_optimization',
      errorMessage,
    };
  }
}

// Helper function to determine if we should retry optimization
export function shouldRetryOptimization(
  state: DockerGenerationState
): 'retry' | 'skip' | 'continue' {
  const retryCount = state.dockerfileOptimizationRetries ?? 0;
  const maxRetries = state.maxRetries ?? MAX_RETRIES;

  // If optimization was applied successfully, continue
  if (state.optimizationApplied === true) {
    return 'continue';
  }

  // If optimization was explicitly skipped, skip
  if (state.optimizationApplied === false && retryCount >= maxRetries - 1) {
    console.log('⚠️  Skipping optimization after failed attempts');
    return 'skip';
  }

  // If we haven't exceeded retries, retry
  if (retryCount < maxRetries && state.optimizationApplied !== false) {
    console.log(
      `⚠️  Optimization failed, retrying (${retryCount}/${maxRetries})`
    );
    return 'retry';
  }

  // Default: skip optimization
  return 'skip';
}
