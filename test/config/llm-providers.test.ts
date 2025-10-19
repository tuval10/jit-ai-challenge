import { LLMProviderFactory } from '../../src/config/llm-providers'

describe('LLMProviderFactory', () => {
  describe('create', () => {
    it('should create OpenAI provider', () => {
      const provider = LLMProviderFactory.create('openai', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000
      })

      expect(provider).toBeDefined()
      expect(provider.constructor.name).toContain('ChatOpenAI')
    })

    it('should create Anthropic provider', () => {
      const provider = LLMProviderFactory.create('anthropic', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000
      })

      expect(provider).toBeDefined()
      expect(provider.constructor.name).toContain('ChatAnthropic')
    })

    it('should create Google provider', () => {
      const provider = LLMProviderFactory.create('google', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000
      })

      expect(provider).toBeDefined()
      expect(provider.constructor.name).toContain('ChatGoogleGenerativeAI')
    })

    it('should throw error for unsupported provider', () => {
      expect(() => {
        LLMProviderFactory.create('unsupported' as any, { apiKey: 'test' })
      }).toThrow('Unsupported LLM provider: unsupported')
    })

    it('should use default configuration values', () => {
      const provider = LLMProviderFactory.create('openai', { apiKey: 'test-key' })

      expect(provider).toBeDefined()
      // Default values should be applied (temperature: 0.1, maxTokens: 2000)
    })
  })

  describe('getDefaultModel', () => {
    it('should return correct default models', () => {
      expect(LLMProviderFactory.getDefaultModel('openai')).toBe('gpt-4o-mini')
      expect(LLMProviderFactory.getDefaultModel('anthropic')).toBe('claude-3-haiku-20240307')
      expect(LLMProviderFactory.getDefaultModel('google')).toBe('gemini-1.5-flash')
    })

    it('should throw error for unknown provider', () => {
      expect(() => {
        LLMProviderFactory.getDefaultModel('unknown' as any)
      }).toThrow('Unknown provider: unknown')
    })
  })

  describe('estimateTokenCost', () => {
    it('should estimate costs for different providers', () => {
      const inputTokens = 1000
      const outputTokens = 500

      const openaiCost = LLMProviderFactory.estimateTokenCost('openai', inputTokens, outputTokens)
      const anthropicCost = LLMProviderFactory.estimateTokenCost('anthropic', inputTokens, outputTokens)
      const googleCost = LLMProviderFactory.estimateTokenCost('google', inputTokens, outputTokens)

      expect(openaiCost).toBeGreaterThan(0)
      expect(anthropicCost).toBeGreaterThan(0)
      expect(googleCost).toBeGreaterThan(0)

      // Google should generally be cheapest
      expect(googleCost).toBeLessThan(openaiCost)
      expect(googleCost).toBeLessThan(anthropicCost)
    })

    it('should return 0 cost for 0 tokens', () => {
      const cost = LLMProviderFactory.estimateTokenCost('openai', 0, 0)
      expect(cost).toBe(0)
    })
  })
})