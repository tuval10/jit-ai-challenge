import { ScriptAnalyzerImpl } from '../../src/core/script-analyzer';
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

  describe('extractUsagePattern', () => {
    it('should extract usage information from README using LLM', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: "python test-script.py '<input_text>'",
            example: "python test-script.py 'Hello world test'",
            expectedOutput: 'Word Count: 3',
            testInput: 'Hello world test',
          }),
        }),
      } as any;

      const readmePath = join(__dirname, '../fixtures/test-script-readme.md');
      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM);

      expect(usageInfo.command).toBe("python test-script.py '<input_text>'");
      expect(usageInfo.example).toBe(
        "python test-script.py 'Hello world test'"
      );
      expect(usageInfo.expectedOutput).toBe('Word Count: 3');
    });

    it('should handle LLM API errors gracefully', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('API Error')),
      } as any;

      const readmePath = join(__dirname, '../fixtures/test-script-readme.md');

      await expect(
        analyzer.extractUsagePattern(readmePath, mockLLM)
      ).rejects.toThrow('Failed to extract usage pattern');
    });

    it('should throw error for non-existent README', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('File not found')),
      } as any;

      await expect(
        analyzer.extractUsagePattern('non-existent.md', mockLLM)
      ).rejects.toThrow('Failed to extract usage pattern');
    });
  });
});
