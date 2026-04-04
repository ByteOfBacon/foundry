import type {
  GeneratorConfig,
  NodeJSStatus,
  PlaceOutput,
  DemandData,
  WailsResponse,
} from '@/lib/types';

/** status 'cancelled' is returned when the user dismissed the dialog without selecting a file */
type WailsResponseOrCancelled<T> = WailsResponse<T> | { status: 'cancelled' };

export function GetConfig(): Promise<WailsResponse<GeneratorConfig>>;
export function SaveConfig(cfg: GeneratorConfig): Promise<WailsResponse<boolean>>;
export function ListOutputFiles(): Promise<WailsResponse<PlaceOutput[]>>;
export function RunScript(script: string, placeCode: string): Promise<void>;
export function StopScript(): Promise<void>;
export function ReadDemandData(code: string): Promise<WailsResponse<DemandData>>;
export function WriteDemandData(code: string, data: DemandData): Promise<WailsResponse<boolean>>;
export function OpenDemandFileDialog(): Promise<WailsResponseOrCancelled<DemandData>>;
export function SaveDemandFileAs(data: DemandData): Promise<WailsResponseOrCancelled<boolean>>;
export function GetDataDir(): Promise<WailsResponse<string>>;
export function OpenOutputFolder(code: string): Promise<void>;
export function CheckNodeJS(): Promise<WailsResponse<NodeJSStatus>>;
export function CheckScriptsSetup(): Promise<WailsResponse<boolean>>;
export function InstallScripts(): Promise<void>;
