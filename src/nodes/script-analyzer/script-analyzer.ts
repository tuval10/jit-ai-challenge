import { readFile } from 'fs/promises';
import { type UsageInfo, type DetectedLanguage } from './types';
import { SCRIPT_ANALYSIS_PROMPT } from './script-analysis.prompts';
import {
  validateScriptAnalysis,
  safeJsonParse,
  type ValidatedScriptAnalysis,
} from './schemas';
import { type SupportedLLM } from '../../config/llm-providers';

export interface ScriptAnalysisResult {
  language: DetectedLanguage;
  usage: UsageInfo;
}

export interface ScriptAnalyzer {
  analyzeScript: (
    scriptPath: string,
    readmePath: string,
    llm: SupportedLLM
  ) => Promise<ScriptAnalysisResult>;
  extractUsagePattern: (
    readmePath: string,
    llm: SupportedLLM
  ) => Promise<UsageInfo>;
  readScriptContent: (scriptPath: string) => Promise<string>;
}

export class ScriptAnalyzerImpl implements ScriptAnalyzer {
  /**
   * Comprehensive script analysis - analyzes both script and README in one LLM call
   */
  async analyzeScript(
    scriptPath: string,
    readmePath: string,
    llm: SupportedLLM
  ): Promise<ScriptAnalysisResult> {
    try {
      const [scriptContent, readmeContent] = await Promise.all([
        readFile(scriptPath, 'utf8'),
        readFile(readmePath, 'utf8'),
      ]);

      // Use unified LLM prompt for comprehensive analysis
      const prompt = SCRIPT_ANALYSIS_PROMPT(
        scriptContent,
        scriptPath,
        readmeContent,
        readmePath
      );

      console.log('🔍 Performing comprehensive script analysis with AI...');
      const response = await llm.invoke([{ role: 'user', content: prompt }]);

      // Extract string content from LLM response
      const responseContent =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Parse and validate the JSON response using Zod schema
      let analysis: ValidatedScriptAnalysis;

      try {
        // First try direct parsing with Zod validation
        analysis = safeJsonParse(responseContent, validateScriptAnalysis);
      } catch (parseError) {
        // Fallback: try multiple strategies to extract JSON from wrapped response
        let extractedJson: string | null = null;

        // Strategy 1: Remove markdown code blocks (```json ... ``` or ``` ... ```)
        const markdownMatch = responseContent.match(
          /```(?:json)?\s*\n?([\s\S]*?)\n?```/
        );
        if (markdownMatch) {
          extractedJson = markdownMatch[1].trim();
        }

        // Strategy 2: Extract from first { to last } (greedy match)
        if (!extractedJson) {
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedJson = jsonMatch[0];
          }
        }

        // Strategy 3: Try to find JSON object boundaries more carefully
        if (!extractedJson) {
          const firstBrace = responseContent.indexOf('{');
          const lastBrace = responseContent.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            extractedJson = responseContent.substring(
              firstBrace,
              lastBrace + 1
            );
          }
        }

        if (extractedJson) {
          try {
            analysis = safeJsonParse(extractedJson, validateScriptAnalysis);
            console.log('⚠️  Had to extract JSON from wrapped response');
          } catch (extractError) {
            throw new Error(
              `Failed to parse extracted JSON: ${
                extractError instanceof Error
                  ? extractError.message
                  : String(extractError)
              }`
            );
          }
        } else {
          throw new Error(
            `Failed to parse LLM response as JSON: ${
              parseError instanceof Error
                ? parseError.message
                : String(parseError)
            }. Response did not contain valid JSON.`
          );
        }
      }

      console.log('✅ Script analysis completed');
      console.log(
        `   Language: ${analysis.language.name} (${analysis.language.runtime})`
      );
      console.log(`   Command: ${analysis.usage.command}`);
      console.log(`   Example: ${analysis.usage.example}`);

      return {
        language: analysis.language,
        usage: analysis.usage,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze script: ${errorMessage}`);
    }
  }

  /**
   * Legacy method for extracting usage pattern only (kept for backward compatibility)
   * @deprecated Use analyzeScript() instead for comprehensive analysis
   */
  async extractUsagePattern(
    _readmePath: string,
    _llm: SupportedLLM
  ): Promise<UsageInfo> {
    // This method is deprecated in favor of comprehensive analyzeScript()
    throw new Error(
      'extractUsagePattern is deprecated. Use analyzeScript() instead.'
    );
  }

  async readScriptContent(scriptPath: string): Promise<string> {
    try {
      return await readFile(scriptPath, 'utf8');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read script file: ${errorMessage}`);
    }
  }
}
