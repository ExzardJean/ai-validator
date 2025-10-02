import { ConfidenceResult, AccuracyResult, ContextResult, HallucinationResult, Source } from './types';

export class ConfidenceScorer {
  calculateConfidence(
    accuracyResult: AccuracyResult,
    contextResult: ContextResult,
    hallucinationResult: HallucinationResult,
    sources: Source[]
  ): ConfidenceResult {
    // Define weights for different factors
    const weights = {
      accuracy: 0.35,
      context: 0.25,
      hallucination: 0.30,
      sourceQuality: 0.10
    };

    // Calculate individual scores
    const accuracyScore = accuracyResult.verification_rate;
    const contextScore = contextResult.source_relevance;
    const hallucinationScore = 1 - hallucinationResult.risk; // Invert risk to get score
    const sourceQualityScore = this.calculateSourceQuality(sources);

    // Calculate weighted confidence score
    const confidenceScore = 
      (accuracyScore * weights.accuracy) +
      (contextScore * weights.context) +
      (hallucinationScore * weights.hallucination) +
      (sourceQualityScore * weights.sourceQuality);

    console.log('→ Confidence Score:', (confidenceScore * 100).toFixed(1) + '%',
                '(Accuracy:', (accuracyScore * 100).toFixed(0) + '%,',
                'Context:', (contextScore * 100).toFixed(0) + '%,',
                'Hallucination:', (hallucinationScore * 100).toFixed(0) + '%)\n');

    // Determine confidence level
    let level: 'high' | 'medium' | 'low';
    if (confidenceScore >= 0.8) {
      level = 'high';
    } else if (confidenceScore >= 0.5) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      confidence_score: Math.round(confidenceScore * 100) / 100, // Round to 2 decimal places
      level,
      breakdown: {
        accuracy_score: Math.round(accuracyScore * 100) / 100,
        context_score: Math.round(contextScore * 100) / 100,
        hallucination_score: Math.round(hallucinationScore * 100) / 100,
        source_quality: Math.round(sourceQualityScore * 100) / 100
      }
    };
  }

  private calculateSourceQuality(sources: Source[]): number {
    if (sources.length === 0) {
      return 0;
    }

    let totalQuality = 0;
    for (const source of sources) {
      let quality = 0.5; // Base quality

      // Length factor (longer content is generally better)
      if (source.content.length > 100) quality += 0.2;
      if (source.content.length > 500) quality += 0.2;

      // Title factor
      if (source.title && source.title.length > 0) quality += 0.1;

      // Cap at 1.0
      quality = Math.min(quality, 1.0);
      totalQuality += quality;
    }

    return totalQuality / sources.length;
  }
}
