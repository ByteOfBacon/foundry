import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { DemandPoint, Pop } from '@/lib/types';

interface DemandMapProps {
  points: DemandPoint[];
  pops: Pop[];
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  onAddPoint: (lng: number, lat: number) => void;
  addMode: boolean;
}

function buildPointsGeoJSON(points: DemandPoint[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({
      type: 'Feature' as const,
      id: p.id,
      geometry: { type: 'Point' as const, coordinates: p.location },
      properties: {
        id: p.id,
        residents: p.residents,
        jobs: p.jobs,
        selected: p.id === selectedId,
      },
    })),
  };
}

function buildPopsGeoJSON(points: DemandPoint[], pops: Pop[]) {
  const byId = Object.fromEntries(points.map((p) => [p.id, p.location]));
  return {
    type: 'FeatureCollection' as const,
    features: pops
      .filter((p) => byId[p.residenceId] && byId[p.jobId])
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [byId[p.residenceId], byId[p.jobId]],
        },
        properties: { size: p.size },
      })),
  };
}

export function DemandMap({
  points,
  pops,
  selectedPointId,
  onSelectPoint,
  onAddPoint,
  addMode,
}: DemandMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const addModeRef = useRef(addMode);

  useEffect(() => { addModeRef.current = addMode; }, [addMode]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Pop connection lines
      map.addSource('pops', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'pops-line',
        type: 'line',
        source: 'pops',
        paint: {
          'line-color': '#94a3b8',
          'line-width': ['interpolate', ['linear'], ['get', 'size'], 0, 0.5, 100, 3],
          'line-opacity': 0.4,
        },
      });

      // Points (residents = circle size, jobs = color)
      map.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'points-circle',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'],
            ['get', 'residents'],
            0, 6, 50000, 18, 500000, 30,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'selected'], true], '#d94f4f',
            '#3b82f6',
          ],
          'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 2.5, 1.5],
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.85,
        },
      });

      // Jobs inner dot
      map.addLayer({
        id: 'points-jobs-dot',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'],
            ['get', 'jobs'],
            0, 1.5, 100000, 6,
          ],
          'circle-color': '#facc15',
          'circle-opacity': 0.9,
        },
      });

      // Click: select or deselect
      map.on('click', 'points-circle', (e) => {
        if (addModeRef.current) return;
        const f = e.features?.[0];
        if (!f) return;
        e.originalEvent.stopPropagation();
        onSelectPoint(f.properties.id);
      });

      // Click on map (not point): add or deselect
      map.on('click', (e) => {
        if (addModeRef.current) {
          onAddPoint(e.lngLat.lng, e.lngLat.lat);
          return;
        }
        onSelectPoint(null);
      });

      map.on('mouseenter', 'points-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'points-circle', () => {
        map.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : '';
      });
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync cursor with addMode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.getCanvas().style.cursor = addMode ? 'crosshair' : '';
  }, [addMode]);

  // Sync data
  const syncData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    (map.getSource('points') as maplibregl.GeoJSONSource)?.setData(
      buildPointsGeoJSON(points, selectedPointId)
    );
    (map.getSource('pops') as maplibregl.GeoJSONSource)?.setData(
      buildPopsGeoJSON(points, pops)
    );
  }, [points, pops, selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) { syncData(); return; }
    map.once('load', syncData);
  }, [syncData]);

  return <div ref={containerRef} className="h-full w-full" />;
}
