import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Configuration
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;

// Types for AI requests
export interface AIMessageContext {
  parentId?: string;
  paymentId?: string;
  messageType: 'payment_reminder' | 'welcome' | 'practice_reminder' | 'general' | 'overdue_notice';
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  channel: 'email' | 'sms';
}

export interface AIGeneratedMessage {
  subject: string;
  body: string;
  reasoning: string;
  suggestions: string[];
}

export interface AIInsight {
  summary: string;
  keyMetrics: Record<string, any>;
  recommendations: string[];
  riskFactors: string[];
  actionItems: string[];
}

// Core AI completion function
export async function generateCompletion({
  messages,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
  responseFormat,
}: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}) {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    });

    return {
      success: true,
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI generation failed',
    };
  }
}

// Generate personalized messages
export async function generateMessage({
  context,
  parentData,
  paymentData,
  customInstructions,
  includePersonalization = true,
}: {
  context: AIMessageContext;
  parentData?: any;
  paymentData?: any;
  customInstructions?: string;
  includePersonalization?: boolean;
}): Promise<{ success: boolean; message?: AIGeneratedMessage; error?: string }> {
  try {
    const systemPrompt = `You are an expert communication specialist for Rise as One Basketball Program. Generate professional, personalized messages for parents.

    Key Guidelines:
    - Use ${context.tone} tone
    - Format for ${context.channel}
    - Message type: ${context.messageType}
    - Be clear, concise, and action-oriented
    - Include specific details when available
    - Maintain the program's supportive, community-focused brand voice

    ${context.channel === 'sms' ? 'Keep SMS messages under 160 characters when possible.' : 'For emails, use plain text formatting with clear structure. Do NOT include HTML, CSS, or any markup - only clean, readable plain text.'}`;

    let contextInfo = '';
    if (parentData) {
      contextInfo += `Parent: ${parentData.name} (${parentData.email})\n`;
      if (parentData.phone) contextInfo += `Phone: ${parentData.phone}\n`;
    }

    if (paymentData) {
      contextInfo += `Payment Amount: $${paymentData.amount}\n`;
      contextInfo += `Due Date: ${new Date(paymentData.dueDate).toLocaleDateString()}\n`;
      contextInfo += `Status: ${paymentData.status}\n`;
    }

    const userPrompt = `Generate a ${context.messageType} message with the following context:

    ${contextInfo}

    ${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

    ${includePersonalization ? 'Include personalization based on the parent and payment data.' : 'Keep the message generic but professional.'}

    Return the response as JSON with this exact format:
    {
      "subject": "Email subject line or SMS preview",
      "body": "Complete message content",
      "reasoning": "Brief explanation of personalization choices",
      "suggestions": ["Alternative subject 1", "Alternative subject 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const message = JSON.parse(result.content) as AIGeneratedMessage;
    return { success: true, message };

  } catch (error) {
    console.error('Message generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate message',
    };
  }
}

// Generate payment insights
export async function generatePaymentInsights(paymentData: any[]): Promise<{ success: boolean; insights?: AIInsight; error?: string }> {
  try {
    const systemPrompt = `You are a financial analyst specializing in payment management for sports programs. Analyze payment data and provide actionable insights.

    Focus on:
    - Payment collection rates and trends
    - Risk assessment for overdue accounts
    - Revenue optimization opportunities
    - Parent engagement patterns
    - Seasonal payment behaviors`;

    const userPrompt = `Analyze the following payment data for Rise as One Basketball Program:

    ${JSON.stringify(paymentData, null, 2)}

    Provide insights as JSON with this format:
    {
      "summary": "Executive summary of payment performance",
      "keyMetrics": {
        "collectionRate": number,
        "averagePaymentTime": number,
        "overdueCount": number,
        "totalRevenue": number
      },
      "recommendations": ["Actionable recommendation 1", "Recommendation 2"],
      "riskFactors": ["Risk factor 1", "Risk factor 2"],
      "actionItems": ["Immediate action 1", "Action 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const insights = JSON.parse(result.content) as AIInsight;
    return { success: true, insights };

  } catch (error) {
    console.error('Payment insights error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate payment insights',
    };
  }
}

// Generate dashboard insights
export async function generateDashboardInsights(dashboardData: any): Promise<{ success: boolean; insights?: AIInsight; error?: string }> {
  try {
    const systemPrompt = `You are a business intelligence analyst for sports program management. Analyze dashboard metrics and provide strategic insights.

    Focus on:
    - Overall program health and growth
    - Parent engagement and satisfaction indicators
    - Revenue trends and forecasting
    - Operational efficiency metrics
    - Areas for improvement and growth opportunities`;

    const userPrompt = `Analyze this dashboard data for Rise as One Basketball Program:

    ${JSON.stringify(dashboardData, null, 2)}

    Provide strategic insights as JSON:
    {
      "summary": "Overall program performance summary",
      "keyMetrics": {
        "programHealth": "excellent|good|fair|needs_attention",
        "growthTrend": "growing|stable|declining",
        "parentSatisfaction": "high|medium|low"
      },
      "recommendations": ["Strategic recommendation 1", "Recommendation 2"],
      "riskFactors": ["Business risk 1", "Risk 2"],
      "actionItems": ["Priority action 1", "Action 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const insights = JSON.parse(result.content) as AIInsight;
    return { success: true, insights };

  } catch (error) {
    console.error('Dashboard insights error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate dashboard insights',
    };
  }
}

// Analyze parent profile
export async function analyzeParent(parentData: any): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const systemPrompt = `You are a customer relationship specialist for sports programs. Analyze parent profiles to improve engagement and communication.

    Focus on:
    - Payment behavior patterns
    - Communication preferences
    - Engagement level with the program
    - Risk assessment for retention
    - Personalized communication recommendations`;

    const userPrompt = `Analyze this parent profile:

    ${JSON.stringify(parentData, null, 2)}

    Provide analysis as JSON:
    {
      "riskLevel": "low|medium|high",
      "engagementScore": number,
      "paymentBehavior": "excellent|good|concerning|poor",
      "communicationStyle": "preferred channel and tone recommendations",
      "recommendations": ["Personalized recommendation 1", "Recommendation 2"],
      "nextActions": ["Immediate action 1", "Action 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analysis = JSON.parse(result.content);
    return { success: true, analysis };

  } catch (error) {
    console.error('Parent analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze parent profile',
    };
  }
}

// Contract analysis
export async function analyzeContract(contractText: string): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const systemPrompt = `You are a legal document analyst specializing in sports program contracts. Analyze contracts for key terms, risks, and compliance.

    Focus on:
    - Payment terms and schedules
    - Liability and insurance clauses
    - Cancellation and refund policies
    - Program requirements and expectations
    - Legal compliance and risk factors`;

    const userPrompt = `Analyze this contract for Rise as One Basketball Program:

    ${contractText}

    Provide analysis as JSON:
    {
      "summary": "Contract overview and key terms",
      "paymentTerms": {
        "totalAmount": "extracted amount if found",
        "schedule": "payment schedule details",
        "penalties": "late payment or cancellation penalties"
      },
      "keyRisks": ["Risk 1", "Risk 2"],
      "compliance": {
        "status": "compliant|needs_review|non_compliant",
        "issues": ["Issue 1 if any"]
      },
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analysis = JSON.parse(result.content);
    return { success: true, analysis };

  } catch (error) {
    console.error('Contract analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze contract',
    };
  }
}

// Writing assistance functions
export async function improveText(text: string, instructions?: string): Promise<{ success: boolean; improvedText?: string; error?: string }> {
  try {
    const systemPrompt = `You are a professional writing assistant specializing in clear, effective communication for sports programs.

    Improve the provided text by:
    - Enhancing clarity and readability
    - Maintaining the original tone and intent
    - Correcting grammar and style issues
    - Making it more engaging and professional`;

    const userPrompt = `Improve this text: "${text}"

    ${instructions ? `Additional instructions: ${instructions}` : ''}

    Return only the improved text, maintaining the original meaning and tone.`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, improvedText: result.content };

  } catch (error) {
    console.error('Text improvement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to improve text',
    };
  }
}

export async function summarizeText(text: string, maxLength?: number): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    const systemPrompt = `You are a professional summarization assistant. Create concise, accurate summaries that capture the key points.`;

    const userPrompt = `Summarize this text${maxLength ? ` in approximately ${maxLength} words` : ''}:

    ${text}

    Focus on the most important information and key takeaways.`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, summary: result.content };

  } catch (error) {
    console.error('Text summarization error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize text',
    };
  }
}

export async function completeText(text: string, context?: string): Promise<{ success: boolean; completion?: string; error?: string }> {
  try {
    const systemPrompt = `You are a writing completion assistant. Complete the provided text naturally and coherently, maintaining the established tone and style.`;

    const userPrompt = `Complete this text naturally:

    ${text}

    ${context ? `Context: ${context}` : ''}

    Continue writing in the same tone and style, providing a natural completion.`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, completion: result.content };

  } catch (error) {
    console.error('Text completion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete text',
    };
  }
}

// Generate writing suggestions
export async function generateWritingSuggestions(text: string): Promise<{ success: boolean; suggestions?: string[]; error?: string }> {
  try {
    const systemPrompt = `You are a writing coach providing helpful suggestions to improve communication effectiveness.

    Provide specific, actionable suggestions for improvement.`;

    const userPrompt = `Provide writing suggestions for this text:

    "${text}"

    Return suggestions as JSON array:
    {
      "suggestions": ["Specific suggestion 1", "Suggestion 2", "Suggestion 3"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const response = JSON.parse(result.content);
    return { success: true, suggestions: response.suggestions };

  } catch (error) {
    console.error('Writing suggestions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate writing suggestions',
    };
  }
}

// Workflow automation
export async function generateWorkflowRecommendations(data: any): Promise<{ success: boolean; recommendations?: any; error?: string }> {
  try {
    const systemPrompt = `You are a workflow optimization expert for sports program management. Analyze data and recommend automation opportunities.

    Focus on:
    - Repetitive task identification
    - Communication automation opportunities
    - Payment collection optimization
    - Parent engagement improvements
    - Operational efficiency gains`;

    const userPrompt = `Analyze this program data and recommend workflow automations:

    ${JSON.stringify(data, null, 2)}

    Provide recommendations as JSON:
    {
      "automationOpportunities": ["Opportunity 1", "Opportunity 2"],
      "priorityActions": ["High-impact action 1", "Action 2"],
      "estimatedTimeSavings": "X hours per week",
      "implementationSteps": ["Step 1", "Step 2"],
      "riskMitigation": ["Risk mitigation 1", "Mitigation 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const recommendations = JSON.parse(result.content);
    return { success: true, recommendations };

  } catch (error) {
    console.error('Workflow recommendations error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate workflow recommendations',
    };
  }
}

// Bulk operations AI assistance
export async function generateBulkOperationPlan(operation: string, data: any[]): Promise<{ success: boolean; plan?: any; error?: string }> {
  try {
    const systemPrompt = `You are an operations planning specialist. Create efficient, safe plans for bulk operations on parent and payment data.

    Focus on:
    - Data validation and safety checks
    - Batch processing optimization
    - Error handling and rollback procedures
    - Communication impact assessment
    - Success metrics and monitoring`;

    const userPrompt = `Create a bulk operation plan for: ${operation}

    Data sample: ${JSON.stringify(data.slice(0, 3), null, 2)}
    Total records: ${data.length}

    Provide plan as JSON:
    {
      "operationSummary": "What will be done",
      "safetyChecks": ["Check 1", "Check 2"],
      "batchSize": number,
      "estimatedTime": "X minutes",
      "riskAssessment": "low|medium|high",
      "rollbackPlan": "How to undo if needed",
      "successMetrics": ["Metric 1", "Metric 2"]
    }`;

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const plan = JSON.parse(result.content);
    return { success: true, plan };

  } catch (error) {
    console.error('Bulk operation planning error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate bulk operation plan',
    };
  }
}

// Streaming AI responses (for real-time chat)
export async function streamCompletion({
  messages,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
  onChunk,
}: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
}) {
  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        onChunk?.(content);
      }
    }

    return {
      success: true,
      content: fullContent,
    };
  } catch (error) {
    console.error('Streaming completion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Streaming failed',
    };
  }
}

// Utility functions
export function calculateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function truncateForContext(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  
  return text.slice(0, maxChars - 100) + '... [truncated for context length]';
}

export function formatAIError(error: any): string {
  if (error?.error?.code === 'rate_limit_exceeded') {
    return 'AI service is temporarily busy. Please try again in a moment.';
  }
  
  if (error?.error?.code === 'invalid_api_key') {
    return 'AI service configuration error. Please contact support.';
  }
  
  return 'AI service temporarily unavailable. Please try again later.';
} 