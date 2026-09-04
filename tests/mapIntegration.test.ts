import { describe, it, expect } from 'vitest';
import {
  isValidCoordinate,
  extractValidGeotaggedMemories,
  formatLocationCoordinate,
} from '../src/lib/mapUtils';
import type { Interaction } from '../src/types';

describe('Google Maps Integration & Location Resilience Tests', () => {
  describe('Coordinate Validation (isValidCoordinate)', () => {
    it('accepts valid latitude and longitude coordinates', () => {
      expect(isValidCoordinate(37.7749, -122.4194)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(51.5074, -0.1278)).toBe(true);
    });

    it('rejects out-of-bounds latitude (< -90 or > 90)', () => {
      expect(isValidCoordinate(90.001, 10)).toBe(false);
      expect(isValidCoordinate(-90.1, 10)).toBe(false);
      expect(isValidCoordinate(150, 0)).toBe(false);
    });

    it('rejects out-of-bounds longitude (< -180 or > 180)', () => {
      expect(isValidCoordinate(45, 180.001)).toBe(false);
      expect(isValidCoordinate(45, -180.5)).toBe(false);
      expect(isValidCoordinate(0, 200)).toBe(false);
    });

    it('rejects undefined, null, NaN, and Infinity', () => {
      expect(isValidCoordinate(undefined, undefined)).toBe(false);
      expect(isValidCoordinate(null, null)).toBe(false);
      expect(isValidCoordinate(37.77, null)).toBe(false);
      expect(isValidCoordinate(null, -122.41)).toBe(false);
      expect(isValidCoordinate(NaN, -122.41)).toBe(false);
      expect(isValidCoordinate(37.77, Infinity)).toBe(false);
      expect(isValidCoordinate(-Infinity, 10)).toBe(false);
    });
  });

  describe('Geotagged Memory Extraction & Filtering (extractValidGeotaggedMemories)', () => {
    const mixedInteractions: Interaction[] = [
      {
        id: 'entry-valid-1',
        userId: 'user-123',
        title: 'Golden Gate Walk',
        mode: 'reflection',
        prompt: 'Windy walk across the bridge.',
        response: 'A refreshing outdoor memory.',
        turns: [],
        location: {
          name: 'Golden Gate Bridge',
          lat: 37.8199,
          lng: -122.4783,
          capturedAt: '2026-09-04T10:00:00Z',
        },
        insights: {
          title: 'Bridge Reflection',
          summary: 'Wind and ocean air brought fresh perspective.',
          topics: ['outdoors', 'calm'],
          keyIdeas: ['Walking clears thoughts'],
          actionItems: [],
          mood: 'Peaceful',
        },
        aiStatus: 'completed',
        createdAt: '2026-09-04T10:00:00Z',
        updatedAt: '2026-09-04T10:00:00Z',
      },
      {
        id: 'entry-no-location',
        userId: 'user-123',
        title: 'Home Reading Session',
        mode: 'reflection',
        prompt: 'Read a book at home without location.',
        response: 'Cozy moments.',
        turns: [],
        // location is undefined
        aiStatus: 'completed',
        createdAt: '2026-09-04T12:00:00Z',
        updatedAt: '2026-09-04T12:00:00Z',
      },
      {
        id: 'entry-corrupt-coords',
        userId: 'user-123',
        title: 'Invalid Coordinates Entry',
        mode: 'reflection',
        prompt: 'Entered invalid coordinates.',
        response: 'Handled safely.',
        turns: [],
        location: {
          name: 'Outer Space Invalid',
          lat: 999.99, // Invalid latitude
          lng: -122.4,
          capturedAt: '2026-09-04T14:00:00Z',
        },
        aiStatus: 'completed',
        createdAt: '2026-09-04T14:00:00Z',
        updatedAt: '2026-09-04T14:00:00Z',
      },
      {
        id: 'entry-missing-lat',
        userId: 'user-123',
        title: 'Only Name Given',
        mode: 'reflection',
        prompt: 'User gave name but no lat/lng.',
        response: 'Handled safely.',
        turns: [],
        location: {
          name: 'Coffee Shop',
          capturedAt: '2026-09-04T15:00:00Z',
        },
        aiStatus: 'completed',
        createdAt: '2026-09-04T15:00:00Z',
        updatedAt: '2026-09-04T15:00:00Z',
      },
      {
        id: 'entry-valid-2',
        userId: 'user-123',
        title: 'Tokyo Tower Visit',
        mode: 'reflection',
        prompt: 'Bright lights at Tokyo Tower.',
        response: 'Vibrant cityscape.',
        turns: [],
        location: {
          name: 'Tokyo Tower',
          lat: 35.6586,
          lng: 139.7454,
          capturedAt: '2026-09-04T16:00:00Z',
        },
        insights: {
          title: 'Tokyo Lights',
          summary: 'The city skyline provided endless creative inspiration.',
          topics: ['travel', 'energy'],
          keyIdeas: ['New horizons'],
          actionItems: [],
          mood: 'Inspired',
        },
        aiStatus: 'completed',
        createdAt: '2026-09-04T16:00:00Z',
        updatedAt: '2026-09-04T16:00:00Z',
      },
    ];

    it('safely extracts only valid geotagged entries and skips missing or invalid entries without crashing', () => {
      const valid = extractValidGeotaggedMemories(mixedInteractions);
      expect(valid).toHaveLength(2);
      expect(valid[0].id).toBe('entry-valid-1');
      expect(valid[0].location.name).toBe('Golden Gate Bridge');
      expect(valid[0].location.lat).toBeCloseTo(37.8199);
      expect(valid[0].location.lng).toBeCloseTo(-122.4783);

      expect(valid[1].id).toBe('entry-valid-2');
      expect(valid[1].location.name).toBe('Tokyo Tower');
      expect(valid[1].location.lat).toBeCloseTo(35.6586);
      expect(valid[1].location.lng).toBeCloseTo(139.7454);
    });

    it('returns an empty array when given an empty list or entries without locations', () => {
      expect(extractValidGeotaggedMemories([])).toEqual([]);
      expect(
        extractValidGeotaggedMemories([
          {
            id: 'no-loc',
            userId: 'user-1',
            title: 'Test',
            mode: 'reflection',
            prompt: '',
            response: '',
            turns: [],
            aiStatus: 'completed',
            createdAt: '',
            updatedAt: '',
          },
        ])
      ).toEqual([]);
    });
  });

  describe('Location Coordinate Formatting (formatLocationCoordinate)', () => {
    it('formats northern and western coordinates correctly', () => {
      const formatted = formatLocationCoordinate(37.7749, -122.4194);
      expect(formatted).toBe('37.7749° N, 122.4194° W');
    });

    it('formats southern and eastern coordinates correctly', () => {
      const formatted = formatLocationCoordinate(-33.8688, 151.2093);
      expect(formatted).toBe('33.8688° S, 151.2093° E');
    });

    it('returns error string for invalid coordinates', () => {
      expect(formatLocationCoordinate(999, 0)).toBe('Invalid coordinates');
      expect(formatLocationCoordinate(0, NaN)).toBe('Invalid coordinates');
    });
  });
});
