import { languageDetectionNode } from '../../src/nodes/language-detection.node'
import { DockerGenerationState } from '../../src/types'

// Mock LLM for testing
const createMockLLM = (response: string) => ({
  invoke: jest.fn().mockResolvedValue({ content: response })
})

describe('languageDetectionNode', () => {
  const mockState: DockerGenerationState = {
    scriptContent: 'import sys\nprint("Hello World")',
    scriptPath: 'test.py',
    usageInfo: {
      command: 'python test.py "input"',
      example: 'python test.py "Hello"',
      expectedOutput: 'Hello'
    }
  }

  it('should detect Python language correctly', async () => {
    const mockResponse = JSON.stringify({
      name: 'python',
      version: '3.9',
      runtime: 'python3',
      baseImage: 'python:3.9-alpine',
      packageManager: 'pip',
      dependencies: []
    })

    const mockLLM = createMockLLM(mockResponse)
    const result = await languageDetectionNode(mockState, mockLLM)

    expect(result.detectedLanguage).toBeDefined()
    expect(result.detectedLanguage!.name).toBe('python')
    expect(result.detectedLanguage!.runtime).toBe('python3')
    expect(result.detectedLanguage!.baseImage).toBe('python:3.9-alpine')
  })

  it('should handle JSON wrapped in markdown', async () => {
    const mockResponse = `Here's the analysis:
\`\`\`json
{
  "name": "nodejs",
  "version": "18",
  "runtime": "node",
  "baseImage": "node:18-alpine",
  "packageManager": "npm",
  "dependencies": []
}
\`\`\``

    const mockLLM = createMockLLM(mockResponse)
    const result = await languageDetectionNode(mockState, mockLLM)

    expect(result.detectedLanguage).toBeDefined()
    expect(result.detectedLanguage!.name).toBe('nodejs')
    expect(result.detectedLanguage!.runtime).toBe('node')
  })

  it('should throw error for invalid JSON response', async () => {
    const mockLLM = createMockLLM('This is not valid JSON')

    await expect(languageDetectionNode(mockState, mockLLM))
      .rejects.toThrow('Language detection failed')
  })

  it('should throw error for missing required fields', async () => {
    const mockResponse = JSON.stringify({
      name: 'python'
      // Missing runtime and baseImage
    })

    const mockLLM = createMockLLM(mockResponse)

    await expect(languageDetectionNode(mockState, mockLLM))
      .rejects.toThrow('missing required fields')
  })

  it('should handle LLM API errors', async () => {
    const mockLLM = {
      invoke: jest.fn().mockRejectedValue(new Error('API Error'))
    }

    await expect(languageDetectionNode(mockState, mockLLM))
      .rejects.toThrow('Language detection failed')
  })
})