export interface Source {
  content: string;
  title?: string;
  url?: string;
  id?: string;
}

export interface ValidationInput {
  query: string;
  response: string;
  sources: Source[];
}

export interface AccuracyResult {
  verified: boolean;
  verification_rate: number;
  reason?: string;
}

export interface ContextResult {
  source_relevance: number;
  source_usage_rate: number;
  valid: boolean;
}

export interface HallucinationResult {
  detected: boolean;
  risk: number;
  hallucinated_parts?: string[];
}

export interface ConfidenceResult {
  confidence_score: number;
  level: 'high' | 'medium' | 'low';
  breakdown: {
    accuracy_score: number;
    context_score: number;
    hallucination_score: number;
    source_quality: number;
  };
}

export interface ValidationResult {
  confidence: number;
  valid: boolean;
  accuracy: AccuracyResult;
  context: ContextResult;
  hallucination: HallucinationResult;
  warnings: string[];
  query_type?: string;
  skip_validation?: boolean;
}

export interface AIValidatorConfig {
  openaiApiKey?: string;
  claudeApiKey?: string;
  llmProvider: 'openai' | 'claude';
  confidenceThreshold?: number;
  enableQueryClassification?: boolean;
  enableAccuracyCheck?: boolean;
  enableHallucinationDetection?: boolean;
  openaiModel?: string;
  claudeModel?: string;
}

export interface QueryClassificationResult {
  type: 'greeting' | 'typo' | 'small_talk' | 'question' | 'command' | 'clarification';
  confidence: number;
  skip_validation: boolean;
}
