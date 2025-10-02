import { QueryClassificationResult } from './types';

export class QueryClassifier {
  private patterns = {
    greeting: /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|sup|what's up)/i,
    typo: /(helo|whta|thnak|recieve|seperate|occured|definately|accomodate|begining|neccessary)/i,
    small_talk: /^(how are you|what's up|nice weather|how's it going|how's your day)/i,
    clarification: /^(what do you mean|can you repeat|can you explain|i don't understand|what does that mean)/i,
    meta: /^(what can you help with|what's your name|who are you|what are you|what do you do)/i
  };

  async classifyQuery(query: string): Promise<QueryClassificationResult> {
    const trimmedQuery = query.trim().toLowerCase();
    
    // Check patterns first
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(trimmedQuery)) {
        return {
          type: type as any,
          confidence: 0.9,
          skip_validation: ['greeting', 'typo', 'small_talk', 'meta'].includes(type)
        };
      }
    }

    // Check for very short queries (likely greetings or typos)
    if (trimmedQuery.length <= 10) {
      return {
        type: 'greeting',
        confidence: 0.7,
        skip_validation: true
      };
    }

    // Check for question patterns
    if (trimmedQuery.includes('?') || trimmedQuery.startsWith('how') || trimmedQuery.startsWith('what') || 
        trimmedQuery.startsWith('when') || trimmedQuery.startsWith('where') || trimmedQuery.startsWith('why') ||
        trimmedQuery.startsWith('who') || trimmedQuery.startsWith('which')) {
      return {
        type: 'question',
        confidence: 0.8,
        skip_validation: false
      };
    }

    // Default to question if no pattern matches
    return {
      type: 'question',
      confidence: 0.6,
      skip_validation: false
    };
  }
}
