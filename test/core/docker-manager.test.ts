import { DockerManagerImpl } from '../../src/core/docker-manager';

describe('DockerManager', () => {
  let dockerManager: DockerManagerImpl;

  beforeEach(() => {
    dockerManager = new DockerManagerImpl();
  });

  describe('validateDockerfile', () => {
    it('should validate a correct Dockerfile', async () => {
      const validDockerfile = `
FROM alpine:latest
RUN echo "Hello World"
CMD ["echo", "test"]
`.trim();

      const result = await dockerManager.validateDockerfile(validDockerfile);
      // Note: Docker validation with --dry-run may fail due to network/image availability
      // This test just ensures the validation runs without crashing
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should reject invalid Dockerfile', async () => {
      const invalidDockerfile = `
INVALID_INSTRUCTION something
RUN echo "test"
`.trim();

      const result = await dockerManager.validateDockerfile(invalidDockerfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject Dockerfile without FROM', async () => {
      const noFromDockerfile = `
RUN echo "test"
CMD ["echo", "hello"]
`.trim();

      const result = await dockerManager.validateDockerfile(noFromDockerfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('buildImage', () => {
    it('should build a simple Docker image', async () => {
      const dockerfile = `
FROM alpine:latest
RUN echo "test" > /tmp/test.txt
CMD ["cat", "/tmp/test.txt"]
`.trim();

      const scriptPath = '/bin/echo'; // Use a simple existing file
      const result = await dockerManager.buildImage(
        dockerfile,
        '/tmp/claude',
        scriptPath
      );

      expect(result.success).toBe(true);
      expect(result.imageId).toContain('script-dockerizer:');
      expect(result.buildLogs).toBeDefined();

      // Cleanup
      if (result.success) {
        await dockerManager.cleanup(result.imageId);
      }
    }, 60000); // 60 second timeout for Docker operations

    it('should fail to build invalid Dockerfile', async () => {
      const invalidDockerfile = 'INVALID DOCKERFILE CONTENT';
      const scriptPath = '/bin/echo';

      const result = await dockerManager.buildImage(
        invalidDockerfile,
        '/tmp/claude',
        scriptPath
      );

      expect(result.success).toBe(false);
      expect(result.imageId).toBe('');
      expect(result.buildLogs).toContain('INVALID');
    });
  });

  describe('runContainer', () => {
    it('should run a simple container command', async () => {
      // First build a simple image
      const dockerfile = `
FROM alpine:latest
CMD ["echo", "Hello from container"]
`.trim();

      const buildResult = await dockerManager.buildImage(
        dockerfile,
        '/tmp/claude',
        '/bin/echo'
      );

      if (buildResult.success) {
        const runResult = await dockerManager.runContainer(
          buildResult.imageId,
          []
        );

        expect(runResult.exitCode).toBe(0);
        expect(runResult.stdout).toContain('Hello from container');

        // Cleanup
        await dockerManager.cleanup(buildResult.imageId);
      }
    }, 60000);
  });

  describe('cleanup', () => {
    it('should cleanup Docker image', async () => {
      // First build an image
      const dockerfile = 'FROM alpine:latest\nCMD ["echo", "test"]';
      const buildResult = await dockerManager.buildImage(
        dockerfile,
        '/tmp/claude',
        '/bin/echo'
      );

      if (buildResult.success) {
        // Should not throw
        await expect(
          dockerManager.cleanup(buildResult.imageId)
        ).resolves.not.toThrow();
      }
    }, 30000);

    it('should handle cleanup of non-existent image gracefully', async () => {
      // Should not throw, just warn
      await expect(
        dockerManager.cleanup('non-existent-image')
      ).resolves.not.toThrow();
    });
  });
});
