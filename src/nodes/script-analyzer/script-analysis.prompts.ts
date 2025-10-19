import { zodToJsonSchema } from 'zod-to-json-schema';
import { ScriptAnalysisSchema } from './schemas';

/**
 * Unified prompt for comprehensive script analysis
 * Analyzes both the script content and README to extract:
 * 1. Language detection (runtime, base image, dependencies)
 * 2. Usage information (command, example, expected output)
 */
export const SCRIPT_ANALYSIS_PROMPT = (
  scriptContent: string,
  scriptPath: string,
  readmeContent: string,
  readmePath: string,
  retryAttempt?: number
): string => {
  const jsonSchema = zodToJsonSchema(
    ScriptAnalysisSchema,
    'ScriptAnalysisSchema'
  );

  return `
You are an expert software engineer tasked with performing a comprehensive analysis of a script and its README documentation.

## Script Information
**Script Path:** ${scriptPath}

**Script Content:**
\`\`\`
${scriptContent}
\`\`\`

## Documentation
**README Path:** ${readmePath}

**README Content:**
\`\`\`
${readmeContent}
\`\`\`

${
  retryAttempt
    ? `
⚠️ **RETRY ATTEMPT ${retryAttempt}**: Previous response was invalid or incomplete.

CRITICAL ISSUES TO FIX:
- Ensure ALL REQUIRED fields are provided with valid non-empty strings
- Return ONLY raw JSON - NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanatory text before or after the JSON object
- Double-check that the response matches the schema exactly
- Start with { and end with } - nothing else

The previous attempt likely failed due to:
1. Missing required fields (name, runtime, baseImage, command, example, expectedOutput, testInput)
2. Wrapping JSON in markdown code blocks
3. Adding explanatory text outside the JSON
`
    : ''
}

## Your Task
Analyze both the script and README to extract comprehensive information. Return a JSON object matching this schema:

${JSON.stringify(jsonSchema, null, 2)}

## Analysis Guidelines

### Language Detection (language object):
- **name**: Detect the programming language from file extension, shebang, imports, or syntax
  - Examples: "python", "nodejs", "bash", "ruby", "go"
- **version**: Extract version from imports, requirements, or infer from syntax (optional)
  - Examples: "3.9", "18", "latest"
- **runtime**: The command/binary used to execute the script
  - Examples: "python3", "node", "bash", "ruby"
- **baseImage**: Choose the most minimal appropriate Docker base image (prefer alpine variants)
  - Examples: "python:3.9-alpine", "node:18-alpine", "alpine"
- **packageManager**: Package manager for dependencies (optional)
  - Examples: "pip", "npm", "gem", "cargo"
- **dependencies**: List of external dependencies from imports/requires (optional, can be empty array)
  - Parse from imports, package.json, requirements.txt, Gemfile, etc.

### Usage Information (usage object):
- **command**: The exact command-line template to run the script
  - Should include the interpreter and any flags
  - Use '<input>' as placeholder for user input
  - Examples: "python script.py '<input>'", "./script.sh '<input>'", "node script.js '<input>'"
- **example**: A concrete example with actual sample input
  - Should be a complete, runnable command
  - Examples: "python script.py 'Hello World'", "./script.sh 'test input'"
- **expectedOutput**: What the script outputs for the given example
  - Extract from README examples or infer from script logic
  - Examples: "Word Count: 2", "Line Count: 1", "Vowels: 3"
- **testInput**: The actual input value used in the example
  - The raw input without command syntax
  - Examples: "Hello World", "test input", "sample"

## README Analysis Tips:
- Look for sections: "Usage", "Example", "How to run", "Getting Started", "Quick Start", "Command"
- Find command patterns in code blocks (bash, shell, cmd, console, etc.)
- Extract example inputs and their expected outputs from code examples
- Handle various README formats (GitHub, GitLab, plain text, Markdown)
- Be flexible with section names, formatting, and structure
- If multiple examples exist, choose the clearest and most representative one

## Example Responses:

**IMPORTANT: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks or add any explanatory text.**

### Example 1 - Python Script:
{
  "language": {
    "name": "python",
    "version": "3.9",
    "runtime": "python3",
    "baseImage": "python:3.9-alpine",
    "packageManager": "pip",
    "dependencies": []
  },
  "usage": {
    "command": "python word_counter.py '<input>'",
    "example": "python word_counter.py 'Hello World'",
    "expectedOutput": "Word Count: 2",
    "testInput": "Hello World"
  }
}

### Example 2 - Node.js Script:
{
  "language": {
    "name": "nodejs",
    "version": "18",
    "runtime": "node",
    "baseImage": "node:18-alpine",
    "packageManager": "npm",
    "dependencies": []
  },
  "usage": {
    "command": "node vowel_counter.js '<input>'",
    "example": "node vowel_counter.js 'sample text'",
    "expectedOutput": "Vowels: 3",
    "testInput": "sample text"
  }
}

### Example 3 - Bash Script:
{
  "language": {
    "name": "bash",
    "runtime": "bash",
    "baseImage": "alpine",
    "dependencies": []
  },
  "usage": {
    "command": "./line_counter.sh '<input>'",
    "example": "./line_counter.sh 'test input'",
    "expectedOutput": "Line Count: 1",
    "testInput": "test input"
  }
}

## Critical Requirements:
- ALL fields marked as required in the schema MUST be present with valid non-empty strings
- The response must be valid JSON that exactly matches the schema structure
- Extract actual values from the README when available
- Preserve exact formatting and quoting from the README where appropriate
- If information is ambiguous, make reasonable inferences based on best practices
- Handle variations like 'npm run', 'chmod +x', setup steps gracefully

## Output Format:
Return ONLY the raw JSON object as shown in the examples above.
Do NOT wrap it in markdown code blocks (\`\`\`json...\`\`\`).
Do NOT add any explanatory text before or after the JSON.
Start your response with { and end with }.
`;
};
