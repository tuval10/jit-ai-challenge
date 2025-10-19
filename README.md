# Script Dockerizer 🐳🤖

An AI-powered tool that automatically generates production-ready Dockerfiles for scripts in any programming language using LangGraph workflows and multiple LLM providers.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-FF6B6B?style=flat)](https://langchain-ai.github.io/langgraph/)

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker** (installed and running)
- **API Key** for one of the supported LLM providers

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Jit-ai-challenge

# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env

# Edit .env file with your API key
nano .env  # Add your OPENAI_API_KEY=sk-...
```

### Basic Usage

```bash
# Build the project
yarn build

# Run with provided examples
yarn start line_counter.sh README_line_counter.md

# Development mode (with TypeScript)
yarn dev word_reverser.py README_word_reverser.md --test --stream
```

## 🎯 Features

### ✨ Core Capabilities

- 🧠 **AI Language Detection**: Automatically detects any scripting language (Python, Node.js, Bash, Ruby, Go, PHP, Perl, PowerShell, etc.)
- 🐳 **Smart Dockerfile Generation**: Creates optimized, production-ready Dockerfiles
- ✅ **Docker BuildKit Validation**: Uses `docker build --dry-run` for accurate syntax validation
- 🔄 **LangGraph Workflow**: Robust orchestration with conditional logic and error recovery
- 🚀 **Multi-LLM Support**: OpenAI, Anthropic, and Google providers with cost optimization
- 📊 **Real-time Streaming**: Watch the AI workflow execute step-by-step
- 🧪 **Automated Testing**: Builds and validates Docker images with provided examples

### 🎨 Advanced Features

- **Production Optimization**: Multi-stage builds, security hardening, layer optimization
- **Budget-Conscious**: Uses cost-effective models and smart caching
- **Error Recovery**: Automatic regeneration on validation failures
- **Flexible Configuration**: Environment variables and CLI options

## 🛠️ Usage Guide

### Command Line Interface

```bash
script-dockerizer <script-path> <readme-path> [options]
```

#### Required Arguments
- `<script-path>`: Path to your script file
- `<readme-path>`: Path to README with usage examples (see format below)

#### Options
```bash
-p, --provider <provider>     LLM provider (openai|anthropic|google) [default: openai]
-k, --api-key <key>          API key (or use environment variables)
-t, --test                   Run validation tests after building
-s, --stream                 Stream graph execution progress
-c, --cleanup                Remove Docker image after completion
--temperature <temp>         LLM temperature 0.0-1.0 [default: 0.1]
--max-tokens <tokens>        Maximum tokens for LLM response [default: 2000]
```

### Environment Configuration

Create `.env` file from `.env.example`:

```bash
# Required: Choose your LLM provider
OPENAI_API_KEY=sk-your-openai-key-here
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
# GOOGLE_API_KEY=your-google-api-key-here

# Optional: Defaults
DEFAULT_LLM_PROVIDER=openai
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2000

# Docker settings
DOCKER_TEMP_DIR=/tmp/claude
DOCKER_TIMEOUT=60000
```

## 📋 Usage Examples

### Example 1: Python Script

```bash
# Basic generation
yarn dev word_reverser.py README_word_reverser.md

# With testing and streaming
yarn dev word_reverser.py README_word_reverser.md --test --stream

# Using Anthropic with cleanup
yarn dev word_reverser.py README_word_reverser.md --provider anthropic --test --cleanup
```

### Example 2: Bash Script

```bash
# Generate and test
yarn dev line_counter.sh README_line_counter.md --test

# Stream the workflow
yarn dev line_counter.sh README_line_counter.md --stream
```

### Example 3: Node.js Script

```bash
# With all options
yarn dev vowel_counter.js README_vowel_counter.md --test --stream --cleanup
```

## 📄 README Format Requirements

Your script's README must follow this format for usage extraction:

```markdown
# Script Name

Description of what the script does.

## Requirements
- Runtime requirements

## Usage
```bash
runtime script.ext '<input_text>'
```

## Example
```bash
python script.py 'Hello World'
```

Output:
```
Expected output here
```

See provided examples: `README_line_counter.md`, `README_vowel_counter.md`, `README_word_reverser.md`

## 🏗️ Implementation Architecture

### High-Level Design

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   CLI Interface     │────▶   ScriptDockerizer   │────▶   Docker Manager    │
│   (Commander.js)    │    │   (Orchestrator)    │    │   (Build & Test)    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────┐
                           │   LangGraph         │
                           │   Workflow Engine   │
                           └─────────────────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Language   │ │ Dockerfile  │ │   Syntax    │ │    Build    │ │    Test     │
│ Detection   │ │ Generation  │ │ Validation  │ │   Image     │ │   & Run     │
│   (LLM)     │ │   (LLM)     │ │ (BuildKit)  │ │  (Docker)   │ │  (Docker)   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### LangGraph Workflow

The tool uses a sophisticated AI workflow with conditional logic:

```mermaid
graph TD
    A[Start] --> B[Detect Language]
    B --> C[Generate Dockerfile]
    C --> D[Validate Syntax]
    D --> E{Validation OK?}
    E -->|No| C
    E -->|Yes| F[Optimize Dockerfile]
    F --> G[Build Image]
    G --> H{Test Required?}
    H -->|Yes| I[Test Image]
    H -->|No| J[Complete]
    I --> K{Test Passed?}
    K -->|No| C
    K -->|Yes| J
```

### Core Components

#### 1. **ScriptAnalyzer** (`src/core/ScriptAnalyzer.ts`)
- Extracts usage patterns from README files
- Reads script content for analysis
- Parses command-line usage examples

```typescript
interface ScriptAnalyzer {
  extractUsagePattern(readmePath: string): Promise<UsageInfo>
  readScriptContent(scriptPath: string): Promise<string>
}
```

#### 2. **LangGraph Workflow** (`src/graphs/dockerGenerationGraph.ts`)
- Orchestrates the AI-powered generation process
- Handles conditional logic and error recovery
- Manages state between workflow steps

**Workflow Nodes:**
- **Language Detection** (`src/nodes/languageDetectionNode.ts`): AI analyzes script and determines runtime
- **Dockerfile Generation** (`src/nodes/dockerfileGenerationNode.ts`): AI creates initial Dockerfile
- **Syntax Validation** (`src/nodes/syntaxValidationNode.ts`): Docker BuildKit validates syntax
- **Optimization** (`src/nodes/dockerfileOptimizationNode.ts`): AI applies production best practices

#### 3. **DockerManager** (`src/core/DockerManager.ts`)
- Docker image building and management
- Container execution and testing
- Cleanup and resource management

```typescript
interface DockerManager {
  validateDockerfile(dockerfileContent: string): Promise<ValidationResult>
  buildImage(dockerfile: string, context: string, scriptPath: string): Promise<BuildResult>
  runContainer(imageId: string, args: string[]): Promise<ExecutionResult>
  cleanup(imageId: string): Promise<void>
}
```

#### 4. **LLM Provider Factory** (`src/config/llmProviders.ts`)
- Multi-provider support (OpenAI, Anthropic, Google)
- Cost estimation and optimization
- Vendor-agnostic interface

```typescript
export class LLMProviderFactory {
  static create(provider: LLMProvider, config: LLMConfig): SupportedLLM
  static getDefaultModel(provider: LLMProvider): string
  static estimateTokenCost(provider: LLMProvider, inputTokens: number, outputTokens: number): number
}
```

### Project Structure

```
src/
├── core/                           # Core business logic
│   ├── ScriptAnalyzer.ts          # README parsing and script analysis
│   └── DockerManager.ts           # Docker operations
├── graphs/                         # LangGraph workflows
│   └── dockerGenerationGraph.ts   # Main AI workflow orchestration
├── nodes/                          # Individual workflow steps
│   ├── languageDetectionNode.ts   # AI-powered language detection
│   ├── dockerfileGenerationNode.ts # Dockerfile creation
│   ├── syntaxValidationNode.ts    # Docker BuildKit validation
│   └── dockerfileOptimizationNode.ts # Production optimization
├── config/                         # Configuration and factories
│   └── llmProviders.ts            # Multi-LLM provider support
├── types/                          # TypeScript type definitions
│   └── index.ts                   # All interfaces and types
├── utils/                          # Utilities and helpers
│   └── promptTemplates.ts         # Optimized AI prompts
├── ScriptDockerizer.ts            # Main orchestrator class
├── cli.ts                         # Command-line interface
└── index.ts                       # Public API exports

test/                              # Comprehensive test suite
├── core/                          # Unit tests for core components
├── nodes/                         # Tests for workflow nodes
├── config/                        # Provider and config tests
├── integration/                   # End-to-end integration tests
├── fixtures/                      # Test data and examples
└── utils/                         # Utility function tests
```

### AI Prompt Engineering

The tool uses carefully crafted prompts for optimal results:

#### Language Detection Prompt
```typescript
const LANGUAGE_DETECTION_PROMPT = (scriptContent, scriptPath, usageInfo) => `
Analyze this script and detect:
- Programming language and version
- Runtime requirements
- Optimal Docker base image
- Package manager and dependencies
- Return structured JSON only
...
```

#### Dockerfile Generation Prompt
```typescript
const DOCKERFILE_GENERATION_PROMPT = (detectedLanguage, usageInfo, scriptPath) => `
Generate production-ready Dockerfile with:
- Specified base image: ${detectedLanguage.baseImage}
- Security best practices
- Proper file permissions
- Multi-stage builds where beneficial
...
```

### Performance Optimizations

#### Cost Management
- **Smart Model Selection**: Uses cost-effective models (gpt-4o-mini, claude-3-haiku, gemini-1.5-flash)
- **Token Budgeting**: Tracks and optimizes API usage across workflow
- **State Caching**: Prevents regeneration of identical results
- **BuildKit Validation**: Free syntax validation using Docker's native parser

#### Workflow Efficiency
- **Conditional Edges**: Skip unnecessary steps based on validation results
- **Error Recovery**: Automatic regeneration on failures with improved prompts
- **Parallel Operations**: Concurrent file operations where possible
- **Resource Cleanup**: Automatic cleanup of temporary files and Docker images

## 🧪 Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run with coverage
yarn test -- --coverage

# Run specific test suites
yarn test -- --testPathPattern=core
yarn test -- --testPathPattern=integration

# Watch mode for development
yarn test -- --watch
```

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Mock LLM**: Avoids API costs during testing
- **Docker Integration**: Real Docker operations in test environment

### Test Coverage

The test suite covers:
- ✅ Script analysis and README parsing
- ✅ LLM provider factory and configuration
- ✅ Docker operations (build, run, cleanup)
- ✅ Workflow node functionality
- ✅ Error handling and edge cases
- ✅ End-to-end integration scenarios

## 🔧 Development

### Setup Development Environment

```bash
# Install dependencies
yarn install

# Start in development mode
yarn dev <script> <readme>

# Type checking
yarn typecheck

# Linting
yarn lint

# Build for production
yarn build
```

### Adding New Language Support

The AI automatically detects new languages, but you can enhance detection by:

1. **Update Prompt Templates** (`src/utils/promptTemplates.ts`):
   - Add examples for your language in `LANGUAGE_DETECTION_PROMPT`

2. **Test with New Script**:
   ```bash
   yarn dev your-script.ext your-readme.md --stream
   ```

3. **Verify Output**:
   - Check generated Dockerfile matches language requirements
   - Test the built image works correctly

### Adding New LLM Providers

1. **Install Provider Package**:
   ```bash
   npm install @langchain/your-provider
   ```

2. **Update Factory** (`src/config/llmProviders.ts`):
   ```typescript
   case 'your-provider':
     return new ChatYourProvider(config)
   ```

3. **Add Type Definition** (`src/types/index.ts`):
   ```typescript
   export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'your-provider'
   ```

## 🐛 Troubleshooting

### Common Issues

#### API Key Issues
```bash
Error: API key required
```
**Solution**: Check your `.env` file and ensure the API key is correctly set:
```bash
# Check current environment
echo $OPENAI_API_KEY

# Set temporarily
export OPENAI_API_KEY=sk-your-key-here
```

#### Docker Issues
```bash
Error: Docker build failed
```
**Solutions**:
- Ensure Docker is running: `docker info`
- Check disk space: `docker system df`
- Verify permissions: `sudo usermod -aG docker $USER`

#### README Format Issues
```bash
Error: Could not extract usage pattern
```
**Solution**: Ensure your README follows the required format with proper sections:
- `## Usage` with code block
- `## Example` with code block
- `Output:` with expected result

### Debug Mode

Enable detailed logging:
```bash
# Set environment variable
export NODE_ENV=development
export LOG_LEVEL=debug

# Run with verbose output
yarn dev script.py README.md --stream
```

## 📊 Performance Metrics

### Typical Workflow Times
- **Language Detection**: ~2-3 seconds
- **Dockerfile Generation**: ~3-5 seconds
- **Syntax Validation**: ~1-2 seconds
- **Docker Build**: ~10-30 seconds (depends on base image)
- **Testing**: ~3-5 seconds

### API Cost Estimates
- **OpenAI (gpt-4o-mini)**: ~$0.002-0.005 per script
- **Anthropic (claude-3-haiku)**: ~$0.003-0.007 per script
- **Google (gemini-1.5-flash)**: ~$0.001-0.003 per script

### Resource Usage
- **Memory**: ~50-100MB during execution
- **Disk**: ~10-50MB temporary files (auto-cleanup)
- **Docker Images**: Varies by base image size

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Ensure all tests pass: `yarn test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain & LangGraph**: For the powerful AI workflow framework
- **Docker**: For containerization technology
- **OpenAI, Anthropic, Google**: For providing excellent LLM APIs
- **TypeScript**: For type safety and developer experience

---

## 📞 Support

For issues, questions, or contributions:
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **Email**: your-email@example.com

**Built with ❤️ using AI and modern DevOps practices**