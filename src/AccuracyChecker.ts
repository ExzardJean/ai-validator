import { AccuracyResult, Source } from './types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class AccuracyChecker {
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

  async checkAccuracy(response: string, sources: Source[], llmProvider: 'openai' | 'claude', model?: string): Promise<AccuracyResult> {
    // If no sources, return low accuracy
    if (sources.length === 0) {
      return {
        verified: false,
        verification_rate: 0,
        reason: 'no_sources_provided'
      };
    }

    // Combine all source content
    const sourceContent = sources.map(s => s.content).join('\n\n');

    try {
      if (llmProvider === 'openai' && this.openai) {
        return await this.checkAccuracyWithOpenAI(response, sourceContent, model);
      } else if (llmProvider === 'claude' && this.claude) {
        return await this.checkAccuracyWithClaude(response, sourceContent, model);
      } else {
        throw new Error(`LLM provider ${llmProvider} not available`);
      }
    } catch (error) {
      return {
        verified: false,
        verification_rate: 0,
        reason: `accuracy_check_failed: ${error instanceof Error ? error.message : 'unknown error'}`
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

  private async checkAccuracyWithOpenAI(response: string, sourceContent: string, model?: string): Promise<AccuracyResult> {
    const prompt = `You are an accuracy checker. Your job is to verify if the AI response is accurate based on the provided sources.

Sources:
${sourceContent}

AI Response:
${response}

Analyze the AI response and determine:
1. Are the facts in the response supported by the sources?
2. Are there any claims that cannot be verified from the sources?
3. What percentage of the response is verifiable?

IMPORTANT: A response is considered accurate if it contains correct information from the sources, even if it doesn't include every detail. Partial information is still accurate information.

Respond with a JSON object in this exact format:
{
  "verified": true/false,
  "verification_rate": 0.0-1.0,
  "reason": "brief explanation"
}`;

    console.log('→ Accuracy Check (OpenAI -', (model || 'gpt-4o') + ')');

    const completion = await this.openai!.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an accuracy checker. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const rawResponse = completion.choices[0].message.content || '{}';
    const result = this.parseLLMResponse(rawResponse);
    console.log('  ✓ Verified:', result.verified, '| Rate:', result.verification_rate);
    
    return {
      verified: result.verified || false,
      verification_rate: result.verification_rate || 0,
      reason: result.reason
    };
  }

  private async checkAccuracyWithClaude(response: string, sourceContent: string, model?: string): Promise<AccuracyResult> {
    const prompt = `You are an accuracy checker. Your job is to verify if the AI response is accurate based on the provided sources.

Sources:
${sourceContent}

AI Response:
${response}

Analyze the AI response and determine:
1. Are the facts in the response supported by the sources?
2. Are there any claims that cannot be verified from the sources?
3. What percentage of the response is verifiable?

IMPORTANT: A response is considered accurate if it contains correct information from the sources, even if it doesn't include every detail. Partial information is still accurate information.

Respond with a JSON object in this exact format:
{
  "verified": true/false,
  "verification_rate": 0.0-1.0,
  "reason": "brief explanation"
}`;

    console.log('→ Accuracy Check (Claude -', (model || 'claude-sonnet-4-5-20250929') + ')');

    const message = await this.claude!.messages.create({
      model: model || 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.0,
      system: 'You are an accuracy checker. Always respond with valid JSON only. Never include markdown formatting or code blocks.',
      messages: [{ role: 'user', content: prompt }]
    });

    const result = this.parseLLMResponse(message.content[0].type === 'text' ? message.content[0].text : '{}');
    console.log('  ✓ Verified:', result.verified, '| Rate:', result.verification_rate);
    
    return {
      verified: result.verified || false,
      verification_rate: result.verification_rate || 0,
      reason: result.reason
    };
  }
}
