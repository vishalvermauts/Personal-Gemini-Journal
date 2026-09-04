import type { LocationData, Interaction } from '../types';

export interface ValidatedLocation {
  name: string;
  lat: number;
  lng: number;
  placeId?: string;
  capturedAt: string;
}

export interface GeotaggedMemory {
  id: string;
  title: string;
  date: string;
  summary: string;
  mood?: string;
  location: ValidatedLocation;
  rawInteraction: Interaction;
}

/**
 * Validates if coordinates are finite numbers within valid WGS84 latitude and longitude limits.
 * - latitude: -90 to 90
 * - longitude: -180 to 180
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Filters and transforms a list of interactions into validated geotagged memories.
 * Entries missing location, missing coordinates, or having out-of-bounds coordinates are safely excluded.
 */
export function extractValidGeotaggedMemories(interactions: Interaction[]): GeotaggedMemory[] {
  const result: GeotaggedMemory[] = [];

  for (const item of interactions) {
    if (!item.location) continue;
    const { name, lat, lng, placeId, capturedAt } = item.location;

    if (isValidCoordinate(lat, lng)) {
      const dateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Undated';

      result.push({
        id: item.id,
        title: item.insights?.title || item.title || 'Untitled Reflection',
        date: dateStr,
        summary: item.insights?.summary || item.prompt || 'No summary available.',
        mood: item.insights?.mood,
        location: {
          name: name || `Coordinates (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          lat,
          lng,
          placeId,
          capturedAt: capturedAt || item.createdAt || new Date().toISOString(),
        },
        rawInteraction: item,
      });
    }
  }

  return result;
}

/**
 * Formats location details safely for UI display without exposing internal user or doc details.
 */
export function formatLocationCoordinate(lat: number, lng: number): string {
  if (!isValidCoordinate(lat, lng)) return 'Invalid coordinates';
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}
