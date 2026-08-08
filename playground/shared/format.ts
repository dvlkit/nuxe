export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}