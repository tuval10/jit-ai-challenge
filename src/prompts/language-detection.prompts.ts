import { UsageInfo } from '../types'

export const LANGUAGE_DETECTION_PROMPT = (
  scriptContent: string,
  scriptPath: string,
  usageInfo: UsageInfo,
  retryAttempt?: number
): string => `
You are an expert software engineer tasked with analyzing a script and detecting its programming language and requirements.

Script Path: ${scriptPath}
Script Content:
\`\`\`
${scriptContent}
\`\`\`

Usage Command: ${usageInfo.command}
Example Usage: ${usageInfo.example}

Analyze this script and return a JSON object with the following structure:
{
  "name": "language_name",        // REQUIRED: string, min 1 char
  "version": "version_if_detectable",  // OPTIONAL: string
  "runtime": "runtime_command",   // REQUIRED: string, min 1 char
  "baseImage": "optimal_docker_base_image", // REQUIRED: string, min 1 char
  "packageManager": "package_manager_if_needed", // OPTIONAL: string
  "dependencies": ["list", "of", "dependencies"]  // OPTIONAL: array of strings, defaults to []
}

${retryAttempt ? `
⚠️ RETRY ATTEMPT ${retryAttempt}: Previous response was invalid or incomplete.
Please ensure ALL REQUIRED fields are provided with valid values.
Focus on accuracy and completeness of the JSON structure.
` : ''}

Guidelines:
- Detect the programming language from file extension, shebang, imports, or syntax
- Choose the most minimal appropriate Docker base image (prefer alpine variants)
- Include version if it can be inferred from imports or requirements
- List any dependencies found in imports, requires, or package files
- For scripts without external dependencies, dependencies can be empty array

Example responses:
- For Python: {"name": "python", "version": "3.9", "runtime": "python3", "baseImage": "python:3.9-alpine", "packageManager": "pip", "dependencies": []}
- For Node.js: {"name": "nodejs", "version": "18", "runtime": "node", "baseImage": "node:18-alpine", "packageManager": "npm", "dependencies": []}
- For Bash: {"name": "bash", "runtime": "bash", "baseImage": "alpine", "dependencies": []}

Return only the JSON object, no additional text.
`