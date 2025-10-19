import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  type ValidationResult,
  type BuildResult,
  type ExecutionResult,
  type UsageInfo,
} from '../types';

const execAsync = promisify(exec);

export interface DockerManager {
  validateDockerfile: (dockerfileContent: string) => Promise<ValidationResult>;
  buildImage: (
    dockerfile: string,
    context: string,
    scriptPath: string,
  ) => Promise<BuildResult>;
  runContainer: (imageId: string, args: string[]) => Promise<ExecutionResult>;
  testScript: (imageId: string, usageInfo: UsageInfo) => Promise<boolean>;
  cleanup: (imageId: string) => Promise<void>;
}

export class DockerManagerImpl implements DockerManager {
  private readonly tempDir = '/tmp/claude';

  async validateDockerfile(
    dockerfileContent: string,
  ): Promise<ValidationResult> {
    const tempPath = join(this.tempDir, `Dockerfile.${Date.now()}`);

    try {
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true });

      // Write dockerfile to temp file
      await writeFile(tempPath, dockerfileContent);

      // Use Docker BuildKit --dry-run for accurate syntax validation
      await execAsync(`docker build --dry-run -f ${tempPath} ${this.tempDir}`);

      await unlink(tempPath); // cleanup
      return { isValid: true, errors: [] };
    } catch (error: any) {
      await unlink(tempPath).catch(() => {}); // cleanup on error
      return {
        isValid: false,
        errors: [(error as Error).message ?? 'Dockerfile validation failed'],
      };
    }
  }

  async buildImage(
    dockerfile: string,
    _context: string,
    scriptPath: string,
  ): Promise<BuildResult> {
    const timestamp = Date.now();
    const dockerfilePath = join(this.tempDir, `Dockerfile.${timestamp}`);
    const contextDir = join(this.tempDir, `context.${timestamp}`);
    const imageTag = `script-dockerizer:${timestamp}`;

    try {
      // Ensure directories exist
      await mkdir(contextDir, { recursive: true });

      // Write Dockerfile and copy script to context
      await writeFile(dockerfilePath, dockerfile);
      await execAsync(`cp "${scriptPath}" "${contextDir}/"`);

      console.log('🏗️  Building Docker image...');

      // Build the image
      const buildCommand = `docker build -f ${dockerfilePath} -t ${imageTag} ${contextDir}`;
      const { stdout, stderr } = await execAsync(buildCommand);

      console.log('✅ Docker image built successfully');

      // Cleanup temp files
      await unlink(dockerfilePath).catch(() => {});
      await execAsync(`rm -rf ${contextDir}`).catch(() => {});

      return {
        imageId: imageTag,
        buildLogs: stdout + stderr,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Docker build failed:', error.message);

      // Cleanup on failure
      await unlink(dockerfilePath).catch(() => {});
      await execAsync(`rm -rf ${contextDir}`).catch(() => {});

      return {
        imageId: '',
        buildLogs: error.message,
        success: false,
      };
    }
  }

  async runContainer(
    imageId: string,
    args: string[],
  ): Promise<ExecutionResult> {
    try {
      console.log(`🐳 Running container: ${imageId}`);
      console.log(`   Args: ${args.join(' ')}`);

      const command = `docker run --rm ${imageId} ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command);

      console.log('✅ Container execution completed');

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      console.error('❌ Container execution failed:', error.message);

      return {
        stdout: '',
        stderr: error.message,
        exitCode: error.code ?? 1,
      };
    }
  }

  async cleanup(imageId: string): Promise<void> {
    try {
      await execAsync(`docker rmi ${imageId}`);
      console.log(`🧹 Cleaned up image: ${imageId}`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to cleanup image ${imageId}: ${error.message}`);
    }
  }

  async testScript(imageId: string, usageInfo: UsageInfo): Promise<boolean> {
    try {
      // Run the script with test input
      const result = await this.runContainer(imageId, [
        `"${usageInfo.testInput}"`,
      ]);

      if (result.exitCode !== 0) {
        console.error('❌ Script execution failed');
        return false;
      }

      // Compare output
      const expectedOutput = usageInfo.expectedOutput.trim();
      const actualOutput = result.stdout.trim();

      if (actualOutput === expectedOutput) {
        console.log('✅ Script test passed');
        console.log(`   Expected: ${expectedOutput}`);
        console.log(`   Actual: ${actualOutput}`);
        return true;
      } else {
        console.log('❌ Script test failed');
        console.log(`   Expected: ${expectedOutput}`);
        console.log(`   Actual: ${actualOutput}`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Script testing failed:', error.message);
      return false;
    }
  }
}
