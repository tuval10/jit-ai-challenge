import { syntaxValidationNode } from '../../src/nodes/syntax-validation.node';
import { DockerGenerationState } from '../../src/types';

describe('syntaxValidationNode', () => {
  const createMockState = (dockerfile?: string): DockerGenerationState => ({
    scriptContent: 'print("Hello")',
    scriptPath: 'test.py',
    usageInfo: {
      command: 'python test.py "input"',
      example: 'python test.py "Hello"',
      expectedOutput: 'Hello',
      testInput: 'Hello',
    },
    detectedLanguage: {
      name: 'python',
      runtime: 'python3',
      baseImage: 'python:3.9-alpine',
    },
    dockerfile,
  });

  it('should validate correct Dockerfile syntax', async () => {
    const validDockerfile = `FROM alpine:latest
RUN echo "Hello World"
CMD ["echo", "test"]`;

    const state = createMockState(validDockerfile);
    const result = await syntaxValidationNode(state);

    expect(result.validationResult).toBeDefined();
    expect(result.validationResult!.isValid).toBe(true);
    expect(result.validationResult!.errors).toHaveLength(0);
  }, 30000); // Docker operations can be slow

  it('should reject invalid Dockerfile syntax', async () => {
    const invalidDockerfile = `INVALID_COMMAND something
RUN echo "test"`;

    const state = createMockState(invalidDockerfile);
    const result = await syntaxValidationNode(state);

    expect(result.validationResult).toBeDefined();
    expect(result.validationResult!.isValid).toBe(false);
    expect(result.validationResult!.errors.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle missing Dockerfile', async () => {
    const state = createMockState(); // No dockerfile

    const result = await syntaxValidationNode(state);

    expect(result.validationResult).toBeDefined();
    expect(result.validationResult!.isValid).toBe(false);
    expect(result.validationResult!.errors[0]).toContain(
      'must be generated before validation',
    );
  });

  it('should handle Docker build errors gracefully', async () => {
    const dockerfileWithBuildError = `FROM non-existent-image:latest
RUN invalid-command`;

    const state = createMockState(dockerfileWithBuildError);
    const result = await syntaxValidationNode(state);

    expect(result.validationResult).toBeDefined();
    expect(result.validationResult!.isValid).toBe(false);
    expect(result.validationResult!.errors.length).toBeGreaterThan(0);
  }, 30000);

  it('should validate Dockerfile with multiple instructions', async () => {
    const complexDockerfile = `FROM python:3.9-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`;

    const state = createMockState(complexDockerfile);
    const result = await syntaxValidationNode(state);

    expect(result.validationResult).toBeDefined();
    expect(result.validationResult!.isValid).toBe(true);
  }, 30000);
});
