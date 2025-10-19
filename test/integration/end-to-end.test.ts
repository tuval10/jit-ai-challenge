import { ScriptDockerizer } from '../../src/script-dockerizer';
import { LLMProviderFactory } from '../../src/config/llm-providers';
import { join } from 'path';

// Mock LLM for integration tests to avoid API calls
const createMockLLM = () => {
  // Use a mock implementation that always returns valid responses
  return {
    invoke: jest.fn().mockImplementation((messages: any) => {
      const prompt = messages[0]?.content || '';

      // Check what type of request this is based on the prompt
      if (prompt.includes('comprehensive analysis of a script')) {
        // Script analysis request - return JSON
        return Promise.resolve({
          content: JSON.stringify({
            language: {
              name: 'python',
              version: '3.9',
              runtime: 'python3',
              baseImage: 'python:3.9-alpine',
              packageManager: 'pip',
              dependencies: [],
            },
            usage: {
              command: "python test-script.py '<input_text>'",
              example: "python test-script.py 'Hello world test'",
              expectedOutput: 'Word Count: 3',
              testInput: 'Hello world test',
            },
          }),
        });
      } else if (prompt.toLowerCase().includes('optimize')) {
        // Optimization request - return Dockerfile
        return Promise.resolve({
          content: `FROM python:3.9-alpine
WORKDIR /app
RUN addgroup -g 1001 -S python && adduser -S python -u 1001
COPY test-script.py .
USER python
CMD ["python3", "test-script.py"]`,
        });
      } else {
        // Dockerfile generation request - return Dockerfile
        return Promise.resolve({
          content: `FROM python:3.9-alpine
WORKDIR /app
COPY test-script.py .
RUN addgroup -g 1001 -S python && adduser -S python -u 1001
USER python
CMD ["python3", "test-script.py"]`,
        });
      }
    }),
  };
};

describe('End-to-End Integration Tests', () => {
  const scriptPath = join(__dirname, '../fixtures/test-script.py');
  const readmePath = join(__dirname, '../fixtures/test-script-readme.md');

  it('should complete full workflow without errors', async () => {
    const mockLLM = createMockLLM();
    const dockerizer = new ScriptDockerizer(mockLLM as any);

    const result = await dockerizer.execute(scriptPath, readmePath, {
      skipTest: true, // Skip testing to avoid Docker operations
      cleanup: false,
    });

    expect(result.dockerfile).toBeDefined();
    expect(result.dockerfile).toContain('FROM python:3.9-alpine');
    expect(result.detectedLanguage).toBeDefined();
    expect(result.detectedLanguage.name).toBe('python');
    expect(result.validationResult?.isValid).toBe(true);
    expect(result.optimizationApplied).toBe(true);
  }, 60000); // 60 second timeout for full workflow

  it('should handle workflow errors gracefully', async () => {
    const failingLLM = {
      invoke: jest.fn().mockRejectedValue(new Error('API Error')),
    };

    const dockerizer = new ScriptDockerizer(failingLLM as any);

    await expect(dockerizer.execute(scriptPath, readmePath)).rejects.toThrow(
      'Script analysis failed after maximum retries'
    );
  });

  it('should handle invalid script path', async () => {
    const mockLLM = createMockLLM();
    const dockerizer = new ScriptDockerizer(mockLLM as any);

    await expect(
      dockerizer.execute('non-existent.py', readmePath)
    ).rejects.toThrow();
  });

  it('should handle invalid README path', async () => {
    const mockLLM = createMockLLM();
    const dockerizer = new ScriptDockerizer(mockLLM as any);

    await expect(
      dockerizer.execute(scriptPath, 'non-existent.md')
    ).rejects.toThrow();
  });
});

describe('LLM Provider Integration', () => {
  it('should create different LLM providers', () => {
    const openai = LLMProviderFactory.create('openai', { apiKey: 'test-key' });
    const anthropic = LLMProviderFactory.create('anthropic', {
      apiKey: 'test-key',
    });
    const google = LLMProviderFactory.create('google', { apiKey: 'test-key' });

    expect(openai).toBeDefined();
    expect(anthropic).toBeDefined();
    expect(google).toBeDefined();

    // Should be different types
    expect(openai.constructor.name).not.toBe(anthropic.constructor.name);
    expect(anthropic.constructor.name).not.toBe(google.constructor.name);
  });
});
