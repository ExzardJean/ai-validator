# AI Validator

[![npm version](https://img.shields.io/npm/v/@vezlo/ai-validator.svg)](https://www.npmjs.com/package/@vezlo/ai-validator)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**AI Response Validator** - Automated accuracy checking, hallucination prevention, and confidence scoring for AI responses.

## 🎯 Purpose

AI Validator helps you ensure the quality and reliability of AI-generated responses by:

- ✅ **Automated Accuracy Checking** - Verify AI responses against source documents
- ✅ **Hallucination Prevention** - Detect when AI invents information not in sources
- ✅ **Confidence Scoring** - Get reliability scores for every response
- ✅ **Query Classification** - Skip validation for greetings, typos, and small talk
- ✅ **Multi-LLM Support** - Works with OpenAI and Claude

Perfect for RAG systems, knowledge bases, and any application where AI response quality matters.

## 🚀 Quick Start

### Installation

```bash
npm install @vezlo/ai-validator
```

Or install globally for CLI access:

```bash
npm install -g @vezlo/ai-validator
```

### For Local Development/Testing

```bash
# Clone the repository
git clone https://github.com/vezlo/ai-validator.git
cd ai-validator

# Install dependencies
npm install

# Build the project
npm run build

# Run the test CLI
npm test
```

## 💻 Usage

### 1. CLI Testing (Interactive)

Test the validator interactively without writing code:

```bash
# Using npx (no installation required)
npx vezlo-validator-test

# Or if installed globally
vezlo-validator-test
```

The CLI will guide you through:
- Selecting LLM provider (OpenAI or Claude)
- Entering API keys
- Choosing models (any OpenAI or Claude model)
- Configuring validation settings
- Testing with your own queries and responses
- Easy text input for sources (no JSON required)

### 2. Code Usage (Programmatic)

#### Basic Example

```typescript
import { AIValidator } from '@vezlo/ai-validator';

// Initialize with your API key and provider
const validator = new AIValidator({
  openaiApiKey: 'sk-your-openai-key',  // Your OpenAI API key
  llmProvider: 'openai'                 // 'openai' or 'claude'
});

// Validate a response
const validation = await validator.validate({
  query: "What is machine learning?",
  response: "Machine learning is a subset of AI that focuses on algorithms.",
  sources: [
    {
      content: "Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.",
      title: "ML Guide",
      url: "https://example.com/ml-guide"
    }
  ]
});

// Check results
console.log(`Confidence: ${(validation.confidence * 100).toFixed(1)}%`);
console.log(`Valid: ${validation.valid}`);
console.log(`Accuracy: ${validation.accuracy.verified ? 'Verified' : 'Not verified'}`);
console.log(`Hallucination Risk: ${(validation.hallucination.risk * 100).toFixed(1)}%`);
console.log(`Warnings: ${validation.warnings.join(', ')}`);
```

#### Advanced Configuration

```typescript
import { AIValidator } from '@vezlo/ai-validator';

const validator = new AIValidator({
  // API Keys (at least one required)
  openaiApiKey: 'sk-your-openai-key',
  claudeApiKey: 'sk-ant-your-claude-key',
  
  // LLM Provider (required)
  llmProvider: 'openai', // 'openai' or 'claude'
  
  // Model Selection (optional - you can specify any model from the provider)
  openaiModel: 'gpt-4o',  // Any OpenAI model: gpt-4o, gpt-4o-mini, gpt-4, etc.
  claudeModel: 'claude-sonnet-4-5-20250929',  // Any Claude model
  
  // Validation Settings (optional)
  confidenceThreshold: 0.7,           // 0.0 - 1.0 (default: 0.7)
  enableQueryClassification: true,     // Skip validation for greetings/typos
  enableAccuracyCheck: true,          // LLM-based accuracy checking
  enableHallucinationDetection: true  // LLM-based hallucination detection
});
```

### Integration with RAG Systems

```typescript
// Example with a RAG system
const ragResponse = await yourRAGSystem.query(userQuestion);
const sources = await yourRAGSystem.getSources(userQuestion);

const validation = await validator.validate({
  query: userQuestion,
  response: ragResponse.content,
  sources: sources.map(s => ({
    content: s.text,
    title: s.title,
    url: s.url
  }))
});

if (validation.valid) {
  // Show response to user
  return ragResponse.content;
} else {
  // Handle low confidence response
  console.warn('Low confidence response:', validation.warnings);
  return "I'm not confident about this answer. Please consult additional sources.";
}
```

## 📊 Validation Results

```typescript
interface ValidationResult {
  confidence: number;        // 0.0 - 1.0
  valid: boolean;            // true if confidence >= threshold
  accuracy: {
    verified: boolean;
    verification_rate: number;
    reason?: string;
  };
  context: {
    source_relevance: number;
    source_usage_rate: number;
    valid: boolean;
  };
  hallucination: {
    detected: boolean;
    risk: number;
    hallucinated_parts?: string[];
  };
  warnings: string[];
  query_type?: string;       // 'greeting', 'question', etc.
  skip_validation?: boolean; // true for greetings/typos
}
```

## 🔧 Configuration

### Configuration Options

All configuration is done in code when initializing the validator:

```typescript
interface AIValidatorConfig {
  // API Keys (at least one required)
  openaiApiKey?: string;      // Your OpenAI API key
  claudeApiKey?: string;       // Your Claude API key
  
  // Provider (required)
  llmProvider: 'openai' | 'claude';
  
  // Models (optional - specify any valid model from the chosen provider)
  openaiModel?: string;        // Default: 'gpt-4o'
  claudeModel?: string;        // Default: 'claude-sonnet-4-5-20250929'
  
  // Validation Settings (optional)
  confidenceThreshold?: number;           // Default: 0.7
  enableQueryClassification?: boolean;    // Default: true
  enableAccuracyCheck?: boolean;         // Default: true
  enableHallucinationDetection?: boolean; // Default: true
}
```

### Model Support

**OpenAI Models:**
You can use any OpenAI chat model by specifying it in `openaiModel`. Common choices include:
- `gpt-4o` (default, recommended)
- `gpt-4o-mini` (faster, cheaper)
- `gpt-4` (previous flagship)
- `gpt-4-turbo`
- Or any other OpenAI chat completion model

**Claude Models:**
You can use any Claude model by specifying it in `claudeModel`. Common choices include:
- `claude-sonnet-4-5-20250929` (default, Claude 4.5 Sonnet)
- `claude-opus-4-1-20250805` (Claude 4.1 Opus)
- `claude-3-7-sonnet-20250219` (Claude 3.7 Sonnet)
- Or any other Claude model identifier

The validator will work with any model supported by the respective provider's API.

### CLI Commands

```bash
# Interactive testing CLI
npx vezlo-validator-test

# Development commands
npm run build   # Build the project
npm run clean   # Clean build files
npm test        # Run the test CLI
```

## 🎯 Use Cases

### 1. RAG Systems
Validate responses against retrieved documents to ensure accuracy.

### 2. Customer Support Bots
Prevent incorrect information from reaching customers.

### 3. Knowledge Base Applications
Ensure AI answers are grounded in your documentation.

### 4. Content Generation
Validate AI-generated content against source materials.

### 5. Educational Applications
Ensure AI tutoring responses are accurate and helpful.

## ⚡ Performance

- **Validation Time**: 2-5 seconds per response (depending on LLM provider)
- **Cost**: Additional LLM API calls for validation
- **Accuracy**: High accuracy for responses with good sources
- **Reliability**: Graceful handling of edge cases

## 🔍 How It Works

1. **Query Classification** - Identifies greetings, typos, and small talk (skips validation)
2. **Accuracy Checking** - Uses LLM to verify facts against source documents
3. **Hallucination Detection** - Identifies information not present in sources
4. **Context Validation** - Ensures response relevance to the query
5. **Confidence Scoring** - Combines all metrics into a single score

## 📝 Examples

### High Confidence Response
```typescript
{
  confidence: 0.92,
  valid: true,
  accuracy: { verified: true, verification_rate: 0.95 },
  hallucination: { detected: false, risk: 0.05 },
  warnings: []
}
```

### Low Confidence Response
```typescript
{
  confidence: 0.35,
  valid: false,
  accuracy: { verified: false, verification_rate: 0.2 },
  hallucination: { detected: true, risk: 0.8 },
  warnings: ["No sources provided - high hallucination risk"]
}
```

### Skipped Validation (Greeting)
```typescript
{
  confidence: 1.0,
  valid: true,
  query_type: "greeting",
  skip_validation: true,
  warnings: []
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is dual-licensed:

- **Non-Commercial Use**: Free under AGPL-3.0 license
- **Commercial Use**: Requires a commercial license - contact us for details

See the [LICENSE](LICENSE) file for complete AGPL-3.0 license terms.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/vezlo/ai-validator/issues)
- **Documentation**: [GitHub Wiki](https://github.com/vezlo/ai-validator/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/vezlo/ai-validator/discussions)

## 🔗 Related Projects

- [@vezlo/assistant-server](https://www.npmjs.com/package/@vezlo/assistant-server) - AI Assistant Server with RAG capabilities
- [@vezlo/src-to-kb](https://www.npmjs.com/package/@vezlo/src-to-kb) - Convert source code to knowledge base

---

**Status**: ✅ Production Ready | **Version**: 1.0.2 | **License**: AGPL-3.0 | **Node.js**: 20+

**Made with ❤️ by [Vezlo](https://vezlo.org)**
