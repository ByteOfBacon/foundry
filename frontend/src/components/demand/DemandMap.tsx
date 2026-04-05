import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { DemandPoint, Pop } from '@/lib/types';

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const POINTS_MIN_ZOOM = 8;

interface DemandMapProps {
  points: DemandPoint[];
  pops: Pop[];
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  onAddPoint: (lng: number, lat: number) => void;
  addMode: boolean;
  isDarkMode: boolean;
  viewMode: 'residential' | 'workplace';
}

function buildPointsGeoJSON(points: DemandPoint[], selectedId: string | null) {
  const renderPoints = selectedId ? points.filter((p) => p.id === selectedId) : points;
  return {
    type: 'FeatureCollection' as const,
    features: renderPoints.map((p) => ({
      type: 'Feature' as const,
      id: p.id,
      geometry: { type: 'Point' as const, coordinates: p.location },
      properties: {
        id: p.id,
        residents: p.residents,
        jobs: p.jobs,
        maxDemand: Math.max(p.residents, p.jobs),
        selected: p.id === selectedId,
      },
    })),
  };
}

function buildPointsBboxGeoJSON(points: DemandPoint[]) {
  if (points.length === 0) return { type: 'FeatureCollection' as const, features: [] };

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const point of points) {
    minLng = Math.min(minLng, point.location[0]);
    minLat = Math.min(minLat, point.location[1]);
    maxLng = Math.max(maxLng, point.location[0]);
    maxLat = Math.max(maxLat, point.location[1]);
  }

  const padLng = Math.max(0.001, (maxLng - minLng) * 0.08);
  const padLat = Math.max(0.001, (maxLat - minLat) * 0.08);
  const west = minLng - padLng;
  const south = minLat - padLat;
  const east = maxLng + padLng;
  const north = maxLat + padLat;

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
        properties: {},
      },
    ],
  };
}

function buildConnectionLinesGeoJSON(points: DemandPoint[], pops: Pop[], selectedId: string | null) {
  if (!selectedId) return { type: 'FeatureCollection' as const, features: [] };
  const byId = new Map(points.map((p) => [p.id, p] as const));
  const features = pops
    .filter((pop) => pop.residenceId === selectedId || pop.jobId === selectedId)
    .map((pop) => {
      const residence = byId.get(pop.residenceId);
      const job = byId.get(pop.jobId);
      if (!residence || !job) return null;
      const direction = pop.residenceId === selectedId ? 'outgoing' : 'incoming';
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [residence.location, job.location],
        },
        properties: {
          direction,
          riders: Math.max(0, Number(pop.size) || 0),
        },
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => feature !== null);
  return { type: 'FeatureCollection' as const, features };
}

function buildConnectionPointsGeoJSON(points: DemandPoint[], pops: Pop[], selectedId: string | null) {
  if (!selectedId) return { type: 'FeatureCollection' as const, features: [] };
  const byId = new Map(points.map((p) => [p.id, p] as const));
  const seen = new Set<string>();
  const features: Array<{
    type: 'Feature';
    id: string;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { direction: 'outgoing' | 'incoming'; id: string };
  }> = [];

  for (const pop of pops) {
    if (pop.residenceId !== selectedId && pop.jobId !== selectedId) continue;
    const outgoing = pop.residenceId === selectedId;
    const otherId = outgoing ? pop.jobId : pop.residenceId;
    if (seen.has(`${otherId}:${outgoing ? 'outgoing' : 'incoming'}`)) continue;
    const targetPoint = byId.get(otherId);
    if (!targetPoint) continue;
    seen.add(`${otherId}:${outgoing ? 'outgoing' : 'incoming'}`);
    features.push({
      type: 'Feature',
      id: otherId,
      geometry: { type: 'Point', coordinates: targetPoint.location },
      properties: { direction: outgoing ? 'outgoing' : 'incoming', id: otherId },
    });
  }

  return { type: 'FeatureCollection' as const, features };
}

