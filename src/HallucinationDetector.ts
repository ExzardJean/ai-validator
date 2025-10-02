import { HallucinationResult, Source } from './types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class HallucinationDetector {
  private openai?: OpenAI;
  private claude?: Anthropic;

  constructor(openaiApiKey?: string, claudeApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
    if (claudeApiKey) {
      this.claude = new Anthropic({ apiKey: claudeApiKey });
    }
  }

  async detectHallucination(response: string, sources: Source[], llmProvider: 'openai' | 'claude', model?: string): Promise<HallucinationResult> {
    // If no sources, high hallucination risk
    if (sources.length === 0) {
      return {
        detected: true,
        risk: 0.8,
        hallucinated_parts: ['entire_response']
      };
    }

    // Combine all source content
    const sourceContent = sources.map(s => s.content).join('\n\n');

    try {
      if (llmProvider === 'openai' && this.openai) {
        return await this.detectHallucinationWithOpenAI(response, sourceContent, model);
      } else if (llmProvider === 'claude' && this.claude) {
        return await this.detectHallucinationWithClaude(response, sourceContent, model);
      } else {
        throw new Error(`LLM provider ${llmProvider} not available`);
      }
    } catch (error) {
      console.error('Hallucination detection error:', error);
      return {
        detected: true,
        risk: 0.9,
        hallucinated_parts: ['hallucination_check_failed']
      };
    }
  }

  private parseLLMResponse(content: string): any {
    try {
      // Try to parse as-is first
      return JSON.parse(content);
    } catch {
      try {
        // Remove markdown code blocks if present
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        // If all else fails, return empty object
        console.warn('Failed to parse LLM response as JSON:', content);
        return {};
      }
    }
  }

  private async detectHallucinationWithOpenAI(response: string, sourceContent: string, model?: string): Promise<HallucinationResult> {
    const prompt = `You are a strict hallucination detector. Compare the AI response against the sources.

**Sources:**
${sourceContent}

**AI Response:**
${response}

**Critical Rules:**
1. If the response discusses topics/concepts NOT in the sources → HALLUCINATED
2. If the response contains facts NOT mentioned in sources → HALLUCINATED
3. If response contradicts sources → HALLUCINATED
4. Only if response uses information FROM the sources (even partially) → NOT hallucinated

**Examples:**
✓ Source: "GPT is a language model", Response: "GPT is a language model" → NOT hallucinated
✓ Source: "GPT is a language model", Response: "GPT is a model" → NOT hallucinated (partial)
✗ Source: "GPT is a language model", Response: "Machine learning uses algorithms" → HALLUCINATED (different topic)
✗ Source: "GPT uses transformers", Response: "GPT uses neural networks" → HALLUCINATED (not in source)

You MUST respond with this exact JSON structure:
{"detected": true/false, "risk": 0.0-1.0, "hallucinated_parts": []}

Response:`;

    console.log('→ Hallucination Detection (OpenAI -', (model || 'gpt-4o') + ')');

    const completion = await this.openai!.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a hallucination detector. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const rawResponse = completion.choices[0].message.content || '{}';
    const result = this.parseLLMResponse(rawResponse);
    console.log('  ✓ Detected:', result.detected, '| Risk:', result.risk);
    
    return {
      detected: result.detected || false,
      risk: result.risk || 0,
      hallucinated_parts: result.hallucinated_parts || []
    };
  }

  private async detectHallucinationWithClaude(response: string, sourceContent: string, model?: string): Promise<HallucinationResult> {
    const prompt = `You are a strict hallucination detector. Compare the AI response against the sources.

**Sources:**
${sourceContent}

**AI Response:**
${response}

**Critical Rules:**
1. If the response discusses topics/concepts NOT in the sources → HALLUCINATED
2. If the response contains facts NOT mentioned in sources → HALLUCINATED
3. If response contradicts sources → HALLUCINATED
4. Only if response uses information FROM the sources (even partially) → NOT hallucinated

**Examples:**
✓ Source: "GPT is a language model", Response: "GPT is a language model" → NOT hallucinated
✓ Source: "GPT is a language model", Response: "GPT is a model" → NOT hallucinated (partial)
✗ Source: "GPT is a language model", Response: "Machine learning uses algorithms" → HALLUCINATED (different topic)
✗ Source: "GPT uses transformers", Response: "GPT uses neural networks" → HALLUCINATED (not in source)

You MUST respond with this exact JSON structure:
{"detected": true/false, "risk": 0.0-1.0, "hallucinated_parts": []}

Response:`;

    console.log('→ Hallucination Detection (Claude -', (model || 'claude-sonnet-4-5-20250929') + ')');

    const message = await this.claude!.messages.create({
      model: model || 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.0,
      system: 'You are a hallucination detector. Always respond with valid JSON only. Never include markdown formatting or code blocks.',
      messages: [{ role: 'user', content: prompt }]
    });

    const rawResponse = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const result = this.parseLLMResponse(rawResponse);
    console.log('  ✓ Detected:', result.detected, '| Risk:', result.risk);
    
    return {
      detected: result.detected || false,
      risk: result.risk || 0,
      hallucinated_parts: result.hallucinated_parts || []
    };
  }
}
