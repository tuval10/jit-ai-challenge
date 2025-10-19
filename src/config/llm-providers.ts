import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { LLMProvider, LLMConfig } from '../types'

export type SupportedLLM = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI

export class LLMProviderFactory {
  static create(provider: LLMProvider, config: LLMConfig): SupportedLLM {
    const baseConfig = {
      temperature: config.temperature || 0.0,  // Deterministic outputs for consistent results
      maxTokens: config.maxTokens || 1500      // Sufficient for Dockerfiles, more cost-effective
    }

    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: config.apiKey,
          modelName: config.model || 'gpt-4o-mini',
          ...baseConfig
        })

      case 'anthropic':
        return new ChatAnthropic({
          anthropicApiKey: config.apiKey,
          modelName: config.model || 'claude-3-haiku-20240307',
          ...baseConfig
        })

      case 'google':
        return new ChatGoogleGenerativeAI({
          apiKey: config.apiKey,
          modelName: config.model || 'gemini-1.5-flash',
          ...baseConfig
        })

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`)
    }
  }

  static getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini'  // Cheaper, good for this task
      case 'anthropic':
        return 'claude-3-haiku-20240307'  // Fast and economical
      case 'google':
        return 'gemini-1.5-flash'  // Good balance of cost and performance
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  static estimateTokenCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number {
    // Rough cost estimates (per 1K tokens) - update with current pricing
    const costs = {
      openai: { input: 0.00015, output: 0.0006 },      // gpt-4o-mini
      anthropic: { input: 0.00025, output: 0.00125 },  // claude-3-haiku
      google: { input: 0.000075, output: 0.0003 }      // gemini-1.5-flash
    }

    const cost = costs[provider]
    return ((inputTokens / 1000) * cost.input) + ((outputTokens / 1000) * cost.output)
  }
}