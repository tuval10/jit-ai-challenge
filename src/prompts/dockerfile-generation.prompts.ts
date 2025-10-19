import { type DetectedLanguage, type UsageInfo } from '../types';
import { basename } from 'path';

export const DOCKERFILE_GENERATION_PROMPT = (
  detectedLanguage: DetectedLanguage,
  usageInfo: UsageInfo,
  scriptPath: string,
): string => {
  const scriptFilename = basename(scriptPath);

  return `
You are an expert DevOps engineer. Generate a Dockerfile for the following script.

Language: ${detectedLanguage.name}
Runtime: ${detectedLanguage.runtime}
Base Image: ${detectedLanguage.baseImage}
Package Manager: ${detectedLanguage.packageManager ?? 'none'}
Dependencies: ${detectedLanguage.dependencies?.join(', ') ?? 'none'}

Script Filename: ${scriptFilename}
Usage Command: ${usageInfo.command}
Expected Output: ${usageInfo.expectedOutput}

Generate a Dockerfile that:
1. Uses the specified base image: ${detectedLanguage.baseImage}
2. Installs the runtime and any required dependencies
3. Copies the script file using: COPY ${scriptFilename} .
4. Sets appropriate permissions
5. Uses WORKDIR for organization
6. Includes a CMD or ENTRYPOINT to run the script

IMPORTANT: The script file will be in the build context root, so use "COPY ${scriptFilename} ." (not an absolute path).

The Dockerfile should be production-ready and follow Docker best practices.
Make sure the script can be executed with the usage command provided.

Return only the Dockerfile content, no additional text or markdown.
`;
};
