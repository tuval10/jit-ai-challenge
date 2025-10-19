import { zodToJsonSchema } from 'zod-to-json-schema';
import { DockerfileValidationSchema } from '../schemas';

export const DOCKERFILE_VALIDATION_PROMPT = (dockerfile: string): string => {
  const jsonSchema = zodToJsonSchema(
    DockerfileValidationSchema,
    'DockerfileValidationSchema',
  );

  return `
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

Return a JSON object matching this schema:
${JSON.stringify(jsonSchema, null, 2)}

CRITICAL:
- "isValid" field is REQUIRED and must be a boolean (true or false)
- "errors" field is REQUIRED and must be an array of strings (empty array [] if no errors)

Return only the JSON object, no additional text.
`;
};
