import { dockerfileGenerationNode } from '../../src/nodes/dockerfile-generation.node'
import { DockerGenerationState } from '../../src/types'

const createMockLLM = (response: string) => ({
  invoke: jest.fn().mockResolvedValue({ content: response })
})

describe('dockerfileGenerationNode', () => {
  const mockState: DockerGenerationState = {
    scriptContent: 'print("Hello World")',
    scriptPath: 'test.py',
    usageInfo: {
      command: 'python test.py "input"',
      example: 'python test.py "Hello"',
      expectedOutput: 'Hello'
    },
    detectedLanguage: {
      name: 'python',
      version: '3.9',
      runtime: 'python3',
      baseImage: 'python:3.9-alpine',
      packageManager: 'pip',
      dependencies: []
    }
  }

  it('should generate valid Dockerfile', async () => {
    const mockDockerfile = `FROM python:3.9-alpine
WORKDIR /app
COPY test.py .
CMD ["python3", "test.py"]`

    const mockLLM = createMockLLM(mockDockerfile)
    const result = await dockerfileGenerationNode(mockState, mockLLM)

    expect(result.dockerfile).toBeDefined()
    expect(result.dockerfile).toContain('FROM python:3.9-alpine')
    expect(result.dockerfile).toContain('COPY test.py')
  })

  it('should handle Dockerfile wrapped in markdown', async () => {
    const mockResponse = `Here's your Dockerfile:

\`\`\`dockerfile
FROM python:3.9-alpine
WORKDIR /app
COPY test.py .
CMD ["python3", "test.py"]
\`\`\``

    const mockLLM = createMockLLM(mockResponse)
    const result = await dockerfileGenerationNode(mockState, mockLLM)

    expect(result.dockerfile).toBeDefined()
    expect(result.dockerfile).toContain('FROM python:3.9-alpine')
    expect(result.dockerfile).not.toContain('```')
  })

  it('should handle markdown without language specifier', async () => {
    const mockResponse = `\`\`\`
FROM alpine:latest
RUN apk add --no-cache python3
COPY test.py .
CMD ["python3", "test.py"]
\`\`\``

    const mockLLM = createMockLLM(mockResponse)
    const result = await dockerfileGenerationNode(mockState, mockLLM)

    expect(result.dockerfile).toBeDefined()
    expect(result.dockerfile).toContain('FROM alpine:latest')
    expect(result.dockerfile).not.toContain('```')
  })

  it('should throw error when language detection missing', async () => {
    const stateWithoutLanguage = { ...mockState }
    delete stateWithoutLanguage.detectedLanguage

    const mockLLM = createMockLLM('FROM alpine:latest')

    await expect(dockerfileGenerationNode(stateWithoutLanguage, mockLLM))
      .rejects.toThrow('Language detection must be completed')
  })

  it('should throw error for invalid Dockerfile (no FROM)', async () => {
    const mockLLM = createMockLLM('RUN echo "invalid dockerfile"')

    await expect(dockerfileGenerationNode(mockState, mockLLM))
      .rejects.toThrow('missing required FROM instruction')
  })

  it('should handle LLM API errors', async () => {
    const mockLLM = {
      invoke: jest.fn().mockRejectedValue(new Error('API Error'))
    }

    await expect(dockerfileGenerationNode(mockState, mockLLM))
      .rejects.toThrow('Dockerfile generation failed')
  })
})