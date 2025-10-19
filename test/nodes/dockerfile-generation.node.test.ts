import { dockerfileGenerationNode } from '../../src/nodes/dockerfile-generation.node';
import { DockerGenerationState } from '../../src/types';

const createMockLLM = (response: string) =>
  ({
    invoke: jest.fn().mockResolvedValue({ content: response }),
  } as any);

describe('dockerfileGenerationNode', () => {
  const mockState: DockerGenerationState = {
    scriptContent: 'print("Hello World")',
    scriptPath: 'test.py',
    usageInfo: {
      command: 'python test.py "input"',
      example: 'python test.py "Hello"',
      expectedOutput: 'Hello',
      testInput: 'Hello',
    },
    detectedLanguage: {
      name: 'python',
      version: '3.9',
      runtime: 'python3',
      baseImage: 'python:3.9-alpine',
      packageManager: 'pip',
      dependencies: [],
    },
  };

  it('should generate valid Dockerfile', async () => {
    const mockDockerfile = `FROM python:3.9-alpine
WORKDIR /app
COPY test.py .
CMD ["python3", "test.py"]`;

    const mockLLM = createMockLLM(mockDockerfile);
    const result = await dockerfileGenerationNode(mockState, mockLLM);

    expect(result.dockerfile).toBeDefined();
    expect(result.dockerfile).toContain('FROM python:3.9-alpine');
    expect(result.dockerfile).toContain('COPY test.py');
  });

  it('should handle Dockerfile wrapped in markdown', async () => {
    const mockResponse = `\`\`\`dockerfile
FROM python:3.9-alpine
WORKDIR /app
COPY test.py .
CMD ["python3", "test.py"]
\`\`\``;

    const mockLLM = createMockLLM(mockResponse);
    const result = await dockerfileGenerationNode(mockState, mockLLM);

    expect(result.dockerfile).toBeDefined();
    expect(result.dockerfile).toContain('FROM python:3.9-alpine');
    expect(result.dockerfile).not.toContain('```');
  });

  it('should handle markdown without language specifier', async () => {
    const mockResponse = `\`\`\`
FROM alpine:latest
RUN apk add --no-cache python3
COPY test.py .
CMD ["python3", "test.py"]
\`\`\``;

    const mockLLM = createMockLLM(mockResponse);
    const result = await dockerfileGenerationNode(mockState, mockLLM);

    expect(result.dockerfile).toBeDefined();
    expect(result.dockerfile).toContain('FROM alpine:latest');
    expect(result.dockerfile).not.toContain('```');
  });

  it('should return retry state when language detection missing', async () => {
    const stateWithoutLanguage = { ...mockState };
    delete stateWithoutLanguage.detectedLanguage;

    const mockLLM = createMockLLM('FROM alpine:latest');

    const result = await dockerfileGenerationNode(
      stateWithoutLanguage,
      mockLLM
    );

    expect(result.dockerfile).toBeUndefined();
    expect(result.dockerfileGenerationRetries).toBe(1);
  });

  it('should return retry state for invalid Dockerfile (no FROM)', async () => {
    const mockLLM = createMockLLM('RUN echo "invalid dockerfile"');

    const result = await dockerfileGenerationNode(mockState, mockLLM);

    expect(result.dockerfile).toBeUndefined();
    expect(result.dockerfileGenerationRetries).toBe(1);
  });

  it('should return retry state on LLM API errors', async () => {
    const mockLLM = {
      invoke: jest.fn().mockRejectedValue(new Error('API Error')),
    } as any;

    const result = await dockerfileGenerationNode(mockState, mockLLM);

    expect(result.dockerfile).toBeUndefined();
    expect(result.dockerfileGenerationRetries).toBe(1);
  });
});
