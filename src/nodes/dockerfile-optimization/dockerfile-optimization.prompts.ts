import { type DetectedLanguage } from '../script-analyzer/types';

export const DOCKERFILE_OPTIMIZATION_PROMPT = (
  dockerfile: string,
  detectedLanguage: DetectedLanguage
): string => `
You are a Docker optimization expert. Optimize the following Dockerfile for production use.

Current Dockerfile:
\`\`\`
${dockerfile}
\`\`\`

Language: ${detectedLanguage.name}
Runtime: ${detectedLanguage.runtime}

Apply these optimizations:
1. Use multi-stage builds if beneficial
2. Combine RUN commands to reduce layers
3. Use minimal base images (already using: ${detectedLanguage.baseImage})
4. Add security best practices (non-root user, remove unnecessary packages)
5. Optimize for Docker layer caching
6. Add proper file permissions
7. Remove build dependencies after installation
8. Add comments for each step in the Dockerfile, don't add other comments.

Guidelines:
- Keep the same functionality
- Maintain the same base image unless there's a significantly better option
- Add comments explaining optimization choices
- Ensure the script still works with the expected usage command

Return only the optimized Dockerfile content, no additional text or markdown.
`;
