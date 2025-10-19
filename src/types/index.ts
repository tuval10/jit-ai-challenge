// Re-export node-specific types
export type {
  DetectedLanguage,
  UsageInfo,
} from '../nodes/script-analyzer/types';
export type { ValidationResult } from '../utils/docker-validation';

// Shared types that depend on node-specific types
export interface BuildResult {
  imageId: string;
  buildLogs: string;
  success: boolean;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface DockerGenerationResult {
  dockerfile: string;
  detectedLanguage: DetectedLanguage;
  usageInfo?: UsageInfo;
  validationResult?: ValidationResult;
  buildResult?: BuildResult;
  optimizationApplied?: boolean;
}

export type FailedStep =
  | 'script_analysis'
  | 'dockerfile_generation'
  | 'dockerfile_optimization';

export interface DockerGenerationState {
  scriptContent: string;
  scriptPath: string;
  readmePath: string;
  usageInfo?: UsageInfo;
  detectedLanguage?: DetectedLanguage;
  dockerfile?: string;
  validationResult?: ValidationResult;
  buildResult?: BuildResult;
  optimizationApplied?: boolean;
  // Retry tracking
  scriptAnalysisRetries?: number;
  languageDetectionRetries?: number;
  dockerfileGenerationRetries?: number;
  dockerfileOptimizationRetries?: number;
  maxRetries?: number;
  // Error tracking
  failedStep?: FailedStep;
  errorMessage?: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Import to make it available when exporting
import {
  type DetectedLanguage,
  type UsageInfo,
} from '../nodes/script-analyzer/types';
import { type ValidationResult } from '../utils/docker-validation';
