import {
  languageDetectionNode,
  shouldRetryLanguageDetection,
} from '../../src/nodes/language-detection.node';
import { DockerGenerationState } from '../../src/types';
import { join } from 'path';
import { readFileSync } from 'fs';

describe('Language Detection Node - Full Integration', () => {
  const mockUsageInfo = {
    command: 'test command',
    example: 'test example',
    expectedOutput: 'test output',
    testInput: 'test input',
  };

  describe('Real Script Analysis', () => {
    it('should detect Bash language from line_counter.sh', async () => {
      const scriptContent = readFileSync(
        join(__dirname, '../fixtures/line_counter.sh'),
        'utf8'
      );

      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            name: 'bash',
            runtime: 'bash',
            baseImage: 'alpine:latest',
            dependencies: [],
          }),
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent,
        scriptPath: 'line_counter.sh',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.name).toBe('bash');
      expect(result.detectedLanguage!.runtime).toBe('bash');
      expect(result.detectedLanguage!.baseImage).toBe('alpine:latest');
    });

    it('should detect Node.js language from vowel_counter.js', async () => {
      const scriptContent = readFileSync(
        join(__dirname, '../fixtures/vowel_counter.js'),
        'utf8'
      );

      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            name: 'nodejs',
            version: '18',
            runtime: 'node',
            baseImage: 'node:18-alpine',
            packageManager: 'npm',
            dependencies: [],
          }),
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent,
        scriptPath: 'vowel_counter.js',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.name).toBe('nodejs');
      expect(result.detectedLanguage!.runtime).toBe('node');
      expect(result.detectedLanguage!.baseImage).toBe('node:18-alpine');
      expect(result.detectedLanguage!.packageManager).toBe('npm');
    });

    it('should detect Python language from word_reverser.py', async () => {
      const scriptContent = readFileSync(
        join(__dirname, '../fixtures/word_reverser.py'),
        'utf8'
      );

      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            name: 'python',
            version: '3.9',
            runtime: 'python3',
            baseImage: 'python:3.9-alpine',
            packageManager: 'pip',
            dependencies: [],
          }),
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent,
        scriptPath: 'word_reverser.py',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.name).toBe('python');
      expect(result.detectedLanguage!.runtime).toBe('python3');
      expect(result.detectedLanguage!.baseImage).toBe('python:3.9-alpine');
    });
  });

  describe('Retry Logic with Zod Validation', () => {
    it('should retry on missing required fields', async () => {
      const mockLLM = {
        invoke: jest
          .fn()
          .mockResolvedValueOnce({
            // First call - missing required fields
            content: JSON.stringify({
              name: 'python',
              // Missing runtime and baseImage
            }),
          })
          .mockResolvedValueOnce({
            // Second call - complete response
            content: JSON.stringify({
              name: 'python',
              runtime: 'python3',
              baseImage: 'python:3.9-alpine',
            }),
          }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent: 'print("hello")',
        scriptPath: 'test.py',
        usageInfo: mockUsageInfo,
      };

      // First call should fail validation and return retry state
      const result1 = await languageDetectionNode(state, mockLLM);
      expect(result1.detectedLanguage).toBeUndefined();
      expect(result1.languageDetectionRetries).toBe(1);

      // Should indicate retry is needed
      const retryDecision = shouldRetryLanguageDetection({
        ...state,
        languageDetectionRetries: 1,
      });
      expect(retryDecision).toBe('retry');

      // Second call should succeed
      const retryState = { ...state, languageDetectionRetries: 1 };
      const result2 = await languageDetectionNode(retryState, mockLLM);
      expect(result2.detectedLanguage).toBeDefined();
      expect(result2.detectedLanguage!.name).toBe('python');
    });

    it('should fail after maximum retries', async () => {
      const state: DockerGenerationState = {
        scriptContent: 'invalid script',
        scriptPath: 'invalid.txt',
        usageInfo: mockUsageInfo,
        languageDetectionRetries: 3, // Already at max
        maxRetries: 3,
      };

      const retryDecision = shouldRetryLanguageDetection(state);
      expect(retryDecision).toBe('fail');
    });

    it('should continue on successful detection', async () => {
      const state: DockerGenerationState = {
        scriptContent: 'test',
        scriptPath: 'test.py',
        usageInfo: mockUsageInfo,
        detectedLanguage: {
          name: 'python',
          runtime: 'python3',
          baseImage: 'python:3.9-alpine',
        },
      };

      const decision = shouldRetryLanguageDetection(state);
      expect(decision).toBe('continue');
    });
  });

  describe('Edge Cases', () => {
    it('should handle markdown-wrapped JSON response', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: `Here's the analysis:
\`\`\`json
{
  "name": "ruby",
  "runtime": "ruby",
  "baseImage": "ruby:3.0-alpine"
}
\`\`\``,
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent: 'puts "Hello World"',
        scriptPath: 'test.rb',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.name).toBe('ruby');
      expect(result.detectedLanguage!.runtime).toBe('ruby');
    });

    it('should handle LLM with extra text around JSON', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: `Based on my analysis, here's the result:

{
  "name": "go",
  "runtime": "go",
  "baseImage": "golang:1.20-alpine"
}

This is a Go script based on the package and func syntax.`,
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent: 'package main\nfunc main() {}',
        scriptPath: 'test.go',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.name).toBe('go');
      expect(result.detectedLanguage!.runtime).toBe('go');
    });

    it('should validate optional fields correctly', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            name: 'rust',
            runtime: 'cargo',
            baseImage: 'rust:1.70-alpine',
            packageManager: 'cargo',
            dependencies: ['serde', 'tokio'],
          }),
        }),
      } as any;

      const state: DockerGenerationState = {
        scriptContent: 'fn main() { println!("Hello"); }',
        scriptPath: 'test.rs',
        usageInfo: mockUsageInfo,
      };

      const result = await languageDetectionNode(state, mockLLM);

      expect(result.detectedLanguage).toBeDefined();
      expect(result.detectedLanguage!.packageManager).toBe('cargo');
      expect(result.detectedLanguage!.dependencies).toEqual(['serde', 'tokio']);
    });
  });
});
