import { z } from 'zod';

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

// Schema for Dockerfile validation result
export const DockerfileValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).optional().default([]),
});

// Enhanced types with validation
export type ValidatedDetectedLanguage = z.infer<typeof DetectedLanguageSchema>;
export type ValidatedUsageInfo = z.infer<typeof UsageInfoSchema>;
export type ValidatedDockerfileValidation = z.infer<
  typeof DockerfileValidationSchema
>;

// Validation helper functions
export function validateDetectedLanguage(
  data: unknown,
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

export function validateDockerfileValidation(
  data: unknown,
): ValidatedDockerfileValidation {
  try {
    return DockerfileValidationSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(
        `Dockerfile validation result validation failed: ${issues}`,
      );
    }
    throw error;
  }
}

// Utility to safely parse JSON with better error messages
export function safeJsonParse<T>(
  jsonString: string,
  validator: (data: unknown) => T,
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
