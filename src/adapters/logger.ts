export type AdapterLogLevel = "info" | "warn" | "error" | "debug";

export interface AdapterLogEntry {
  adapter: string;
  level: AdapterLogLevel;
  message: string;
  mode: "live" | "mock";
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const buffer: AdapterLogEntry[] = [];
const MAX_BUFFER = 200;

export function adapterLog(
  adapter: string,
  level: AdapterLogLevel,
  message: string,
  mode: "live" | "mock",
  metadata?: Record<string, unknown>
): void {
  const entry: AdapterLogEntry = {
    adapter,
    level,
    message,
    mode,
    metadata,
    timestamp: new Date().toISOString(),
  };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  const prefix = `[TITAN:${adapter}:${mode}]`;
  if (level === "error") console.error(prefix, message, metadata ?? "");
  else if (level === "warn") console.warn(prefix, message);
  else console.log(prefix, message);
}

export function getAdapterLogs(adapter?: string, limit = 50): AdapterLogEntry[] {
  let logs = [...buffer];
  if (adapter) logs = logs.filter((l) => l.adapter === adapter);
  return logs.slice(-limit).reverse();
}

export function clearAdapterLogs(): void {
  buffer.length = 0;
}
