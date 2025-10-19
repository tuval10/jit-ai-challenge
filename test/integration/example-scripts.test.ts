import { ScriptAnalyzerImpl } from '../../src/core/script-analyzer';
import { join } from 'path';

describe('Example Scripts Integration Tests', () => {
  let analyzer: ScriptAnalyzerImpl;

  beforeEach(() => {
    analyzer = new ScriptAnalyzerImpl();
  });

  describe('All Example Scripts', () => {
    const testScripts = [
      {
        name: 'line_counter',
        language: 'Bash',
        scriptPath: join(__dirname, '../fixtures/line_counter.sh'),
        readmePath: join(__dirname, '../fixtures/README_line_counter.md'),
        contentChecks: ['#!/bin/bash', 'count_lines()', 'wc -l', 'Line Count:'],
        mockResponse: {
          command: "./line_counter.sh '<input_text>'",
          example: "./line_counter.sh 'Hello world\\nThis is a test.'",
          expectedOutput: 'Line Count: 2',
          testInput: 'Hello world\\nThis is a test.',
        },
      },
      {
        name: 'vowel_counter',
        language: 'Node.js',
        scriptPath: join(__dirname, '../fixtures/vowel_counter.js'),
        readmePath: join(__dirname, '../fixtures/README_vowel_counter.md'),
        contentChecks: [
          'countVowels',
          'aeiouAEIOU',
          'process.argv',
          'Vowel Count:',
        ],
        mockResponse: {
          command: "node vowel_counter.js '<input_text>'",
          example: "node vowel_counter.js 'Hello world'",
          expectedOutput: 'Vowel Count: 3',
          testInput: 'Hello world',
        },
      },
      {
        name: 'word_reverser',
        language: 'Python',
        scriptPath: join(__dirname, '../fixtures/word_reverser.py'),
        readmePath: join(__dirname, '../fixtures/README_word_reverser.md'),
        contentChecks: ['import sys', 'reverse_words', 'reversed(', 'split()'],
        mockResponse: {
          command: "python word_reverser.py '<input_text>'",
          example: "python word_reverser.py 'Hello world'",
          expectedOutput: 'world Hello',
          testInput: 'Hello world',
        },
      },
    ];

    it('should read all example scripts correctly', async () => {
      for (const script of testScripts) {
        const content = await analyzer.readScriptContent(script.scriptPath);

        // Verify all expected content is present
        script.contentChecks.forEach((check) => {
          expect(content).toContain(check);
        });
      }
    });

    it('should extract usage patterns with LLM for all script types', async () => {
      for (const script of testScripts) {
        const mockLLM = {
          invoke: jest.fn().mockResolvedValue({
            content: JSON.stringify(script.mockResponse),
          }),
        } as any;

        const usageInfo = await analyzer.extractUsagePattern(
          script.readmePath,
          mockLLM
        );

        // Verify LLM was called
        expect(mockLLM.invoke).toHaveBeenCalled();

        // Verify response matches expected
        expect(usageInfo.command).toBe(script.mockResponse.command);
        expect(usageInfo.expectedOutput).toBe(
          script.mockResponse.expectedOutput
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent script files gracefully', async () => {
      await expect(
        analyzer.readScriptContent('non-existent.py')
      ).rejects.toThrow('Failed to read script file');
    });

    it('should handle non-existent README files gracefully', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('File not found')),
      } as any;

      await expect(
        analyzer.extractUsagePattern('non-existent-readme.md', mockLLM)
      ).rejects.toThrow('Failed to extract usage pattern');
    });

    it('should handle LLM failures', async () => {
      const failingLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM API Error')),
      } as any;

      const readmePath = join(__dirname, '../fixtures/README_line_counter.md');

      await expect(
        analyzer.extractUsagePattern(readmePath, failingLLM)
      ).rejects.toThrow('Failed to extract usage pattern');
    });
  });
});
