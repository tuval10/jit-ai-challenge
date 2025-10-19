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

