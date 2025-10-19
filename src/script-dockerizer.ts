import { ScriptAnalyzer, ScriptAnalyzerImpl } from "./core/script-analyzer";
import { DockerManager, DockerManagerImpl } from "./core/docker-manager";
import { DockerGenerationGraph } from "./graphs/docker-generation-graph";
import { SupportedLLM } from "./config/llm-providers";
import { DockerGenerationState, DockerGenerationResult } from "./types";
import { access, constants } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";

const execAsync = promisify(exec);

export class ScriptDockerizer {
  private analyzer: ScriptAnalyzer;
  private dockerManager: DockerManager;
  private graph: DockerGenerationGraph;

  constructor(
    private llm: SupportedLLM,
    analyzer?: ScriptAnalyzer,
    dockerManager?: DockerManager
  ) {
    this.analyzer = analyzer || new ScriptAnalyzerImpl();
    this.dockerManager = dockerManager || new DockerManagerImpl();
    this.graph = new DockerGenerationGraph(llm);
  }

  private async checkDockerRunning(): Promise<void> {
    try {
      await execAsync("docker info");
    } catch (error: any) {
      throw new Error(
        "Docker daemon is not running. Please start Docker Desktop and try again."
      );
    }
  }

  async execute(
    scriptPath: string,
    readmePath: string,
    options: { test?: boolean; cleanup?: boolean } = {}
  ): Promise<DockerGenerationResult> {
    if (!scriptPath) {
      throw new Error("scriptPath is required");
    }
    if (!readmePath) {
      throw new Error("readmePath is required");
    }

    // Resolve paths to absolute paths
    const absoluteScriptPath = resolve(scriptPath);
    const absoluteReadmePath = resolve(readmePath);

    // Check if files exist
    try {
      await access(absoluteScriptPath, constants.F_OK);
    } catch {
      throw new Error(`Script file not found: ${absoluteScriptPath}`);
    }

    try {
      await access(absoluteReadmePath, constants.F_OK);
    } catch {
      throw new Error(`README file not found: ${absoluteReadmePath}`);
    }

    // Check if Docker daemon is running
    await this.checkDockerRunning();

    try {
      console.log(`🚀 Starting Docker generation for: ${absoluteScriptPath}`);

      // Step 1: Analyze script and extract usage info
      const [scriptContent, usageInfo] = await Promise.all([
        this.analyzer.readScriptContent(absoluteScriptPath),
        this.analyzer.extractUsagePattern(absoluteReadmePath, this.llm),
      ]);

      // Step 2: Execute LangGraph workflow
      const initialState: DockerGenerationState = {
        scriptContent,
        scriptPath: absoluteScriptPath,
        usageInfo,
      };

      const result = await this.graph.invoke(initialState);

      if (!result.dockerfile || !result.detectedLanguage) {
        throw new Error("Failed to generate Dockerfile");
      }

      console.log("📄 Generated Dockerfile:");
      console.log("─".repeat(50));
      console.log(result.dockerfile);
      console.log("─".repeat(50));

      // Step 3: Build Docker image
      const buildResult = await this.dockerManager.buildImage(
        result.dockerfile,
        "/tmp/claude",
        absoluteScriptPath
      );

      if (!buildResult.success) {
        throw new Error(`Docker build failed: ${buildResult.buildLogs}`);
      }

      // Step 4: Test the image if requested
      if (options.test) {
        console.log("🧪 Testing Docker image...");
        const testPassed = await this.dockerManager.testScript(
          buildResult.imageId,
          usageInfo
        );

        if (!testPassed) {
          throw new Error("Docker image test failed");
        }
      }

      // Step 5: Cleanup if requested
      if (options.cleanup) {
        await this.dockerManager.cleanup(buildResult.imageId);
      } else {
        console.log(`💾 Docker image created: ${buildResult.imageId}`);
        console.log(
          `   Run with: docker run --rm ${buildResult.imageId} <script> "<input>"`
        );
      }

      return {
        dockerfile: result.dockerfile,
        detectedLanguage: result.detectedLanguage,
        validationResult: result.validationResult,
        buildResult,
        optimizationApplied: result.optimizationApplied,
      };
    } catch (error: any) {
      console.error("❌ Docker generation failed:", error.message);
      throw error;
    }
  }

  // TODO: Fix LangGraph streaming types
  // async streamExecution(
  //   scriptPath: string,
  //   readmePath: string,
  //   options: { test?: boolean; cleanup?: boolean } = {}
  // ): Promise<DockerGenerationResult> {
  //   // Streaming functionality temporarily disabled due to TypeScript issues
  //   return this.execute(scriptPath, readmePath, options);
  // }
}
