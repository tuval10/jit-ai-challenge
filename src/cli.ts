#!/usr/bin/env node

import { config } from 'dotenv'
import { Command } from 'commander'
import { ScriptDockerizer } from './script-dockerizer'
import { LLMProviderFactory } from './config/llm-providers'
import { LLMProvider } from './types'

// Load environment variables
config()

const program = new Command()

program
  .name('script-dockerizer')
  .description('AI-powered tool to automatically generate Dockerfiles for scripts')
  .version('1.0.0')

program
  .argument('<script-path>', 'Path to script file')
  .argument('<readme-path>', 'Path to README with usage examples')
  .option('-p, --provider <provider>', 'LLM provider (openai|anthropic|google)', process.env.DEFAULT_LLM_PROVIDER || 'openai')
  .option('-k, --api-key <key>', 'API key for the LLM provider (or set environment variable)')
  .option('-t, --test', 'Run validation tests after building', process.env.DEFAULT_TEST_MODE === 'true')
  .option('-s, --stream', 'Stream graph execution progress', process.env.DEFAULT_STREAM_MODE === 'true')
  .option('-c, --cleanup', 'Cleanup Docker image after completion', process.env.DEFAULT_CLEANUP_MODE === 'true')
  .option('--temperature <temp>', 'LLM temperature (0.0-1.0)', process.env.LLM_TEMPERATURE || '0.0')
  .option('--max-tokens <tokens>', 'Maximum tokens for LLM response', process.env.LLM_MAX_TOKENS || '1500')
  .action(async (scriptPath: string, readmePath: string, options) => {
    try {
      // Validate provider
      const provider = options.provider as LLMProvider
      if (!['openai', 'anthropic', 'google'].includes(provider)) {
        console.error('❌ Invalid provider. Must be one of: openai, anthropic, google')
        process.exit(1)
      }

      // Get API key
      let apiKey = options.apiKey
      if (!apiKey) {
        // Try environment variables
        switch (provider) {
          case 'openai':
            apiKey = process.env.OPENAI_API_KEY
            break
          case 'anthropic':
            apiKey = process.env.ANTHROPIC_API_KEY
            break
          case 'google':
            apiKey = process.env.GOOGLE_API_KEY
            break
        }
      }

      if (!apiKey) {
        console.error(`❌ API key required. Provide via --api-key or set ${provider.toUpperCase()}_API_KEY environment variable`)
        process.exit(1)
      }

      // Create LLM instance
      const llm = LLMProviderFactory.create(provider, {
        apiKey,
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens)
      })

      console.log(`🤖 Using ${provider} with model: ${LLMProviderFactory.getDefaultModel(provider)}`)

      // Create ScriptDockerizer instance
      const dockerizer = new ScriptDockerizer(llm)

      // Execute with options
      const executionOptions = {
        test: options.test,
        cleanup: options.cleanup
      }

      if (options.stream) {
        console.log('⚠️  Streaming mode temporarily disabled due to TypeScript issues')
        await dockerizer.execute(scriptPath, readmePath, executionOptions)
      } else {
        await dockerizer.execute(scriptPath, readmePath, executionOptions)
      }

      console.log('✅ Script dockerization completed successfully!')

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Error:', errorMessage)

      // Provide helpful hints for common errors
      if (errorMessage.includes('API key')) {
        console.error('💡 Hint: Make sure your API key is valid and has sufficient credits')
      } else if (errorMessage.includes('Docker')) {
        console.error('💡 Hint: Make sure Docker is installed and running')
      } else if (errorMessage.includes('file')) {
        console.error('💡 Hint: Check that the script and README files exist and are readable')
      }

      process.exit(1)
    }
  })

// Add examples to help
program.addHelpText('after', `
Examples:
  $ script-dockerizer line_counter.sh README_line_counter.md
  $ script-dockerizer word_reverser.py README_word_reverser.md --test --stream
  $ script-dockerizer vowel_counter.js README_vowel_counter.md --provider anthropic --test
  $ OPENAI_API_KEY=sk-... script-dockerizer script.sh README.md --cleanup

Environment Variables:
  OPENAI_API_KEY      OpenAI API key
  ANTHROPIC_API_KEY   Anthropic API key
  GOOGLE_API_KEY      Google API key
`)

// Handle unhandled errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

if (require.main === module) {
  program.parse()
}