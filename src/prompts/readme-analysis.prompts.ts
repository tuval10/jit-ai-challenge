import { zodToJsonSchema } from 'zod-to-json-schema';
import { UsageInfoSchema } from '../schemas';

export const README_ANALYSIS_PROMPT = (
  readmeContent: string,
  scriptPath: string,
): string => {
  const jsonSchema = zodToJsonSchema(UsageInfoSchema, 'UsageInfoSchema');

  return `
You are an expert software engineer tasked with analyzing a README file to extract script usage information.

Script Path: ${scriptPath}

README Content:
\`\`\`
${readmeContent}
\`\`\`

Extract the following information from this README:

1. **Command**: The exact command line to run the script
2. **Example**: A concrete example of running the script with sample input
3. **Expected Output**: What the script should output for the given example
4. **Test Input**: The input value used in the example

Guidelines:
- Look for sections like "Usage", "Example", "How to run", "Command", etc.
- Find command patterns in code blocks (bash, shell, cmd, etc.)
- Extract example inputs and their expected outputs
- Handle various README formats (GitHub, GitLab, plain text, etc.)
- Be flexible with section names and formatting
- If multiple examples exist, choose the clearest one

Return a JSON object matching this schema:
${JSON.stringify(jsonSchema, null, 2)}

CRITICAL: All fields are REQUIRED and must contain valid non-empty strings (minimum 1 character).

Example responses:
- For Python: {"command": "python script.py '<input>'", "example": "python script.py 'Hello World'", "expectedOutput": "Word Count: 2", "testInput": "Hello World"}
- For Bash: {"command": "./script.sh '<input>'", "example": "./script.sh 'test input'", "expectedOutput": "Line Count: 1", "testInput": "test input"}
- For Node.js: {"command": "node script.js '<input>'", "example": "node script.js 'sample'", "expectedOutput": "Length: 6", "testInput": "sample"}

Important:
- Extract the actual command template, not just the example
- Preserve exact formatting and quoting from the README
- If no clear example exists, infer from the usage description
- Handle variations like 'npm run', 'chmod +x', setup steps, etc.

Return only the JSON object, no additional text.
`;
};
