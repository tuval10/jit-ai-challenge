import { readFile } from 'fs/promises';
import { type UsageInfo } from '../types';
import { README_ANALYSIS_PROMPT } from '../prompts';
import {
  validateUsageInfo,
  safeJsonParse,
  type ValidatedUsageInfo,
} from '../schemas';
import { type SupportedLLM } from '../config/llm-providers';

export interface ScriptAnalyzer {
  extractUsagePattern: (
    readmePath: string,
    llm: SupportedLLM
  ) => Promise<UsageInfo>;
  readScriptContent: (scriptPath: string) => Promise<string>;
}

export class ScriptAnalyzerImpl implements ScriptAnalyzer {
  async extractUsagePattern(
    readmePath: string,
    llm: SupportedLLM
  ): Promise<UsageInfo> {
    try {
      const readmeContent = await readFile(readmePath, 'utf8');

      // Use LLM for robust README analysis
      const prompt = README_ANALYSIS_PROMPT(readmeContent, readmePath);

      console.log('🔍 Analyzing README with AI...');
      const response = await llm.invoke([{ role: 'user', content: prompt }]);

      // Extract string content from LLM response
      const responseContent =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Parse and validate the JSON response using Zod schema
      let usageInfo: ValidatedUsageInfo;

      try {
        // First try direct parsing with Zod validation
        usageInfo = safeJsonParse(responseContent, validateUsageInfo);
      } catch (parseError) {
        // Fallback: try to extract JSON from response if wrapped in text
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          usageInfo = safeJsonParse(jsonMatch[0], validateUsageInfo);
        } else {
          throw new Error(
            `Failed to parse LLM response as JSON: ${
              parseError instanceof Error
                ? parseError.message
                : String(parseError)
            }`
          );
        }
      }

      console.log('✅ README analysis completed');
      console.log(`   Command: ${usageInfo.command}`);
      console.log(`   Example: ${usageInfo.example}`);

      return usageInfo;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract usage pattern: ${errorMessage}`);
    }
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
