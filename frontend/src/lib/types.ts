export interface Place {
  code: string;
  name: string;
  locale?: string;
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  thumbnailBbox?: [number, number, number, number];
}

export interface GeneratorConfig {
  'tile-zoom-level': number;
  places: Place[];
}

export type ScriptId = 'roads' | 'runways-taxiways' | 'buildings' | 'pmtiles';

export interface NodeJSStatus {
  available: boolean;
  version: string;
  path: string;
}

export interface OutputFile {
  name: string;
  sizeMb: number;
  modifiedAt: string;
}

export interface PlaceOutput {
  code: string;
  files: OutputFile[];
}

export interface DemandPoint {
  id: string;
  location: [number, number];
  jobs: number;
  residents: number;
  popIds: string[];
}

export interface Pop {
  id: string;
  residenceId: string;
  jobId: string;
  size: number;
  drivingDistance: number;
  drivingSeconds: number;
}

export interface DemandData {
  points: DemandPoint[];
  pops: Pop[];
}

export interface WailsResponse<T> {
  status: 'success' | 'error';
  data: T;
  error?: string;
}

export interface LogEvent {
  level: 'info' | 'warn' | 'error';
  text: string;
  ts: number;
}

export interface ExitEvent {
  code: number | null;
  ts: number;
}
