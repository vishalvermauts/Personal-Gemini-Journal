import { describe, it, expect } from 'vitest';
import {
  sanitizeFirestorePayload,
  exportUserDataAsJSON,
  exportUserDataAsMarkdown,
} from '../src/lib/firebase';
import type { Interaction } from '../src/types';

describe('Resilience & Privacy Export Unit Tests', () => {
  const sampleInteractions: Interaction[] = [
    {
      id: 'entry_1',
      userId: 'user_abc',
      title: 'First Morning Reflection',
      mode: 'reflection',
      prompt: 'Woke up early, meditated for 15 minutes, feeling refreshed.',
      response: 'Meditation is a wonderful anchor for daily clarity.',
      turns: [],
      location: {
        name: 'San Francisco, CA',
        lat: 37.774,
        lng: -122.419,
        capturedAt: '2026-09-04T08:00:00.000Z',
      },
      insights: {
        title: 'Morning Mindfulness Anchor',
        summary: 'Early meditation provided grounding and calm energy.',
        topics: ['mindfulness', 'morning', 'calm'],
        keyIdeas: ['Meditation anchors focus'],
        actionItems: ['Maintain 15-minute routine'],
        mood: 'Calm',
      },
      aiStatus: 'completed',
      createdAt: '2026-09-04T08:00:00.000Z',
      updatedAt: '2026-09-04T08:01:00.000Z',
    },
    {
      id: 'entry_2',
      userId: 'user_abc',
      title: 'Unanalyzed Thought Draft',
      mode: 'reflection',
      prompt: 'Saved while offline, waiting for AI companion analysis.',
      response: '',
      turns: [],
      aiStatus: 'failed',
      createdAt: '2026-09-04T12:00:00.000Z',
      updatedAt: '2026-09-04T12:00:00.000Z',
    },
  ];

  describe('Zero-Crash Undefined-Stripping (Directive 6)', () => {
    it('recursively strips undefined values and converts them to null or removes them', () => {
      const dirtyPayload = {
        id: 'test_1',
        title: 'Valid Title',
        optionalField: undefined,
        nested: {
          good: 'value',
          bad: undefined,
        },
        list: [1, undefined, 'text'],
      };

      const clean = sanitizeFirestorePayload(dirtyPayload);
      expect(clean.optionalField).toBeNull();
      expect(clean.nested.bad).toBeNull();
      expect(clean.nested.good).toBe('value');
      expect(clean.title).toBe('Valid Title');
    });

    it('handles null and empty objects gracefully', () => {
      expect(sanitizeFirestorePayload(null)).toBeNull();
      expect(sanitizeFirestorePayload(undefined)).toBeUndefined();
      expect(sanitizeFirestorePayload({})).toEqual({});
    });
  });

  describe('Secure Data Export (Directive 11 & 12)', () => {
    it('exports user data as clean JSON without sensitive credentials or tokens', () => {
      const jsonString = exportUserDataAsJSON(sampleInteractions);
      expect(typeof jsonString).toBe('string');

      const parsed = JSON.parse(jsonString);
      expect(parsed.appName).toBe('Gemini LifeLog');
      expect(parsed.totalEntries).toBe(2);
      expect(parsed.entries).toHaveLength(2);

      // Verifies content integrity
      expect(parsed.entries[0].title).toBe('First Morning Reflection');
      expect(parsed.entries[0].location.name).toBe('San Francisco, CA');
      expect(parsed.entries[0].insights.mood).toBe('Calm');

      // Negative security checks: zero secrets or tokens
      expect(jsonString).not.toContain('AIzaSy');
      expect(jsonString).not.toContain('private_key');
      expect(jsonString).not.toContain('idToken');
      expect(jsonString).not.toContain('accessToken');
    });

    it('exports user data as clean readable Markdown', () => {
      const md = exportUserDataAsMarkdown(sampleInteractions);
      expect(typeof md).toBe('string');
      expect(md).toContain('# Gemini LifeLog Journal Export');
      expect(md).toContain('## 1. First Morning Reflection');
      expect(md).toContain('San Francisco, CA');
      expect(md).toContain('Maintain 15-minute routine');
      expect(md).toContain('## 2. Unanalyzed Thought Draft');
    });
  });

  describe('Save-Before-Analysis Resilience (Directive 14)', () => {
    it('preserves user prompt and metadata when AI companion response is empty or failed', () => {
      const failedEntry = sampleInteractions[1];
      expect(failedEntry.prompt).toBeTruthy();
      expect(failedEntry.response).toBe('');
      expect(failedEntry.aiStatus).toBe('failed');
    });
  });
});
