export interface DetectedLanguage {
  name: string; // e.g., 'bash', 'python', 'ruby', 'go', etc.
  version?: string; // e.g., '3.9', '18', 'latest'
  runtime: string; // e.g., 'bash', 'python3', 'node', 'ruby'
  baseImage: string; // e.g., 'alpine', 'python:3.9-alpine', 'node:18-alpine'
  packageManager?: string; // e.g., 'pip', 'npm', 'gem', 'cargo'
  dependencies?: string[]; // Detected from imports/requires
}

export interface UsageInfo {
  command: string;
  example: string;
  expectedOutput: string;
  testInput: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

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
  validationResult?: ValidationResult;
  buildResult?: BuildResult;
  optimizationApplied?: boolean;
}

export interface DockerGenerationState {
  scriptContent: string;
  scriptPath: string;
  usageInfo: UsageInfo;
  detectedLanguage?: DetectedLanguage;
  dockerfile?: string;
  validationResult?: ValidationResult;
  buildResult?: BuildResult;
  optimizationApplied?: boolean;
  // Retry tracking
  languageDetectionRetries?: number;
  readmeAnalysisRetries?: number;
  dockerfileGenerationRetries?: number;
  maxRetries?: number;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}
