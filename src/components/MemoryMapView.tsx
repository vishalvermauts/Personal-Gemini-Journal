import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Interaction } from '../types';
import {
  extractValidGeotaggedMemories,
  formatLocationCoordinate,
  type GeotaggedMemory,
} from '../lib/mapUtils';
import {
  MapPin,
  Calendar,
  Sparkles,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Compass,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface MemoryMapViewProps {
  interactions: Interaction[];
  onSelectInteraction: (interaction: Interaction) => void;
  onNewSession: () => void;
}

/**
 * Helper component that manages camera bounds and centering when memories change
 */
const MapBoundsFitter: React.FC<{
  memories: GeotaggedMemory[];
  selectedMemory: GeotaggedMemory | null;
}> = ({ memories, selectedMemory }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || memories.length === 0) return;

    if (selectedMemory) {
      map.panTo({
        lat: selectedMemory.location.lat,
        lng: selectedMemory.location.lng,
      });
      return;
    }

    if (memories.length === 1) {
      map.panTo({
        lat: memories[0].location.lat,
        lng: memories[0].location.lng,
      });
      map.setZoom(13);
    } else {
      const bounds = new google.maps.LatLngBounds();
      memories.forEach((m) => {
        bounds.extend({ lat: m.location.lat, lng: m.location.lng });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [map, memories, selectedMemory]);

  return null;
};

export const MemoryMapView: React.FC<MemoryMapViewProps> = ({
  interactions,
  onSelectInteraction,
  onNewSession,
}) => {
  // Read API Key strictly from environment variable
  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

  // Validate and extract only memories with legitimate finite coordinates
  const validMemories = useMemo(() => {
    return extractValidGeotaggedMemories(interactions);
  }, [interactions]);

  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(
    validMemories[0]?.id || null
  );
  const [activeInfoWindowId, setActiveInfoWindowId] = useState<string | null>(null);

  const selectedMemory = useMemo(() => {
    return validMemories.find((m) => m.id === selectedMemoryId) || null;
  }, [validMemories, selectedMemoryId]);

  const infoWindowMemory = useMemo(() => {
    return validMemories.find((m) => m.id === activeInfoWindowId) || null;
  }, [validMemories, activeInfoWindowId]);

  const handleSelectMemory = useCallback((memory: GeotaggedMemory) => {
    setSelectedMemoryId(memory.id);
    setActiveInfoWindowId(memory.id);
  }, []);

  return (
    <div id="memory-map-view" className="flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 p-4 sm:px-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Memory Map</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {validMemories.length} Geotagged {validMemories.length === 1 ? 'Memory' : 'Memories'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Private, opt-in geographic memories locked strictly within your personal vault
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Per-User Data Isolation</span>
          </div>
          <button
            onClick={onNewSession}
            className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
          >
            Add Memory
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {validMemories.length === 0 ? (
          /* Empty state: No valid geotagged memories */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-xs">
                <Compass className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">No Location-Aware Memories Yet</h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                  When creating or editing a reflection in the Journal workspace, click{' '}
                  <strong className="text-gray-900">"Add Location"</strong> to optionally attach your current city,
                  place, or coordinate.
                </p>
              </div>
              <button
                onClick={onNewSession}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Create a Location Memory</span>
              </button>
            </div>
          </div>
        ) : !mapsApiKey ? (
          /* Missing Maps API Key fallback state (Developer/Production notice) */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar list remains 100% accessible even without Maps API key */}
            <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
              <div className="p-3 border-b border-gray-200 bg-gray-50/70">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Pinned Locations ({validMemories.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {validMemories.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMemory(m)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      m.id === selectedMemoryId
                        ? 'bg-gray-100 border-gray-300 shadow-xs'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {m.location.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{m.date}</span>
                    </div>
                    <h4 className="mt-1 text-xs font-medium text-gray-800 line-clamp-1">{m.title}</h4>
                    <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{m.summary}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Map Area Graceful Fallback Message */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
              <div className="max-w-md mx-auto text-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mx-auto text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Google Maps is not configured for this deployment
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  To view interactive geographic maps, configure{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono text-[11px]">
                    VITE_GOOGLE_MAPS_API_KEY
                  </code>{' '}
                  in your environment with Maps JavaScript API enabled and HTTP referrer restrictions applied.
                </p>
                <div className="pt-2">
                  <span className="text-[11px] text-gray-500">
                    Your location-aware journal memories remain fully preserved and browsable via the sidebar.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Real Google Maps Integration via @vis.gl/react-google-maps */
          <>
            {/* Sidebar list of places (Keyboard & Visual Accessible) */}
            <div
              className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0 z-10 shadow-xs"
              aria-label="Geotagged Memories List"
            >
              <div className="p-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Pinned Locations ({validMemories.length})
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Click to focus</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2" role="list">
                {validMemories.map((entry) => {
                  const isSelected = entry.id === selectedMemoryId;

                  return (
                    <button
                      key={entry.id}
                      role="listitem"
                      onClick={() => handleSelectMemory(entry)}
                      className={`w-full text-left p-3 rounded-xl cursor-pointer transition-all border focus:outline-hidden focus:ring-2 focus:ring-black ${
                        isSelected
                          ? 'bg-gray-100 border-gray-300 shadow-xs'
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {entry.location.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{entry.date}</span>
                      </div>

                      <h4 className="mt-1 text-xs font-medium text-gray-800 line-clamp-1">
                        {entry.title}
                      </h4>

                      {entry.summary && (
                        <p className="mt-1 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {entry.summary}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                        <span>{formatLocationCoordinate(entry.location.lat, entry.location.lng)}</span>
                        {entry.mood && (
                          <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                            {entry.mood}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Google Map Canvas */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-100">
              <APIProvider apiKey={mapsApiKey}>
                <div className="flex-1 relative w-full h-full">
                  <Map
                    defaultCenter={{
                      lat: selectedMemory?.location.lat || validMemories[0].location.lat,
                      lng: selectedMemory?.location.lng || validMemories[0].location.lng,
                    }}
                    defaultZoom={12}
                    mapId="lifelog-map"
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    className="w-full h-full"
                  >
                    <MapBoundsFitter
                      memories={validMemories}
                      selectedMemory={selectedMemory}
                    />

                    {/* Render Advanced Markers for each geotagged memory */}
                    {validMemories.map((entry) => {
                      const isSelected = entry.id === selectedMemoryId;

                      return (
                        <AdvancedMarker
                          key={entry.id}
                          position={{ lat: entry.location.lat, lng: entry.location.lng }}
                          title={entry.location.name}
                          onClick={() => handleSelectMemory(entry)}
                        >
                          <div
                            className={`p-2 rounded-full shadow-md cursor-pointer transition-transform duration-200 ${
                              isSelected
                                ? 'bg-black text-white scale-125 ring-4 ring-black/25'
                                : 'bg-white text-rose-600 border border-gray-200 hover:scale-110'
                            }`}
                            aria-label={`Memory pin: ${entry.location.name}`}
                          >
                            <MapPin className="h-4 w-4" />
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {/* Interactive Info Window for the active pin */}
                    {infoWindowMemory && (
                      <InfoWindow
                        position={{
                          lat: infoWindowMemory.location.lat,
                          lng: infoWindowMemory.location.lng,
                        }}
                        onCloseClick={() => setActiveInfoWindowId(null)}
                      >
                        <div className="p-1 max-w-xs space-y-1.5 font-sans">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {infoWindowMemory.location.name}
                            </span>
                          </div>

                          <h4 className="font-semibold text-xs text-gray-800 line-clamp-1">
                            {infoWindowMemory.title}
                          </h4>

                          <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                            {infoWindowMemory.summary}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                            <span>{infoWindowMemory.date}</span>
                            {infoWindowMemory.mood && (
                              <span className="capitalize px-1 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                                {infoWindowMemory.mood}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => onSelectInteraction(infoWindowMemory.rawInteraction)}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 px-2.5 py-1 bg-black text-white text-[11px] font-medium rounded hover:bg-gray-800 transition-colors"
                          >
                            <span>Open Journal Entry</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </div>
              </APIProvider>

              {/* Bottom Selected Entry Inspection Bar */}
              {selectedMemory && (
                <div className="bg-white border-t border-gray-200 p-4 sm:p-5 shrink-0 shadow-lg space-y-2 z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-rose-600 shrink-0" />
                        <span className="font-bold text-sm text-gray-900">
                          {selectedMemory.location.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({formatLocationCoordinate(selectedMemory.location.lat, selectedMemory.location.lng)})
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        {selectedMemory.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => onSelectInteraction(selectedMemory.rawInteraction)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0 self-start sm:self-auto"
                    >
                      <span>Open Full Journal Entry</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {selectedMemory.summary && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      {selectedMemory.summary}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

