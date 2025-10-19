import { ScriptAnalyzerImpl } from '../../src/core/script-analyzer'
import { join } from 'path'

describe('Example Scripts Integration Tests', () => {
  let analyzer: ScriptAnalyzerImpl

  beforeEach(() => {
    analyzer = new ScriptAnalyzerImpl()
  })

  describe('Line Counter (Bash)', () => {
    const scriptPath = join(__dirname, '../fixtures/line_counter.sh')
    const readmePath = join(__dirname, '../fixtures/README_line_counter.md')

    it('should read line counter script correctly', async () => {
      const content = await analyzer.readScriptContent(scriptPath)

      expect(content).toContain('#!/bin/bash')
      expect(content).toContain('count_lines()')
      expect(content).toContain('wc -l')
      expect(content).toContain('Line Count:')
    })

    it('should extract usage pattern from line counter README', async () => {
      const usageInfo = await analyzer.extractUsagePattern(readmePath)

      expect(usageInfo.command).toContain('./line_counter.sh')
      expect(usageInfo.command).toContain('<input_text>')
      expect(usageInfo.example).toContain('./line_counter.sh')
      expect(usageInfo.example).toContain('Hello world')
      expect(usageInfo.expectedOutput).toContain('Line Count: 2')
    })

    it('should extract usage pattern with LLM', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: "./line_counter.sh '<input_text>'",
            example: "./line_counter.sh 'Hello world\\nThis is a test.'",
            expectedOutput: "Line Count: 2"
          })
        })
      }

      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      expect(usageInfo.command).toBe("./line_counter.sh '<input_text>'")
      expect(usageInfo.example).toContain('Hello world')
      expect(usageInfo.expectedOutput).toBe('Line Count: 2')
    })
  })

  describe('Vowel Counter (Node.js)', () => {
    const scriptPath = join(__dirname, '../fixtures/vowel_counter.js')
    const readmePath = join(__dirname, '../fixtures/README_vowel_counter.md')

    it('should read vowel counter script correctly', async () => {
      const content = await analyzer.readScriptContent(scriptPath)

      expect(content).toContain('countVowels')
      expect(content).toContain('aeiouAEIOU')
      expect(content).toContain('process.argv')
      expect(content).toContain('Vowel Count:')
    })

    it('should extract usage pattern from vowel counter README', async () => {
      const usageInfo = await analyzer.extractUsagePattern(readmePath)

      expect(usageInfo.command).toContain('node vowel_counter.js')
      expect(usageInfo.command).toContain('<input_text>')
      expect(usageInfo.example).toContain('node vowel_counter.js')
      expect(usageInfo.example).toContain('Hello world')
      expect(usageInfo.expectedOutput).toContain('Vowel Count: 3')
    })

    it('should handle LLM analysis for Node.js script', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: "node vowel_counter.js '<input_text>'",
            example: "node vowel_counter.js 'Hello world'",
            expectedOutput: "Vowel Count: 3"
          })
        })
      }

      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      expect(usageInfo.command).toBe("node vowel_counter.js '<input_text>'")
      expect(usageInfo.example).toBe("node vowel_counter.js 'Hello world'")
      expect(usageInfo.expectedOutput).toBe('Vowel Count: 3')
    })
  })

  describe('Word Reverser (Python)', () => {
    const scriptPath = join(__dirname, '../fixtures/word_reverser.py')
    const readmePath = join(__dirname, '../fixtures/README_word_reverser.md')

    it('should read word reverser script correctly', async () => {
      const content = await analyzer.readScriptContent(scriptPath)

      expect(content).toContain('import sys')
      expect(content).toContain('reverse_words')
      expect(content).toContain('reversed(')
      expect(content).toContain('split()')
    })

    it('should extract usage pattern from word reverser README', async () => {
      const usageInfo = await analyzer.extractUsagePattern(readmePath)

      expect(usageInfo.command).toContain('python word_reverser.py')
      expect(usageInfo.command).toContain('<input_text>')
      expect(usageInfo.example).toContain('python word_reverser.py')
      expect(usageInfo.example).toContain('Hello world')
      expect(usageInfo.expectedOutput).toContain('world Hello')
    })

    it('should handle LLM analysis for Python script', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: "python word_reverser.py '<input_text>'",
            example: "python word_reverser.py 'Hello world'",
            expectedOutput: "world Hello"
          })
        })
      }

      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      expect(usageInfo.command).toBe("python word_reverser.py '<input_text>'")
      expect(usageInfo.example).toBe("python word_reverser.py 'Hello world'")
      expect(usageInfo.expectedOutput).toBe('world Hello')
    })
  })

  describe('Cross-script Validation', () => {
    it('should handle all three script types consistently', async () => {
      const scripts = [
        {
          name: 'line_counter',
          scriptPath: join(__dirname, '../fixtures/line_counter.sh'),
          readmePath: join(__dirname, '../fixtures/README_line_counter.md'),
          expectedLanguage: 'bash'
        },
        {
          name: 'vowel_counter',
          scriptPath: join(__dirname, '../fixtures/vowel_counter.js'),
          readmePath: join(__dirname, '../fixtures/README_vowel_counter.md'),
          expectedLanguage: 'nodejs'
        },
        {
          name: 'word_reverser',
          scriptPath: join(__dirname, '../fixtures/word_reverser.py'),
          readmePath: join(__dirname, '../fixtures/README_word_reverser.md'),
          expectedLanguage: 'python'
        }
      ]

      for (const script of scripts) {
        const scriptContent = await analyzer.readScriptContent(script.scriptPath)
        const usageInfo = await analyzer.extractUsagePattern(script.readmePath)

        // All scripts should have content
        expect(scriptContent.length).toBeGreaterThan(0)

        // All READMEs should provide complete usage info
        expect(usageInfo.command).toBeTruthy()
        expect(usageInfo.example).toBeTruthy()
        expect(usageInfo.expectedOutput).toBeTruthy()

        // Commands should contain script name
        expect(usageInfo.command.toLowerCase()).toContain(script.name)

        console.log(`✅ ${script.name}: Command=${usageInfo.command}, Output=${usageInfo.expectedOutput}`)
      }
    })

    it('should handle LLM validation for all script types', async () => {
      const mockLLMResponses: Record<string, { command: string; example: string; expectedOutput: string }> = {
        line_counter: {
          command: "./line_counter.sh '<input_text>'",
          example: "./line_counter.sh 'Hello world\\nThis is a test.'",
          expectedOutput: "Line Count: 2"
        },
        vowel_counter: {
          command: "node vowel_counter.js '<input_text>'",
          example: "node vowel_counter.js 'Hello world'",
          expectedOutput: "Vowel Count: 3"
        },
        word_reverser: {
          command: "python word_reverser.py '<input_text>'",
          example: "python word_reverser.py 'Hello world'",
          expectedOutput: "world Hello"
        }
      }

      const scripts = Object.keys(mockLLMResponses)

      for (const scriptName of scripts) {
        const mockLLM = {
          invoke: jest.fn().mockResolvedValue({
            content: JSON.stringify(mockLLMResponses[scriptName])
          })
        }

        const readmePath = join(__dirname, `../fixtures/README_${scriptName}.md`)
        const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

        // Verify LLM was called
        expect(mockLLM.invoke).toHaveBeenCalled()

        // Verify response structure
        expect(usageInfo.command).toBe(mockLLMResponses[scriptName].command)
        expect(usageInfo.expectedOutput).toBe(mockLLMResponses[scriptName].expectedOutput)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent script files gracefully', async () => {
      await expect(analyzer.readScriptContent('non-existent.py'))
        .rejects.toThrow('Failed to read script file')
    })

    it('should handle non-existent README files gracefully', async () => {
      await expect(analyzer.extractUsagePattern('non-existent-readme.md'))
        .rejects.toThrow('Failed to extract usage pattern')
    })

    it('should fallback to regex when LLM fails', async () => {
      const failingLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM API Error'))
      }

      const readmePath = join(__dirname, '../fixtures/README_line_counter.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath, failingLLM)

      // Should still return valid usage info using regex fallback
      expect(usageInfo.command).toBeTruthy()
      expect(usageInfo.example).toBeTruthy()
      expect(usageInfo.expectedOutput).toBeTruthy()
    })

    it('should handle invalid LLM JSON responses', async () => {
      const invalidLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: 'This is not valid JSON at all'
        })
      }

      const readmePath = join(__dirname, '../fixtures/README_vowel_counter.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath, invalidLLM)

      // Should fallback to regex parsing
      expect(usageInfo.command).toBeTruthy()
      expect(usageInfo.example).toBeTruthy()
      expect(usageInfo.expectedOutput).toBeTruthy()
    })
  })
})