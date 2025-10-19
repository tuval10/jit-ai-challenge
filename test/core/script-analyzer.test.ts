import { ScriptAnalyzerImpl } from '../../src/core/script-analyzer'
import { join } from 'path'

describe('ScriptAnalyzer', () => {
  let analyzer: ScriptAnalyzerImpl

  beforeEach(() => {
    analyzer = new ScriptAnalyzerImpl()
  })

  describe('readScriptContent', () => {
    it('should read script file content', async () => {
      const scriptPath = join(__dirname, '../fixtures/test-script.py')
      const content = await analyzer.readScriptContent(scriptPath)

      expect(content).toContain('def count_words(text):')
      expect(content).toContain('import sys')
    })

    it('should throw error for non-existent file', async () => {
      await expect(analyzer.readScriptContent('non-existent.py'))
        .rejects.toThrow('Failed to read script file')
    })
  })

  describe('extractUsagePattern', () => {
    it('should extract usage information from README using LLM', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: "python test-script.py '<input_text>'",
            example: "python test-script.py 'Hello world test'",
            expectedOutput: 'Word Count: 3'
          })
        })
      }

      const readmePath = join(__dirname, '../fixtures/test-script-readme.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      expect(usageInfo.command).toBe("python test-script.py '<input_text>'")
      expect(usageInfo.example).toBe("python test-script.py 'Hello world test'")
      expect(usageInfo.expectedOutput).toBe('Word Count: 3')
    })

    it('should fallback to regex parsing when no LLM provided', async () => {
      const readmePath = join(__dirname, '../fixtures/test-script-readme.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath) // No LLM

      expect(usageInfo.command).toBe("python test-script.py '<input_text>'")
      expect(usageInfo.example).toBe("python test-script.py 'Hello world test'")
      expect(usageInfo.expectedOutput).toBe('Word Count: 3')
    })

    it('should fallback to regex parsing when LLM fails', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: 'This is not valid JSON'
        })
      }

      const readmePath = join(__dirname, '../fixtures/test-script-readme.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      // Should still extract using fallback regex
      expect(usageInfo.command).toBeDefined()
      expect(usageInfo.example).toBeDefined()
      expect(usageInfo.expectedOutput).toBeDefined()
    })

    it('should handle complex README formats with LLM', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            command: 'python3 advanced-script.py --input="<text>"',
            example: 'python3 advanced-script.py --input="Test input"',
            expectedOutput: 'Processing text: Test input\nResult: Character count is 10'
          })
        })
      }

      const readmePath = join(__dirname, '../fixtures/complex-readme.md')
      const usageInfo = await analyzer.extractUsagePattern(readmePath, mockLLM)

      expect(usageInfo.command).toContain('python3 advanced-script.py')
      expect(usageInfo.example).toContain('Test input')
      expect(usageInfo.expectedOutput).toContain('Character count is 10')
    })

    it('should handle LLM API errors gracefully', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('API Error'))
      }

      const readmePath = join(__dirname, '../fixtures/test-script-readme.md')

      await expect(analyzer.extractUsagePattern(readmePath, mockLLM))
        .rejects.toThrow('Failed to extract usage pattern')
    })

    it('should throw error for malformed README when fallback also fails', async () => {
      // Create a README with no recognizable format
      const readmePath = join(__dirname, '../../README.md')

      await expect(analyzer.extractUsagePattern(readmePath))
        .rejects.toThrow('Could not extract usage pattern from README using any known format')
    })

    it('should throw error for non-existent README', async () => {
      await expect(analyzer.extractUsagePattern('non-existent.md'))
        .rejects.toThrow('Failed to extract usage pattern')
    })
  })
})