import { StateGraph } from "@langchain/langgraph";
import { DockerGenerationState } from "../types";
import {
  languageDetectionNode,
  shouldRetryLanguageDetection,
} from "../nodes/language-detection.node";
import { dockerfileGenerationNode } from "../nodes/dockerfile-generation.node";
import { syntaxValidationNode } from "../nodes/syntax-validation.node";
import { dockerfileOptimizationNode } from "../nodes/dockerfile-optimization.node";

// Using any type for older LangGraph version compatibility

export class DockerGenerationGraph {
  private graph: any;

  constructor(private llm: any) {
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
      .addNode("detect_language", async (state: DockerGenerationState) => {
        return await languageDetectionNode(state, this.llm);
      })
      .addNode("generate_dockerfile", async (state: DockerGenerationState) => {
        return await dockerfileGenerationNode(state, this.llm);
      })
      .addNode("validate_syntax", async (state: DockerGenerationState) => {
        return await syntaxValidationNode(state);
      })
      .addNode("optimize_dockerfile", async (state: DockerGenerationState) => {
        return await dockerfileOptimizationNode(state, this.llm);
      })
      .addNode("handle_failure", async (_state: DockerGenerationState) => {
        console.error("❌ Workflow failed after maximum retries");
        throw new Error("Docker generation failed after maximum retries");
      })
      // Conditional edges with retry logic
      .addConditionalEdges(
        "detect_language",
        (state: any) => shouldRetryLanguageDetection(state),
        {
          retry: "detect_language", // Retry language detection
          continue: "generate_dockerfile", // Success, continue to next step
          fail: "handle_failure", // Failed after max retries
        }
      )
      .addEdge("generate_dockerfile", "validate_syntax")
      .addConditionalEdges(
        "validate_syntax",
        (state: any) => this.shouldRegenerateOrOptimize(state),
        {
          regenerate: "generate_dockerfile",
          optimize: "optimize_dockerfile",
          finalize: "__end__",
        }
      )
      .addEdge("optimize_dockerfile", "__end__")
      .addEdge("handle_failure", "__end__")
      .setEntryPoint("detect_language");

    // Compile the workflow
    return workflow.compile();
  }

  private shouldRegenerateOrOptimize(state: DockerGenerationState): string {
    if (!state.validationResult?.isValid) {
      console.log("🔄 Dockerfile validation failed, regenerating...");
      return "regenerate";
    }

    if (!state.optimizationApplied) {
      console.log("🔄 Proceeding to optimization...");
      return "optimize";
    }

    console.log("✅ Dockerfile generation complete");
    return "finalize";
  }

  async invoke(
    initialState: DockerGenerationState
  ): Promise<DockerGenerationState> {
    try {
      const result = await this.graph.invoke(initialState);
      return result as DockerGenerationState;
    } catch (error: any) {
      // Provide more detailed error messages for common LangGraph issues
      if (error.message?.includes("dead-end")) {
        console.error(
          "❌ LangGraph Error: A node in the workflow has no outgoing edges."
        );
        console.error(
          "💡 This usually means a node needs an edge to '__end__' or another node."
        );
      } else if (
        error.message?.includes("node") &&
        error.message?.includes("not found")
      ) {
        console.error(
          "❌ LangGraph Error: Referenced a node that doesn't exist in the graph."
        );
        console.error(
          "💡 Check that all conditional edge targets are defined as nodes."
        );
      } else if (error.message?.includes("API key")) {
        console.error("❌ Authentication Error:", error.message);
        console.error(
          "💡 Make sure your LLM provider API key is valid and has sufficient credits."
        );
      } else {
        console.error("❌ Graph execution failed:", error.message);
      }
      throw error;
    }
  }

  async stream(
    initialState: DockerGenerationState
  ): Promise<AsyncIterable<any>> {
    try {
      return this.graph.stream(initialState);
    } catch (error: any) {
      console.error("Graph streaming failed:", error.message);
      throw error;
    }
  }
}
