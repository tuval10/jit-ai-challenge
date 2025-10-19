import { StateGraph } from '@langchain/langgraph';
import { type DockerGenerationState } from '../types';
import {
  scriptAnalysisNode,
  shouldRetryScriptAnalysis,
} from '../nodes/script-analyzer';
import {
  dockerfileGenerationNode,
  shouldRetryDockerfileGeneration,
} from '../nodes/dockerfile-generation';
import {
  dockerfileOptimizationNode,
  shouldRetryOptimization,
} from '../nodes/dockerfile-optimization';
import { type SupportedLLM } from '../config/llm-providers';

// Route constants for type safety and consistency
export const ROUTES = {
  SCRIPT_ANALYSIS: {
    RETRY: 'retry',
    CONTINUE: 'continue',
    FAIL: 'fail',
  },
  LANGUAGE_DETECTION: {
    RETRY: 'retry',
    CONTINUE: 'continue',
    FAIL: 'fail',
  },
  DOCKERFILE_GENERATION: {
    RETRY: 'retry',
    CONTINUE: 'continue',
    FAIL: 'fail',
  },
  OPTIMIZATION: {
    RETRY: 'retry',
    SKIP: 'skip',
    CONTINUE: 'continue',
  },
} as const;

export class DockerGenerationGraph {
  private readonly graph: ReturnType<typeof this.buildWorkflow>;

  constructor(private readonly llm: SupportedLLM) {
    this.graph = this.buildWorkflow();
  }

  private buildWorkflow() {
    // Define state channels for proper state management
    const channels = {
      scriptContent: null,
      scriptPath: null,
      readmePath: null,
      usageInfo: null,
      detectedLanguage: null,
      dockerfile: null,
      validationResult: null,
      buildResult: null,
      optimizationApplied: null,
      scriptAnalysisRetries: null,
      languageDetectionRetries: null,
      dockerfileGenerationRetries: null,
      dockerfileOptimizationRetries: null,
      maxRetries: null,
      failedStep: null,
      errorMessage: null,
    };

    const workflow = new StateGraph({ channels } as any)
      .addNode('analyze_script', async (state: DockerGenerationState) => {
        return await scriptAnalysisNode(state, this.llm);
      })
      .addNode('generate_dockerfile', async (state: DockerGenerationState) => {
        return await dockerfileGenerationNode(state, this.llm);
      })
      .addNode('optimize_dockerfile', async (state: DockerGenerationState) => {
        return await dockerfileOptimizationNode(state, this.llm);
      })
      .addNode('handle_failure', async (state: DockerGenerationState) => {
        // Provide specific error message based on which step failed
        const failedStep = state.failedStep;
        const errorMessage = state.errorMessage;

        let specificError = 'Unknown step failed';
        switch (failedStep) {
          case 'script_analysis':
            specificError = 'Script analysis failed after maximum retries';
            break;
          case 'dockerfile_generation':
            specificError =
              'Dockerfile generation failed after maximum retries';
            break;
          case 'dockerfile_optimization':
            specificError =
              'Dockerfile optimization failed after maximum retries';
            break;
        }

        console.error(`❌ Workflow failed: ${specificError}`);
        if (errorMessage) {
          console.error(`   Reason: ${errorMessage}`);
        }

        throw new Error(
          `${specificError}${errorMessage ? `: ${errorMessage}` : ''}`
        );
      })
      // Script analysis with retry logic (language + usage detection)
      .addConditionalEdges(
        'analyze_script',
        (state: unknown) =>
          shouldRetryScriptAnalysis(state as DockerGenerationState),
        {
          [ROUTES.SCRIPT_ANALYSIS.RETRY]: 'analyze_script',
          [ROUTES.SCRIPT_ANALYSIS.CONTINUE]: 'generate_dockerfile',
          [ROUTES.SCRIPT_ANALYSIS.FAIL]: 'handle_failure',
        }
      )
      // Dockerfile generation with retry logic
      .addConditionalEdges(
        'generate_dockerfile',
        (state: unknown) =>
          shouldRetryDockerfileGeneration(state as DockerGenerationState),
        {
          [ROUTES.DOCKERFILE_GENERATION.RETRY]: 'generate_dockerfile',
          [ROUTES.DOCKERFILE_GENERATION.CONTINUE]: 'optimize_dockerfile',
          [ROUTES.DOCKERFILE_GENERATION.FAIL]: 'handle_failure',
        }
      )
      // Optimization with retry logic
      .addConditionalEdges(
        'optimize_dockerfile',
        (state: unknown) =>
          shouldRetryOptimization(state as DockerGenerationState),
        {
          [ROUTES.OPTIMIZATION.RETRY]: 'optimize_dockerfile',
          [ROUTES.OPTIMIZATION.SKIP]: '__end__', // Skip optimization, use original
          [ROUTES.OPTIMIZATION.CONTINUE]: '__end__', // Optimization succeeded
        }
      )
      .addEdge('handle_failure', '__end__')
      .addEdge('__start__', 'analyze_script');

    // Compile the workflow
    return workflow.compile();
  }

  async invoke(
    initialState: DockerGenerationState
  ): Promise<DockerGenerationState> {
    try {
      const result = await this.graph.invoke(initialState);
      return result as DockerGenerationState;
    } catch (error: any) {
      // Only log API key errors here, other errors are already logged by handle_failure
      if (error.message?.includes('API key')) {
        console.error('❌ Authentication Error:', error.message);
        console.error(
          '💡 Make sure your LLM provider API key is valid and has sufficient credits.'
        );
      }
      // Re-throw without additional logging to avoid error cascade
      throw error;
    }
  }
}
