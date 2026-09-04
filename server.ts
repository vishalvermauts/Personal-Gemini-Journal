import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth } from './server/authMiddleware';
import {
  generateReflectionResponse,
  generateStructuredInsights,
  generateContentWithFallback,
} from './server/geminiService';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health check endpoint (Directive 10: exposes zero sensitive configuration or keys)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
  });
});

// Protected API endpoint for multi-turn journal reflection
app.post('/api/gemini/reflect', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid request body. Expected JSON object.' });
    }

    const { prompt: rawPrompt, mode: rawMode, history: rawHistory } = req.body;

    // Validate prompt
    if (typeof rawPrompt !== 'string') {
      return res.status(400).json({ error: 'Journal prompt is required and must be a string.' });
    }

    const prompt = rawPrompt.trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Journal prompt or reflection content cannot be empty.' });
    }

    if (prompt.length > 12000) {
      return res.status(400).json({ error: 'Prompt exceeds maximum character boundary of 12,000 characters.' });
    }

    // Validate mode
    const validModes = ['reflection', 'summary', 'brainstorm'];
    let mode = 'reflection';
    if (rawMode !== undefined) {
      if (typeof rawMode !== 'string' || !validModes.includes(rawMode.trim().toLowerCase())) {
        return res.status(400).json({ error: "Invalid mode. Allowed modes are 'reflection', 'summary', or 'brainstorm'." });
      }
      mode = rawMode.trim().toLowerCase();
    }

    // Validate history
    let history: Array<{ user?: string; model?: string }> = [];
    if (rawHistory !== undefined) {
      if (!Array.isArray(rawHistory)) {
        return res.status(400).json({ error: 'Invalid history. Expected an array of turns.' });
      }

      if (rawHistory.length > 20) {
        return res.status(400).json({ error: 'History exceeds maximum allowable size of 20 turns.' });
      }

      for (let i = 0; i < rawHistory.length; i++) {
        const item = rawHistory[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return res.status(400).json({ error: `Invalid history turn at index ${i}. Expected an object.` });
        }

        if (item.user !== undefined) {
          if (typeof item.user !== 'string') {
            return res.status(400).json({ error: `Turn at index ${i}: user entry must be a string.` });
          }
          if (item.user.length > 12000) {
            return res.status(400).json({ error: `Turn at index ${i}: user entry exceeds 12,000 characters.` });
          }
        }

        if (item.model !== undefined) {
          if (typeof item.model !== 'string') {
            return res.status(400).json({ error: `Turn at index ${i}: model entry must be a string.` });
          }
          if (item.model.length > 30000) {
            return res.status(400).json({ error: `Turn at index ${i}: model entry exceeds 30,000 characters.` });
          }
        }
      }

      history = rawHistory;
    }

    const result = await generateReflectionResponse(prompt, mode, history);

    return res.json({
      response: result.text,
      modelUsed: result.modelUsed,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Reflection API Error:', error?.message || error);
    return res.status(500).json({
      error: error.message || 'Failed to generate reflection response from Gemini AI.',
    });
  }
});

// Protected API endpoint for generating structured insights (Save-before-analysis support)
app.post('/api/gemini/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid request body. Expected JSON object.' });
    }

    const { prompt: rawPrompt, response: rawResponse } = req.body;

    if (typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
      return res.status(400).json({ error: 'Journal prompt is required for analysis.' });
    }

    if (rawPrompt.length > 15000) {
      return res.status(400).json({ error: 'Prompt exceeds maximum character boundary for analysis.' });
    }

    const companionResponse = typeof rawResponse === 'string' ? rawResponse.trim() : undefined;

    const insights = await generateStructuredInsights(rawPrompt, companionResponse);

    return res.json({
      insights,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Analysis API Error:', error?.message || error);
    return res.status(500).json({
      error: error.message || 'Failed to generate structured insights.',
    });
  }
});

// Protected API endpoint for bounded weekly reflection synthesis (Insights Dashboard)
app.post('/api/gemini/synthesis', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid request body. Expected JSON object.' });
    }

    const { themes: rawThemes } = req.body;
    if (!Array.isArray(rawThemes) || rawThemes.length === 0) {
      return res.status(400).json({ error: 'Themes array is required for synthesis.' });
    }

    const sanitizedThemes = rawThemes.slice(0, 10).map((t) => String(t).slice(0, 80));

    const systemInstruction = `You are an executive personal reflection guide.
Review the user's recent themes and topics from their journal:
Themes: ${sanitizedThemes.join(', ')}
Provide a brief, inspiring, 2-3 sentence weekly synthesis highlighting emotional growth, patterns, and forward momentum.
Keep it encouraging, concise, and grounded. No sensitive medical/psychological profiling.`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: 'Please synthesize my recent journal themes into a short growth reflection.' }] }],
      systemInstruction,
      temperature: 0.7,
    });

    return res.json({
      synthesis: result.text,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Gemini Synthesis API Error:', error?.message || error);
    return res.status(500).json({
      error: error.message || 'Failed to generate weekly reflection synthesis.',
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

// Only boot HTTP listener directly if not running in test suite
if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('Fatal Server Boot Error:', err);
    process.exit(1);
  });
}

export { app };
