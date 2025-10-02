#!/usr/bin/env node

import inquirer from 'inquirer';
import { AIValidator } from '../src/AIValidator';
import { Source } from '../src/types';

async function testValidation() {
  console.log('🧪 AI Validator Test\n');

  try {
    // Step 1: Configuration
    console.log('📋 Configuration Setup');
    console.log('=' .repeat(30));
    
    const configAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Choose LLM provider:',
        choices: [
          { name: 'OpenAI', value: 'openai' },
          { name: 'Claude', value: 'claude' }
        ],
        default: 'openai'
      },
            {
              type: 'input',
              name: 'openaiKey',
              message: 'Enter OpenAI API key:',
              when: (answers: any) => answers.provider === 'openai'
            },
            {
              type: 'input',
              name: 'claudeKey',
              message: 'Enter Claude API key:',
              when: (answers: any) => answers.provider === 'claude'
            },
      {
        type: 'number',
        name: 'threshold',
        message: 'Set confidence threshold (0.0 - 1.0):',
        default: 0.7,
        validate: (input: number) => input >= 0 && input <= 1 || 'Threshold must be between 0.0 and 1.0'
      },
      {
        type: 'confirm',
        name: 'enableQueryClassification',
        message: 'Enable query classification (skip validation for greetings/typos)?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableAccuracyCheck',
        message: 'Enable accuracy checking?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableHallucinationDetection',
        message: 'Enable hallucination detection?',
        default: true
      },
      {
        type: 'list',
        name: 'openaiModel',
        message: 'Choose OpenAI model:',
        choices: [
          { name: 'GPT-4o', value: 'gpt-4o' },
          { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
          { name: 'GPT-4', value: 'gpt-4' }
        ],
        default: 'gpt-4o',
        when: (answers: any) => answers.provider === 'openai'
      },
      {
        type: 'list',
        name: 'claudeModel',
        message: 'Choose Claude model:',
        choices: [
          { name: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
          { name: 'Claude Opus 4.1', value: 'claude-opus-4-1-20250805' },
          { name: 'Claude Sonnet 3.7', value: 'claude-3-7-sonnet-20250219' }
        ],
        default: 'claude-sonnet-4-5-20250929',
        when: (answers: any) => answers.provider === 'claude'
      }
    ]);

    // Step 2: Initialize validator with user config
    console.log('\n🔧 Initializing AI Validator...');
    
    const validatorConfig: any = {
      llmProvider: configAnswers.provider,
      confidenceThreshold: configAnswers.threshold,
      enableQueryClassification: configAnswers.enableQueryClassification,
      enableAccuracyCheck: configAnswers.enableAccuracyCheck,
      enableHallucinationDetection: configAnswers.enableHallucinationDetection
    };

    if (configAnswers.openaiKey) {
      validatorConfig.openaiApiKey = configAnswers.openaiKey;
      validatorConfig.openaiModel = configAnswers.openaiModel;
    }

    if (configAnswers.claudeKey) {
      validatorConfig.claudeApiKey = configAnswers.claudeKey;
      validatorConfig.claudeModel = configAnswers.claudeModel;
    }

    const validator = new AIValidator(validatorConfig);
    console.log('✅ AI Validator initialized successfully\n');

    // Step 3: Test validation
    console.log('🧪 Validation Test');
    console.log('=' .repeat(30));
    
    const testAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter your query:',
        validate: (input: string) => input.trim().length > 0 || 'Query cannot be empty'
      },
      {
        type: 'input',
        name: 'response',
        message: 'Enter AI response:',
        validate: (input: string) => input.trim().length > 0 || 'Response cannot be empty'
      },
      {
        type: 'input',
        name: 'sources',
        message: 'Enter source content (or press Enter for no sources):',
        default: '',
        validate: (input: string) => true // Allow empty
      }
    ]);

    // Parse sources
    let sources: Source[] = [];
    if (testAnswers.sources.trim()) {
      sources = [{
        content: testAnswers.sources.trim(),
        title: 'User Input'
      }];
    }

    console.log('\n🔍 Validating...\n');

    // Run validation
    const validation = await validator.validate({
      query: testAnswers.query,
      response: testAnswers.response,
      sources: sources
    });

    // Display results
    console.log('📊 Validation Results:');
    console.log('=' .repeat(30));
    console.log(`Confidence Score: ${(validation.confidence * 100).toFixed(1)}%`);
    console.log(`Valid: ${validation.valid ? '✅ Yes' : '❌ No'}`);
    
    if (validation.query_type) {
      console.log(`Query Type: ${validation.query_type}`);
    }
    
    if (validation.skip_validation) {
      console.log('Skip Validation: ✅ Yes (greeting/typo detected)');
    }

    console.log('\n📈 Detailed Breakdown:');
    console.log('-'.repeat(30));
    console.log(`Accuracy: ${validation.accuracy.verified ? '✅ Verified' : '❌ Not verified'} (${(validation.accuracy.verification_rate * 100).toFixed(1)}%)`);
    console.log(`Context Relevance: ${(validation.context.source_relevance * 100).toFixed(1)}%`);
    console.log(`Hallucination Risk: ${(validation.hallucination.risk * 100).toFixed(1)}% ${validation.hallucination.detected ? '⚠️  Detected' : '✅ None'}`);

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }

    if (validation.hallucination.hallucinated_parts && validation.hallucination.hallucinated_parts.length > 0) {
      console.log('\n🚨 Hallucinated Parts:');
      validation.hallucination.hallucinated_parts.forEach(part => {
        console.log(`  • ${part}`);
      });
    }

    console.log('\n🎯 Recommendation:');
    if (validation.valid) {
      console.log('✅ This response is reliable and can be shown to users.');
    } else {
      console.log('❌  This response has low confidence and should be reviewed or not shown to users.');
    }

    // Ask if user wants to test another
    const { testAgain } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'testAgain',
        message: '\nDo you want to test another validation?',
        default: false
      }
    ]);

    if (testAgain) {
      await testValidation();
    } else {
      console.log('\n👋 Thanks for testing AI Validator!');
      console.log('\n💡 To use in your code:');
      console.log('```typescript');
      console.log('import { AIValidator } from "@vezlo/ai-validator";');
      console.log('');
      console.log('const validator = new AIValidator({');
      console.log('  openaiApiKey: "sk-your-key",');
      console.log('  llmProvider: "openai",');
      console.log('  confidenceThreshold: 0.8');
      console.log('});');
      console.log('```');
    }

  } catch (error) {
    console.error('❌  Test failed:', error instanceof Error ? error.message : 'unknown error');
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('\n💡 Make sure you have valid API keys for the selected provider.');
    }
    
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testValidation();
}