// Streaming service disabled for static export
export class StreamingService {
  connect() {}
  disconnect() {}
  subscribe() { return () => {}; }
}
export const streamingService = null;
export async function initStreamingService(): Promise<void> {}
export async function closeStreamingService(): Promise<void> {}
