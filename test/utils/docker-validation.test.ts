import { validateDockerfileSyntax } from '../../src/utils/docker-validation';

describe('docker-validation utils', () => {
  describe('validateDockerfileSyntax', () => {
    it('should validate correct Dockerfile syntax', async () => {
      const validDockerfile = `FROM alpine:latest
RUN echo "Hello World"
CMD ["echo", "test"]`;

      const result = await validateDockerfileSyntax(validDockerfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }, 30000); // Docker operations can be slow

    it('should reject invalid Dockerfile syntax', async () => {
      const invalidDockerfile = `INVALID_COMMAND something
RUN echo "test"`;

      const result = await validateDockerfileSyntax(invalidDockerfile);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 30000);

    it('should validate Dockerfile with multiple instructions', async () => {
      const complexDockerfile = `FROM python:3.9-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`;

      const result = await validateDockerfileSyntax(complexDockerfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }, 30000);

    it('should handle Docker build errors gracefully', async () => {
      const dockerfileWithBuildError = `FROM non-existent-image:latest
RUN invalid-command`;

      const result = await validateDockerfileSyntax(dockerfileWithBuildError);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 30000);
  });
});
