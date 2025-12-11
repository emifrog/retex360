import OpenAI from 'openai';

// Configuration OpenRouter - compatible avec l'API OpenAI
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'RETEX360',
  },
});

// Modèles disponibles sur OpenRouter pour les embeddings
// Note: OpenRouter ne supporte pas directement les embeddings OpenAI
// On utilise donc une approche alternative avec un modèle de chat

export async function generateEmbedding(text: string): Promise<number[]> {
  // Option 1: Utiliser l'API OpenAI directement pour les embeddings (recommandé)
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  // Option 2: Utiliser un service d'embedding alternatif via OpenRouter
  // Certains modèles sur OpenRouter supportent les embeddings
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'RETEX360',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

export async function generateRexEmbedding(rex: {
  title: string;
  description?: string | null;
  context?: string | null;
  lessons_learned?: string | null;
  tags?: string[];
}): Promise<number[]> {
  // Combine relevant fields for embedding
  const textParts = [
    rex.title,
    rex.description,
    rex.context,
    rex.lessons_learned,
    rex.tags?.join(' '),
  ].filter(Boolean);

  const combinedText = textParts.join('\n\n');
  return generateEmbedding(combinedText);
}

// Export du client OpenRouter pour les appels de chat/completion
export { openrouter };

// Fonction utilitaire pour les appels de chat via OpenRouter
export async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const response = await openrouter.chat.completions.create({
    model: options?.model || 'anthropic/claude-3.5-sonnet', // Modèle par défaut
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  });

  return response.choices[0].message.content;
}

// Modèles recommandés sur OpenRouter
export const OPENROUTER_MODELS = {
  // Claude
  CLAUDE_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
  // GPT
  GPT4_TURBO: 'openai/gpt-4-turbo',
  GPT4O: 'openai/gpt-4o',
  GPT4O_MINI: 'openai/gpt-4o-mini',
  // Mistral
  MISTRAL_LARGE: 'mistralai/mistral-large',
  MISTRAL_MEDIUM: 'mistralai/mistral-medium',
  // Llama
  LLAMA_70B: 'meta-llama/llama-3.1-70b-instruct',
  LLAMA_8B: 'meta-llama/llama-3.1-8b-instruct',
  // Gemini
  GEMINI_PRO: 'google/gemini-pro-1.5',
} as const;
