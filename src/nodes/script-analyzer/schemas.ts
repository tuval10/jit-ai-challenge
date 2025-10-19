import { z } from 'zod';

// Shared utility function for safe JSON parsing
export function safeJsonParse<T>(
  jsonString: string,
  validator: (data: unknown) => T
): T {
  try {
    const parsed = JSON.parse(jsonString);
    return validator(parsed);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
    throw error;
  }
}

// Schema for detected language information
export const DetectedLanguageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  version: z.string().optional(),
  runtime: z.string().min(1, 'Runtime is required'),
  baseImage: z.string().min(1, 'Base image is required'),
  packageManager: z.string().optional(),
  dependencies: z.array(z.string()).optional().default([]),
});

// Schema for usage information from README
export const UsageInfoSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  example: z.string().min(1, 'Example is required'),
  expectedOutput: z.string().min(1, 'Expected output is required'),
  testInput: z.string().min(1, 'Test input is required'),
});

// Combined schema for comprehensive script analysis
export const ScriptAnalysisSchema = z.object({
  language: DetectedLanguageSchema,
  usage: UsageInfoSchema,
});

// Enhanced types with validation
export type ValidatedDetectedLanguage = z.infer<typeof DetectedLanguageSchema>;
export type ValidatedUsageInfo = z.infer<typeof UsageInfoSchema>;
export type ValidatedScriptAnalysis = z.infer<typeof ScriptAnalysisSchema>;

// Validation helper functions
export function validateDetectedLanguage(
  data: unknown
): ValidatedDetectedLanguage {
  try {
    return DetectedLanguageSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Language detection validation failed: ${issues}`);
    }
    throw error;
  }
}

export function validateUsageInfo(data: unknown): ValidatedUsageInfo {
  try {
    return UsageInfoSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Usage info validation failed: ${issues}`);
    }
    throw error;
  }
}

export function validateScriptAnalysis(data: unknown): ValidatedScriptAnalysis {
  try {
    return ScriptAnalysisSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => {
          const path = issue.path.join('.');
          const value = issue.path.reduce((obj: any, key) => obj?.[key], data);
          return `${path}: ${issue.message} (received: ${JSON.stringify(
            value
          )})`;
        })
        .join(', ');
      throw new Error(
        `Script analysis validation failed: ${issues}. Please ensure all required fields are present with valid non-empty strings.`
      );
    }
    throw error;
  }
}