function getMapBounds(points: DemandPoint[]): maplibregl.LngLatBounds | null {
  if (points.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds(points[0].location, points[0].location);
  for (let i = 1; i < points.length; i++) bounds.extend(points[i].location);
  return bounds;
}

export function DemandMap({
  points,
  pops,
  selectedPointId,
  onSelectPoint,
  onAddPoint,
  addMode,
  isDarkMode,
  viewMode,
}: DemandMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const addModeRef = useRef(addMode);
  const pointsRef = useRef(points);
  const popsRef = useRef(pops);
  const selectedPointIdRef = useRef(selectedPointId);
  const onSelectPointRef = useRef(onSelectPoint);
  const onAddPointRef = useRef(onAddPoint);
  const viewModeRef = useRef(viewMode);
  const mapThemeRef = useRef<'light' | 'dark'>(isDarkMode ? 'dark' : 'light');
  const didInitialFitRef = useRef(false);
  const lastPointCountRef = useRef(points.length);

  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    popsRef.current = pops;
  }, [pops]);
  useEffect(() => {
    selectedPointIdRef.current = selectedPointId;
  }, [selectedPointId]);
  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);
  useEffect(() => {
    onAddPointRef.current = onAddPoint;
  }, [onAddPoint]);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const syncVisibility = useCallback((mapArg?: maplibregl.Map) => {
    const map = mapArg ?? mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const hasSelection = !!selectedPointIdRef.current;
    const showResidents = !hasSelection && viewModeRef.current === 'residential';
    const showJobs = !hasSelection && viewModeRef.current === 'workplace';

    if (map.getLayer('points-residents')) map.setLayoutProperty('points-residents', 'visibility', showResidents ? 'visible' : 'none');
    if (map.getLayer('points-workplaces')) map.setLayoutProperty('points-workplaces', 'visibility', showJobs ? 'visible' : 'none');
    if (map.getLayer('points-hit')) map.setLayoutProperty('points-hit', 'visibility', hasSelection ? 'none' : 'visible');
    if (map.getLayer('selected-point')) map.setLayoutProperty('selected-point', 'visibility', hasSelection ? 'visible' : 'none');
    if (map.getLayer('connection-lines-outgoing')) map.setLayoutProperty('connection-lines-outgoing', 'visibility', hasSelection ? 'visible' : 'none');
    if (map.getLayer('connection-lines-incoming')) map.setLayoutProperty('connection-lines-incoming', 'visibility', hasSelection ? 'visible' : 'none');
    if (map.getLayer('connection-points-outgoing')) map.setLayoutProperty('connection-points-outgoing', 'visibility', hasSelection ? 'visible' : 'none');
    if (map.getLayer('connection-points-incoming')) map.setLayoutProperty('connection-points-incoming', 'visibility', hasSelection ? 'visible' : 'none');
  }, []);

  const ensureSourcesAndLayers = useCallback(
    (map: maplibregl.Map) => {
      if (!map.getSource('points')) map.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getSource('points-bbox')) map.addSource('points-bbox', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      if (!map.getSource('connection-lines')) {
        map.addSource('connection-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }
      if (!map.getSource('connection-points')) {
        map.addSource('connection-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }

      if (!map.getLayer('points-bbox-fill')) {
        map.addLayer({
          id: 'points-bbox-fill',
          type: 'fill',
          source: 'points-bbox',
          maxzoom: POINTS_MIN_ZOOM - 0.01,
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.08 },
        });
      }
      if (!map.getLayer('points-bbox-outline')) {
        map.addLayer({
          id: 'points-bbox-outline',
          type: 'line',
          source: 'points-bbox',
          maxzoom: POINTS_MIN_ZOOM - 0.01,
          paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [2, 1] },
        });
      }

      if (!map.getLayer('points-residents')) {
        map.addLayer({
          id: 'points-residents',
          type: 'circle',
          source: 'points',
          minzoom: POINTS_MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['ln', ['+', 1, ['get', 'residents']]], 0, 3, 4, 5, 7, 8, 10, 14, 13, 22],
            'circle-color': '#3b82f6',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.72,
          },
        });
      }

      if (!map.getLayer('points-workplaces')) {
        map.addLayer({
          id: 'points-workplaces',
          type: 'circle',
          source: 'points',
          minzoom: POINTS_MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['ln', ['+', 1, ['get', 'jobs']]], 0, 3, 4, 5, 7, 8, 10, 14, 13, 22],
            'circle-color': '#f59e0b',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.72,
          },
        });
      }

      if (!map.getLayer('selected-point')) {
        map.addLayer({
          id: 'selected-point',
          type: 'circle',
          source: 'points',
          minzoom: POINTS_MIN_ZOOM,
          paint: {
            'circle-radius': 10,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.95,
          },
        });
      }

      if (!map.getLayer('points-hit')) {
        map.addLayer({
          id: 'points-hit',
          type: 'circle',
          source: 'points',
          minzoom: POINTS_MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['exponential', 1.5], ['get', 'maxDemand'], 0, 8, 10000, 10, 100000, 14, 1000000, 20],
            'circle-color': '#000000',
            'circle-opacity': 0,
          },
        });
      }

      if (!map.getLayer('connection-lines-outgoing')) {
        map.addLayer({
          id: 'connection-lines-outgoing',
          type: 'line',
          source: 'connection-lines',
          minzoom: POINTS_MIN_ZOOM,
          filter: ['==', ['get', 'direction'], 'outgoing'],
          paint: {
            'line-color': '#3b82f6',
            'line-width': ['interpolate', ['linear'], ['ln', ['+', 1, ['get', 'riders']]], 0, 1.2, 6, 2.8, 10, 4.5],
            'line-opacity': 0.55,
          },
        });
      }

      if (!map.getLayer('connection-lines-incoming')) {
        map.addLayer({
          id: 'connection-lines-incoming',
          type: 'line',
          source: 'connection-lines',
          minzoom: POINTS_MIN_ZOOM,
          filter: ['==', ['get', 'direction'], 'incoming'],
          paint: {
            'line-color': '#f59e0b',
            'line-width': ['interpolate', ['linear'], ['ln', ['+', 1, ['get', 'riders']]], 0, 1.2, 6, 2.8, 10, 4.5],
            'line-opacity': 0.55,
            'line-dasharray': [1, 0.8],
          },
        });
      }

      if (!map.getLayer('connection-points-outgoing')) {
        map.addLayer({
          id: 'connection-points-outgoing',
          type: 'circle',
          source: 'connection-points',
          minzoom: POINTS_MIN_ZOOM,
          filter: ['==', ['get', 'direction'], 'outgoing'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.9,
          },
        });
      }

      if (!map.getLayer('connection-points-incoming')) {
        map.addLayer({
          id: 'connection-points-incoming',
          type: 'circle',
          source: 'connection-points',
          minzoom: POINTS_MIN_ZOOM,
          filter: ['==', ['get', 'direction'], 'incoming'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.9,
          },
        });
      }

      syncVisibility(map);
    },
    [syncVisibility]
  );

  const syncData = useCallback((mapArg?: maplibregl.Map) => {
    const map = mapArg ?? mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const pointsSource = map.getSource('points') as maplibregl.GeoJSONSource | undefined;
    const bboxSource = map.getSource('points-bbox') as maplibregl.GeoJSONSource | undefined;
    const linesSource = map.getSource('connection-lines') as maplibregl.GeoJSONSource | undefined;
    const connectionPointsSource = map.getSource('connection-points') as maplibregl.GeoJSONSource | undefined;
    if (!pointsSource || !bboxSource || !linesSource || !connectionPointsSource) return;

    pointsSource.setData(buildPointsGeoJSON(pointsRef.current, selectedPointIdRef.current));
    bboxSource.setData(buildPointsBboxGeoJSON(pointsRef.current));
    linesSource.setData(buildConnectionLinesGeoJSON(pointsRef.current, popsRef.current, selectedPointIdRef.current));
    connectionPointsSource.setData(buildConnectionPointsGeoJSON(pointsRef.current, popsRef.current, selectedPointIdRef.current));
    syncVisibility(map);
  }, [syncVisibility]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDarkMode ? DARK_STYLE : LIGHT_STYLE,
      center: [-98.58, 39.82],
      zoom: 4,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      ensureSourcesAndLayers(map);

      let clickedFeature = false;
      map.on('click', 'points-hit', (e) => {
        if (addModeRef.current) return;
        const feature = e.features?.[0];
        if (!feature) return;
        clickedFeature = true;
        onSelectPointRef.current(feature.properties.id);
      });

      map.on('click', (e) => {
        if (clickedFeature) {
          clickedFeature = false;
          return;
        }
        if (addModeRef.current) {
          onAddPointRef.current(e.lngLat.lng, e.lngLat.lat);
          return;
        }
        onSelectPointRef.current(null);
      });

      map.on('mouseenter', 'points-hit', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'points-hit', () => {
        map.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : '';
      });

      syncData(map);
      const bounds = getMapBounds(pointsRef.current);
      if (bounds && !didInitialFitRef.current) {
        map.fitBounds(bounds, { padding: 72, maxZoom: 11, duration: 0 });
        didInitialFitRef.current = true;
      }
    });

    map.on('style.load', () => {
      ensureSourcesAndLayers(map);
      syncData(map);
    });

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.getCanvas().style.cursor = addMode ? 'crosshair' : '';
  }, [addMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      syncData(map);
      return;
    }
    map.once('load', syncData);
  }, [syncData, points, pops, selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    const nextTheme: 'light' | 'dark' = isDarkMode ? 'dark' : 'light';
    if (!map || mapThemeRef.current === nextTheme) return;
    mapThemeRef.current = nextTheme;
    map.setStyle(nextTheme === 'dark' ? DARK_STYLE : LIGHT_STYLE);
  }, [isDarkMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncVisibility(map);
  }, [viewMode, selectedPointId, syncVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const previousCount = lastPointCountRef.current;
    const currentCount = points.length;
    const shouldFit = !didInitialFitRef.current || (previousCount === 0 && currentCount > 0);
    lastPointCountRef.current = currentCount;
    if (!shouldFit) return;
    const bounds = getMapBounds(points);
    if (!bounds) return;
    map.fitBounds(bounds, { padding: 72, maxZoom: 11, duration: 350 });
    didInitialFitRef.current = true;
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
