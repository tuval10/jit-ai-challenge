import { StateGraph } from '@langchain/langgraph';
import { type DockerGenerationState } from '../types';
import {
  languageDetectionNode,
  shouldRetryLanguageDetection,
} from '../nodes/language-detection.node';
import { dockerfileGenerationNode } from '../nodes/dockerfile-generation.node';
import { syntaxValidationNode } from '../nodes/syntax-validation.node';
import { dockerfileOptimizationNode } from '../nodes/dockerfile-optimization.node';
import { type SupportedLLM } from '../config/llm-providers';

// Route constants for type safety and consistency
export const ROUTES = {
  LANGUAGE_DETECTION: {
    RETRY: 'retry',
    CONTINUE: 'continue',
    FAIL: 'fail',
  },
  VALIDATION: {
    REGENERATE: 'regenerate',
    OPTIMIZE: 'optimize',
    FINALIZE: 'finalize',
  },
} as const;

// Type for validation routes
type ValidationRoute =
  (typeof ROUTES.VALIDATION)[keyof typeof ROUTES.VALIDATION];

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
      usageInfo: null,
      detectedLanguage: null,
      dockerfile: null,
      validationResult: null,
      buildResult: null,
      optimizationApplied: null,
      languageDetectionRetries: null,
      readmeAnalysisRetries: null,
      dockerfileGenerationRetries: null,
      maxRetries: null,
    };

    const workflow = new StateGraph({ channels } as any)
      .addNode('detect_language', async (state: DockerGenerationState) => {
        return await languageDetectionNode(state, this.llm);
      })
      .addNode('generate_dockerfile', async (state: DockerGenerationState) => {
        return await dockerfileGenerationNode(state, this.llm);
      })
      .addNode('validate_syntax', async (state: DockerGenerationState) => {
        return await syntaxValidationNode(state);
      })
      .addNode('optimize_dockerfile', async (state: DockerGenerationState) => {
        return await dockerfileOptimizationNode(state, this.llm);
      })
      .addNode('handle_failure', async (_state: DockerGenerationState) => {
        console.error('❌ Workflow failed after maximum retries');
        throw new Error('Docker generation failed after maximum retries');
      })
      // Conditional edges with retry logic
      .addConditionalEdges(
        'detect_language',
        (state: unknown) =>
          shouldRetryLanguageDetection(state as DockerGenerationState),
        {
          [ROUTES.LANGUAGE_DETECTION.RETRY]: 'detect_language', // Retry language detection
          [ROUTES.LANGUAGE_DETECTION.CONTINUE]: 'generate_dockerfile', // Success, continue to next step
          [ROUTES.LANGUAGE_DETECTION.FAIL]: 'handle_failure', // Failed after max retries
        }
      )
      .addEdge('generate_dockerfile', 'validate_syntax')
      .addConditionalEdges(
        'validate_syntax',
        (state: unknown) =>
          this.shouldRegenerateOrOptimize(state as DockerGenerationState),
        {
          [ROUTES.VALIDATION.REGENERATE]: 'generate_dockerfile',
          [ROUTES.VALIDATION.OPTIMIZE]: 'optimize_dockerfile',
          [ROUTES.VALIDATION.FINALIZE]: '__end__',
        }
      )
      .addEdge('optimize_dockerfile', 'validate_syntax')
      .addEdge('handle_failure', '__end__')
      .addEdge('__start__', 'detect_language');

    // Compile the workflow
    return workflow.compile();
  }

  private shouldRegenerateOrOptimize(
    state: DockerGenerationState
  ): ValidationRoute {
    const isPostOptimization = state.optimizationApplied;

    if (!state.validationResult?.isValid) {
      if (isPostOptimization) {
        console.log('🔄 Post-optimization validation failed, regenerating...');
      } else {
        console.log('🔄 Dockerfile validation failed, regenerating...');
      }
      return ROUTES.VALIDATION.REGENERATE;
    }

    if (!state.optimizationApplied) {
      console.log(
        '🔄 Dockerfile validated successfully, proceeding to optimization...'
      );
      return ROUTES.VALIDATION.OPTIMIZE;
    }

    console.log(
      '✅ Post-optimization validation passed - Dockerfile generation complete'
    );
    return ROUTES.VALIDATION.FINALIZE;
  }

  async invoke(
    initialState: DockerGenerationState
  ): Promise<DockerGenerationState> {
    try {
      const result = await this.graph.invoke(initialState);
      return result as DockerGenerationState;
    } catch (error: any) {
      if (error.message?.includes('API key')) {
        console.error('❌ Authentication Error:', error.message);
        console.error(
          '💡 Make sure your LLM provider API key is valid and has sufficient credits.'
        );
      } else {
        console.error('❌ Graph execution failed:', error.message);
      }
      throw error;
    }
  }
}
