export const DOCKERFILE_VALIDATION_PROMPT = (dockerfile: string): string => `
You are a Dockerfile syntax validator. Check if this Dockerfile has valid syntax and structure.

Dockerfile:
\`\`\`
${dockerfile}
\`\`\`

Validate:
1. Required FROM instruction exists
2. All instructions are valid Docker commands
3. Proper syntax for each instruction
4. No obvious errors or typos

Return a JSON object with this exact structure:
{
  "isValid": true,  // REQUIRED: boolean (true/false)
  "errors": ["list of specific errors if any"],  // REQUIRED: array of strings, defaults to []
  "warnings": ["list of potential issues or suggestions"]  // OPTIONAL: array of strings, defaults to []
}

CRITICAL:
- "isValid" field is REQUIRED and must be a boolean (true or false)
- "errors" field is REQUIRED and must be an array of strings (empty array [] if no errors)

Return only the JSON object, no additional text.
`