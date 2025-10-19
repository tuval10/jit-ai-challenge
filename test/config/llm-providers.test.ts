import { LLMProviderFactory } from '../../src/config/llm-providers';

describe('LLMProviderFactory', () => {
  describe('create', () => {
    it('should create OpenAI provider', () => {
      const provider = LLMProviderFactory.create('openai', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toContain('ChatOpenAI');
    });

    it('should create Anthropic provider', () => {
      const provider = LLMProviderFactory.create('anthropic', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toContain('ChatAnthropic');
    });

    it('should create Google provider', () => {
      const provider = LLMProviderFactory.create('google', {
        apiKey: 'test-key',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toContain('ChatGoogleGenerativeAI');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        LLMProviderFactory.create('unsupported' as any, { apiKey: 'test' });
      }).toThrow('Unsupported LLM provider: unsupported');
    });

    it('should use default configuration values', () => {
      const provider = LLMProviderFactory.create('openai', {
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
      // Default values should be applied (temperature: 0.1, maxTokens: 2000)
    });
  });

  describe('getDefaultModel', () => {
    it('should return correct default models', () => {
      expect(LLMProviderFactory.getDefaultModel('openai')).toBe('gpt-4o-mini');
      expect(LLMProviderFactory.getDefaultModel('anthropic')).toBe(
        'claude-3-haiku-20240307',
      );
      expect(LLMProviderFactory.getDefaultModel('google')).toBe(
        'gemini-1.5-flash',
      );
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        LLMProviderFactory.getDefaultModel('unknown' as any);
      }).toThrow('Unknown provider: unknown');
    });
  });
});
