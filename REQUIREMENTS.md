# Jit-ai-challenge
**Logistics**:

- **Time**: 2-3 hours
- **API Budget**: $5 maximum - API key will be provided in Whatsapp
- Implement the challenge within your repo.
- The scripts are provided in the repository

### Goal:

You aim to write a tool that uses generative AI to wrap existing scripts (The scripts could be any one-pager script in any scripting language) with a Dockerfile. The tool will use the API OpenAI, and will need to:

- Generate a Dockerfile that wraps the provided script.
- Build & Test the image and run it with an example that uses the provided script, ensuring that it works properly.
- The tool needs to be generic and work on different scripts. You can assume that in the input, you'll get the script's in the challenge repo and an example usage. This example can be used to verify that the wrapped version works properly.

### Backend (BE) Task:

1. **Integrate with an AI Model**:
    - Write the tool to interact with an AI model using an API key. The tool needs to do the following:
        - The code should accept the provided scripts (and any tool with the same type of input and output) and generate a Dockerfile that wraps the script.
        - Ensure the AI validates that the script functions correctly within the Dockerfile.
        - Optimize the API usage to stay within budget and ensure the prompts are reliable.
2. **Required Deliverables**:
    - Provide clear instructions on how to run the Tool.
    - Using the provided code and prompts, demonstrate how a new CLI tool can be added and wrapped in a Docker file.

Bonuses [Optional]- If you still have time and want to take this challenge to the next level:

- Make the code infrastructure to be LLM vendor-agnostic
- Add tests to verify the wrapping process.
- Under the assumption that the inputs of this process are not internal (like tool name and documentation), provide sanitization and prompt injection detection and protection functionality.
