import { AIValidatorConfig, ValidationInput, ValidationResult } from './types';
import { QueryClassifier } from './QueryClassifier';
import { AccuracyChecker } from './AccuracyChecker';
import { HallucinationDetector } from './HallucinationDetector';
import { ConfidenceScorer } from './ConfidenceScorer';

export class AIValidator {
  private config: AIValidatorConfig;
  private queryClassifier: QueryClassifier;
  private accuracyChecker: AccuracyChecker;
  private hallucinationDetector: HallucinationDetector;
  private confidenceScorer: ConfidenceScorer;

  constructor(config: AIValidatorConfig) {
    // Set defaults for optional config
    this.config = {
      confidenceThreshold: 0.7,
      enableQueryClassification: true,
      enableAccuracyCheck: true,
      enableHallucinationDetection: true,
      openaiModel: 'gpt-4o',
      claudeModel: 'claude-sonnet-4-5-20250929',
      ...config
    };

    // Validate required configuration
    this.validateConfig();

    // Initialize components
    this.queryClassifier = new QueryClassifier();
    this.accuracyChecker = new AccuracyChecker(this.config.openaiApiKey, this.config.claudeApiKey);
    this.hallucinationDetector = new HallucinationDetector(this.config.openaiApiKey, this.config.claudeApiKey);
    this.confidenceScorer = new ConfidenceScorer();
  }

  async validate(input: ValidationInput): Promise<ValidationResult> {
    try {
      // Step 1: Query Classification
      if (this.config.enableQueryClassification) {
        const classification = await this.queryClassifier.classifyQuery(input.query);
        
        if (classification.skip_validation) {
          return {
            confidence: 1.0,
            valid: true,
            accuracy: { verified: true, verification_rate: 1.0 },
            context: { source_relevance: 1.0, source_usage_rate: 1.0, valid: true },
            hallucination: { detected: false, risk: 0 },
            warnings: [],
            query_type: classification.type,
            skip_validation: true
          };
        }
      }

      // Step 2: Run validations in parallel
      const [accuracyResult, contextResult, hallucinationResult] = await Promise.all([
        this.config.enableAccuracyCheck ? 
          this.accuracyChecker.checkAccuracy(input.response, input.sources, this.config.llmProvider, this.getModel()) :
          Promise.resolve({ verified: true, verification_rate: 1.0 }),
        
        this.calculateContextRelevance(input.query, input.response, input.sources),
        
        this.config.enableHallucinationDetection ?
          this.hallucinationDetector.detectHallucination(input.response, input.sources, this.config.llmProvider, this.getModel()) :
          Promise.resolve({ detected: false, risk: 0 })
      ]);

      // Step 3: Calculate confidence
      const confidenceResult = this.confidenceScorer.calculateConfidence(
        accuracyResult,
        contextResult,
        hallucinationResult,
        input.sources
      );

      // Step 4: Generate warnings
      const warnings = this.generateWarnings(accuracyResult, contextResult, hallucinationResult, input.sources);

      // Step 5: Determine if valid
      const valid = confidenceResult.confidence_score >= (this.config.confidenceThreshold || 0.7);

      return {
        confidence: confidenceResult.confidence_score,
        valid,
        accuracy: accuracyResult,
        context: contextResult,
        hallucination: hallucinationResult,
        warnings
      };

    } catch (error) {
      return {
        confidence: 0,
        valid: false,
        accuracy: { verified: false, verification_rate: 0, reason: 'validation_error' },
        context: { source_relevance: 0, source_usage_rate: 0, valid: false },
        hallucination: { detected: true, risk: 1.0 },
        warnings: [`Validation failed: ${error instanceof Error ? error.message : 'unknown error'}`]
      };
    }
  }

  private validateConfig(): void {
    if (!this.config.openaiApiKey && !this.config.claudeApiKey) {
      throw new Error('At least one API key (OpenAI or Claude) must be provided');
    }

    if (this.config.llmProvider === 'openai' && !this.config.openaiApiKey) {
      throw new Error('OpenAI API key is required when using OpenAI provider');
    }

    if (this.config.llmProvider === 'claude' && !this.config.claudeApiKey) {
      throw new Error('Claude API key is required when using Claude provider');
    }
  }

  private async calculateContextRelevance(query: string, response: string, sources: any[]): Promise<any> {
    // Simple context relevance calculation
    // In a more sophisticated implementation, this could use embeddings
    
    if (sources.length === 0) {
      return {
        source_relevance: 0,
        source_usage_rate: 0,
        valid: false
      };
    }

    // Context relevance: Check if response is grounded in sources
    const cleanResponse = response.toLowerCase().replace(/[^\w\s]/g, '');
    const sourceContent = sources.map(s => s.content.toLowerCase().replace(/[^\w\s]/g, '')).join(' ');
    const responseWords = cleanResponse.split(/\s+/).filter(word => word.length > 3);
    const sourceWords = sourceContent.split(/\s+/).filter(word => word.length > 3);
    
    // Check how many response words appear in sources
    let wordsInSource = 0;
    for (const word of responseWords) {
      if (sourceWords.includes(word)) {
        wordsInSource++;
      }
    }

    // Source relevance: % of response words that appear in sources
    const sourceRelevance = responseWords.length > 0 ? wordsInSource / responseWords.length : 0.5;
    
    // Source usage rate: Check if query keywords appear in response
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, '');
    const queryWords = cleanQuery.split(/\s+/).filter(word => word.length > 2);
    let queryWordsInResponse = 0;
    for (const word of queryWords) {
      if (responseWords.includes(word)) {
        queryWordsInResponse++;
      }
    }
    const sourceUsageRate = queryWords.length > 0 ? queryWordsInResponse / queryWords.length : 0.5;

    return {
      source_relevance: Math.min(sourceRelevance, 1.0),
      source_usage_rate: sourceUsageRate,
      valid: sourceRelevance > 0.3
    };
  }

  private getModel(): string {
    if (this.config.llmProvider === 'openai') {
      return this.config.openaiModel || 'gpt-4o';
    } else {
      return this.config.claudeModel || 'claude-sonnet-4-5-20250929';
    }
  }

  private generateWarnings(accuracyResult: any, contextResult: any, hallucinationResult: any, sources: any[]): string[] {
    const warnings: string[] = [];

    if (sources.length === 0) {
      warnings.push('No sources provided - high hallucination risk');
    }

    if (accuracyResult.verification_rate < 0.5) {
      warnings.push('Low accuracy verification rate');
    }

    if (contextResult.source_relevance < 0.3) {
      warnings.push('Low context relevance');
    }

    if (hallucinationResult.risk > 0.5) {
      warnings.push('High hallucination risk detected');
    }

    if (hallucinationResult.detected) {
      warnings.push('Hallucination detected in response');
    }

    return warnings;
  }
}
