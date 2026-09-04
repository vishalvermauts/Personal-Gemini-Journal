import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Standard 1: Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Lazy Google Gen AI Client with User-Agent telemetry
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY is not defined in environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}

/**
 * Standard Helper: generateContentWithFallback
 * Iterates through the resilient ladder on recoverable HTTP/API status codes
 */
async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      const text = response.text;
      if (text && typeof text === 'string') {
        return { text, modelUsed: model };
      }
      throw new Error('Received empty text candidate from Gemini');
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code;
      const message = err?.message || String(err);
      console.warn(`[Gemini Fallback Ladder] Attempt with model '${model}' failed: ${message}`);

      // Recoverable error conditions: 503, 429, 404, 500, or network timeouts
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        status === 'UNAVAILABLE' ||
        status === 'RESOURCE_EXHAUSTED' ||
        message.includes('503') ||
        message.includes('429') ||
        message.includes('quota') ||
        message.includes('overloaded') ||
        message.includes('unavailable');

      if (!isRecoverable && i < MODEL_FALLBACK_LADDER.length - 1) {
        // Still attempt fallback on unexpected failures to guarantee high availability
        console.warn(`Attempting fallback to next model despite unclassified error: ${message}`);
      }
    }
  }

  throw new Error(`Gemini generation failed across all fallback models. Last error: ${lastError?.message || 'Unknown failure'}`);
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API endpoint for multi-turn journal reflection, summarization, and brainstorming
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Standard 2: Defensive Payload Ingestion (Null-Safe Destructuring)
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
    const mode = typeof payload.mode === 'string' ? payload.mode.trim().toLowerCase() : 'reflection';
    const history = Array.isArray(payload.history) ? payload.history : [];

    if (!prompt) {
      return res.status(400).json({ error: 'Journal prompt or reflection content is required.' });
    }

    if (prompt.length > 12000) {
      return res.status(400).json({ error: 'Prompt exceeds maximum character boundary of 12,000 characters.' });
    }

    // Role instructions based on requested reflection mode
    let systemInstruction = `You are a supportive, insightful personal reflection and journaling companion.
Your goal is to provide deep, constructive, and empathetic reflections on the user's thoughts and experiences.
Encourage emotional awareness, self-compassion, and growth mindset. Never be judgmental.
Organize your response with clean formatting, short reflective paragraphs, and gentle follow-up prompts or questions when appropriate.`;

    if (mode === 'summary') {
      systemInstruction = `You are an expert executive reflection synthesizer.
Analyze the user's journal entry or reflection and provide:
1. Key Themes & Emotional Core (2-3 bullet points)
2. Core Decisions or Dilemmas Identified
3. Meaningful Insights & Actionable Takeaways
Keep your tone encouraging, objective, and clear with clean Markdown headers and bullet points.`;
    } else if (mode === 'brainstorm') {
      systemInstruction = `You are a creative brainstorming and problem-solving partner.
Review the user's reflection or situation and offer:
1. Alternative Perspectives & Reframes (3 divergent angles)
2. Practical Creative Ideas & Experiments to try
3. Thought-Provoking Inquiry Questions to ponder further
Foster optimism, creative agency, and actionable clarity.`;
    }

    // Build multi-turn content if history is provided
    const contents: any[] = [];
    
    // Sanitize and append prior turns (limiting to last 10 turns to avoid context overflow)
    const sanitizedHistory = history.slice(-10);
    for (const item of sanitizedHistory) {
      if (item && typeof item === 'object') {
        if (typeof item.user === 'string' && item.user.trim()) {
          contents.push({ role: 'user', parts: [{ text: item.user.trim() }] });
        }
        if (typeof item.model === 'string' && item.model.trim()) {
          contents.push({ role: 'model', parts: [{ text: item.model.trim() }] });
        }
      }
    }

    // Append current user prompt
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: mode === 'brainstorm' ? 0.85 : 0.7,
    });

    return res.json({
      response: result.text,
      modelUsed: result.modelUsed,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Reflection API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate reflection response from Gemini AI.',
    });
  }
});

// Setup Vite development server or static production serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
