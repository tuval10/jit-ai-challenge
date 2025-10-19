import { ScriptAnalyzerImpl } from '../../src/nodes/script-analyzer/script-analyzer';
import { join } from 'path';

describe('ScriptAnalyzer', () => {
  let analyzer: ScriptAnalyzerImpl;

  beforeEach(() => {
    analyzer = new ScriptAnalyzerImpl();
  });

  describe('readScriptContent', () => {
    it('should read script file content', async () => {
      const scriptPath = join(__dirname, '../fixtures/test-script.py');
      const content = await analyzer.readScriptContent(scriptPath);

      expect(content).toContain('def count_words(text):');
      expect(content).toContain('import sys');
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        analyzer.readScriptContent('non-existent.py')
      ).rejects.toThrow('Failed to read script file');
    });
  });

  describe('analyzeScript', () => {
    it('should analyze script and extract both language and usage info', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
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
        }),
      } as any;

      const scriptPath = join(__dirname, '../fixtures/test-script.py');
      const readmePath = join(__dirname, '../fixtures/test-script-readme.md');
      const result = await analyzer.analyzeScript(
        scriptPath,
        readmePath,
        mockLLM
      );

      expect(result.language.name).toBe('python');
      expect(result.language.runtime).toBe('python3');
      expect(result.usage.command).toBe("python test-script.py '<input_text>'");
      expect(result.usage.example).toBe(
        "python test-script.py 'Hello world test'"
      );
      expect(result.usage.expectedOutput).toBe('Word Count: 3');
    });

    it('should handle LLM API errors gracefully', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('API Error')),
      } as any;

      const scriptPath = join(__dirname, '../fixtures/test-script.py');
      const readmePath = join(__dirname, '../fixtures/test-script-readme.md');

      await expect(
        analyzer.analyzeScript(scriptPath, readmePath, mockLLM)
      ).rejects.toThrow('Failed to analyze script');
    });

    it('should throw error for non-existent files', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('File not found')),
      } as any;

      await expect(
        analyzer.analyzeScript('non-existent.py', 'non-existent.md', mockLLM)
      ).rejects.toThrow('Failed to analyze script');
    });
  });
});
