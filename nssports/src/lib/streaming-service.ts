// Streaming service disabled for static export
export class StreamingService {
  connect(_channel?: string, _options?: Record<string, unknown>) { return Promise.resolve(); }
  disconnect() {}
  subscribe() { return () => {}; }
  on(_event: string, _handler: (data: unknown) => void) {}
  off(_event: string, _handler: (data: unknown) => void) {}
}
export function getStreamingService(): StreamingService { return new StreamingService(); }
export const streamingService = null;
export async function initStreamingService(): Promise<void> {}
export async function closeStreamingService(): Promise<void> {}
