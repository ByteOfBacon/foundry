import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface BBoxPickerProps {
  value: [number, number, number, number] | null;
  onChange: (bbox: [number, number, number, number]) => void;
}

// Approximate center/zoom for a bbox
function bboxToCenter(bbox: [number, number, number, number]): [number, number] {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

export function BBoxPicker({ value, onChange }: BBoxPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<{
    active: boolean;
    start: [number, number] | null;
  }>({ active: false, start: null });

  const [bbox, setBbox] = useState<[number, number, number, number] | null>(value);

  const updateBoxLayer = useCallback((map: maplibregl.Map, b: [number, number, number, number] | null) => {
    const source = map.getSource('bbox-box') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    if (!b) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    source.setData({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [b[0], b[1]],
          [b[2], b[1]],
          [b[2], b[3]],
          [b[0], b[3]],
          [b[0], b[1]],
        ]],
      },
      properties: {},
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter = bbox ? bboxToCenter(bbox) : [0, 20];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: initialCenter as [number, number],
      zoom: bbox ? 8 : 2,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('bbox-box', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'bbox-fill',
        type: 'fill',
        source: 'bbox-box',
        paint: { 'fill-color': '#d94f4f', 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'bbox-outline',
        type: 'line',
        source: 'bbox-box',
        paint: { 'line-color': '#d94f4f', 'line-width': 2 },
      });

      if (bbox) {
        updateBoxLayer(map, bbox);
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, animate: false });
      }
    });

    // Draw interaction
    map.getCanvas().style.cursor = 'crosshair';

    map.on('mousedown', (e) => {
      if (e.originalEvent.button !== 0) return;
      map.dragPan.disable();
      drawRef.current.active = true;
      drawRef.current.start = [e.lngLat.lng, e.lngLat.lat];
    });

    map.on('mousemove', (e) => {
      if (!drawRef.current.active || !drawRef.current.start) return;
      const [sx, sy] = drawRef.current.start;
      const ex = e.lngLat.lng;
      const ey = e.lngLat.lat;
      const b: [number, number, number, number] = [
        Math.min(sx, ex), Math.min(sy, ey),
        Math.max(sx, ex), Math.max(sy, ey),
      ];
      setBbox(b);
      updateBoxLayer(map, b);
    });

    map.on('mouseup', (e) => {
      if (!drawRef.current.active || !drawRef.current.start) return;
      map.dragPan.enable();
      drawRef.current.active = false;
      const [sx, sy] = drawRef.current.start;
      const ex = e.lngLat.lng;
      const ey = e.lngLat.lat;
      const b: [number, number, number, number] = [
        Math.min(sx, ex), Math.min(sy, ey),
        Math.max(sx, ex), Math.max(sy, ey),
      ];
      setBbox(b);
      updateBoxLayer(map, b);
      onChange(b);
      drawRef.current.start = null;
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setBbox(null);
    if (mapRef.current) updateBoxLayer(mapRef.current, null);
  };

  const bboxLabel = bbox
    ? bbox.map((v) => v.toFixed(5)).join(', ')
    : 'Click and drag on the map to select a bounding box';

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-72 w-full overflow-hidden rounded-lg border">
        <div ref={containerRef} className="h-full w-full" />
        {bbox && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-2 left-2 h-7 gap-1.5 text-xs shadow-md"
            onClick={handleReset}
          >
            <RotateCcw className="size-3" />
            Clear
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-mono truncate">{bboxLabel}</p>
    </div>
  );
}
