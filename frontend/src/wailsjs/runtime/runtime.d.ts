export function EventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void;
export function EventsOff(...eventNames: string[]): void;
export function EventsOnce(eventName: string, callback: (...data: unknown[]) => void): void;
export function BrowserOpenURL(url: string): void;
export function WindowMinimise(): void;
export function WindowMaximise(): void;
export function WindowClose(): void;
export function Quit(): void;
