import {
  type ScriptAnalyzer,
  ScriptAnalyzerImpl,
} from './nodes/script-analyzer';
import { type DockerManager, DockerManagerImpl } from './core/docker-manager';
import { DockerGenerationGraph } from './graphs/docker-generation-graph';
import { type SupportedLLM } from './config/llm-providers';
import {
  type DockerGenerationState,
  type DockerGenerationResult,
} from './types';
import { access, constants } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

export class ScriptDockerizer {
  private readonly analyzer: ScriptAnalyzer;
  private readonly dockerManager: DockerManager;
  private readonly graph: DockerGenerationGraph;

  constructor(
    llm: SupportedLLM,
    analyzer?: ScriptAnalyzer,
    dockerManager?: DockerManager
  ) {
    this.analyzer = analyzer || new ScriptAnalyzerImpl();
    this.dockerManager = dockerManager || new DockerManagerImpl();
    this.graph = new DockerGenerationGraph(llm);
  }

  private async checkDockerRunning(): Promise<void> {
    try {
      await execAsync('docker info');
    } catch (error: any) {
      throw new Error(
        'Docker daemon is not running. Please start Docker Desktop and try again.'
      );
    }
  }

  async execute(
    scriptPath: string,
    readmePath: string,
    options: { skipTest?: boolean; cleanup?: boolean } = {}
  ): Promise<DockerGenerationResult> {
    if (!scriptPath) {
      throw new Error('scriptPath is required');
    }
    if (!readmePath) {
      throw new Error('readmePath is required');
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

      // Step 1: Read script content
      const scriptContent = await this.analyzer.readScriptContent(
        absoluteScriptPath
      );

      // Step 2: Execute LangGraph workflow (analysis happens inside the graph)
      const initialState: DockerGenerationState = {
        scriptContent,
        scriptPath: absoluteScriptPath,
        readmePath: absoluteReadmePath,
      };

      const result = await this.graph.invoke(initialState);

      if (!result.dockerfile || !result.detectedLanguage || !result.usageInfo) {
        throw new Error(
          'Failed to generate Dockerfile or complete script analysis'
        );
      }

      console.log('📄 Generated Dockerfile:');
      console.log('─'.repeat(50));
      console.log(result.dockerfile);
      console.log('─'.repeat(50));

      // Step 3: Build Docker image
      const buildResult = await this.dockerManager.buildImage(
        result.dockerfile,
        '/tmp/claude',
        absoluteScriptPath
      );

      if (!buildResult.success) {
        throw new Error(`Docker build failed: ${buildResult.buildLogs}`);
      }

      // Step 4: Test the image (unless skipped)
      if (!options.skipTest) {
        if (!result.usageInfo) {
          throw new Error('Usage information not available for testing');
        }
        console.log('🧪 Testing Docker image...');
        const testPassed = await this.dockerManager.testScript(
          buildResult.imageId,
          result.usageInfo
        );

        if (!testPassed) {
          throw new Error('Docker image test failed');
        }
      } else {
        console.log('⏭️  Skipping tests...');
      }

      // Step 5: Cleanup if requested
      if (options.cleanup) {
        await this.dockerManager.cleanup(buildResult.imageId);
      } else {
        console.log(`💾 Docker image created: ${buildResult.imageId}`);
        console.log(
          `   Run with: docker run --rm ${buildResult.imageId} "<input>"`
        );
      }

      return {
        dockerfile: result.dockerfile,
        detectedLanguage: result.detectedLanguage,
        usageInfo: result.usageInfo,
        validationResult: result.validationResult,
        buildResult,
        optimizationApplied: result.optimizationApplied,
      };
    } catch (error: any) {
      // Error already logged by graph workflow, just re-throw
      throw error;
    }
  }
}
