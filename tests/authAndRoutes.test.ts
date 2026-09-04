import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock Firebase Admin before importing server/app
vi.mock('../server/firebaseAdmin', () => {
  return {
    getAdminAuth: () => ({
      verifyIdToken: vi.fn(async (token: string) => {
        if (token === 'valid-token') {
          return {
            uid: 'verified-user-123',
            email: 'verified@example.com',
            email_verified: true,
          };
        }
        if (token === 'expired-token') {
          const err: any = new Error('Firebase ID token has expired.');
          err.code = 'auth/id-token-expired';
          throw err;
        }
        const err: any = new Error('Decoding Firebase ID token failed.');
        err.code = 'auth/invalid-id-token';
        throw err;
      }),
    }),
    getFirebaseAdminApp: () => ({}),
  };
});

// Mock GoogleGenAI so no live API calls or network requests occur
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn(async (params: any) => {
          if (params?.config?.responseMimeType === 'application/json') {
            return {
              text: JSON.stringify({
                title: 'Mock Structured Title',
                summary: 'Mock structured summary for reflection.',
                topics: ['mindfulness', 'growth'],
                keyIdeas: ['Core idea extracted'],
                actionItems: ['Next step experiment'],
                mood: 'Focused',
              }),
            };
          }
          return {
            text: 'Mock reflection output from Gemini AI model',
          };
        }),
      };
    },
  };
});

// Set test environment variable so server doesn't call app.listen
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'mock-test-key';

import { app } from '../server';

describe('Step 0 & Feature Endpoints: Backend Authentication & Route Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test J: /api/health Operational Endpoint Privacy', () => {
    it('returns status ok and exposes NO sensitive configuration, secrets, or keys', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });

      // Explicit negative checks for leakages
      expect(res.body.geminiConfigured).toBeUndefined();
      expect(res.body.apiKey).toBeUndefined();
      expect(res.body.secrets).toBeUndefined();
      expect(res.body.uid).toBeUndefined();
      expect(res.body.env).toBeUndefined();
      expect(res.body.timestamp).toBeUndefined();
    });
  });

  describe('Tests A–F: Express Authentication Middleware (requireAuth)', () => {
    it('A: Rejects request with 401 if Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/gemini/reflect')
        .send({ prompt: 'Reflecting on my day' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Missing Authorization header/i);
    });

    it('B: Rejects request with 401 if Authorization scheme is not Bearer', async () => {
      const resBasic = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Basic valid-token')
        .send({ prompt: 'Reflecting on my day' });

      expect(resBasic.status).toBe(401);
      expect(resBasic.body.error).toMatch(/Invalid Authorization scheme/i);

      const resMalformed = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer')
        .send({ prompt: 'Reflecting on my day' });

      expect(resMalformed.status).toBe(401);
    });

    it('C: Rejects request with 401 if token is invalid', async () => {
      const res = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer bad-token')
        .send({ prompt: 'Reflecting on my day' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or expired authentication token/i);
    });

    it('D: Rejects request with 401 if token is expired', async () => {
      const res = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer expired-token')
        .send({ prompt: 'Reflecting on my day' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or expired authentication token/i);
    });

    it('E: Allows request to proceed with valid verified token', async () => {
      const res = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 'Today was productive and insightful.' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('response');
      expect(res.body.response).toBe('Mock reflection output from Gemini AI model');
    });

    it('F: Client-supplied userId or uid in body does not override authenticated identity', async () => {
      const res = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({
          prompt: 'Testing identity spoofing resistance',
          userId: 'attacker-spoofed-uid-999',
          uid: 'hacker-uid',
        });

      expect(res.status).toBe(200);
      expect(res.body.response).toBeTruthy();
    });
  });

  describe('Tests G–I: /api/gemini/reflect Request Body Validation', () => {
    it('G: Rejects missing or non-string prompt with 400', async () => {
      const resMissing = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/prompt is required/i);

      const resNumeric = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 12345 });

      expect(resNumeric.status).toBe(400);
      expect(resNumeric.body.error).toMatch(/must be a string/i);

      const resEmpty = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: '   ' });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toMatch(/cannot be empty/i);

      const resInvalidMode = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: 'Valid prompt', mode: 'invalid_mode' });

      expect(resInvalidMode.status).toBe(400);
      expect(resInvalidMode.body.error).toMatch(/Invalid mode/i);
    });

    it('H: Rejects oversized prompt exceeding 12,000 characters with 400', async () => {
      const oversizedPrompt = 'a'.repeat(12001);
      const res = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: oversizedPrompt });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Prompt exceeds maximum character boundary/i);
    });

    it('I: Rejects excessive or malformed history turns with 400', async () => {
      const excessiveHistory = Array.from({ length: 21 }, (_, i) => ({
        user: `Turn user ${i}`,
        model: `Turn model ${i}`,
      }));

      const resExcessive = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({
          prompt: 'Valid prompt',
          history: excessiveHistory,
        });

      expect(resExcessive.status).toBe(400);
      expect(resExcessive.body.error).toMatch(/History exceeds maximum allowable size of 20 turns/i);

      const resMalformedItem = await request(app)
        .post('/api/gemini/reflect')
        .set('Authorization', 'Bearer valid-token')
        .send({
          prompt: 'Valid prompt',
          history: ['not an object'],
        });

      expect(resMalformedItem.status).toBe(400);
      expect(resMalformedItem.body.error).toMatch(/Invalid history turn at index 0/i);
    });
  });

  describe('Structured AI Insights Endpoint (/api/gemini/analyze)', () => {
    it('requires authentication and rejects unauthenticated callers with 401', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze')
        .send({ prompt: 'Deep reflections on today.' });

      expect(res.status).toBe(401);
    });

    it('rejects missing or empty prompt with 400', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/prompt is required/i);
    });

    it('returns structured insights on valid authenticated request', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze')
        .set('Authorization', 'Bearer valid-token')
        .send({
          prompt: 'Meditated this morning, feeling calm and focused on project goals.',
          response: 'Meditation anchors calm clarity.',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('insights');
      expect(res.body.insights.title).toBe('Mock Structured Title');
      expect(res.body.insights.mood).toBe('Focused');
      expect(res.body.insights.topics).toContain('mindfulness');
      expect(res.body.insights.keyIdeas).toHaveLength(1);
    });
  });

  describe('Weekly Synthesis Endpoint (/api/gemini/synthesis)', () => {
    it('requires authentication with 401', async () => {
      const res = await request(app)
        .post('/api/gemini/synthesis')
        .send({ themes: ['mindfulness', 'work'] });

      expect(res.status).toBe(401);
    });

    it('rejects missing themes array with 400', async () => {
      const res = await request(app)
        .post('/api/gemini/synthesis')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns growth synthesis for valid themes', async () => {
      const res = await request(app)
        .post('/api/gemini/synthesis')
        .set('Authorization', 'Bearer valid-token')
        .send({ themes: ['mindfulness', 'productivity'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('synthesis');
    });
  });
});
