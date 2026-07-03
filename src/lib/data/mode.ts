export type DataMode = "live" | "demo";

export type DataModeReason =
  | "not_configured"
  | "schema_missing"
  | "query_error"
  | "empty"
  | "live";

export interface DataModeState {
  mode: DataMode;
  reason: DataModeReason;
  message?: string;
  checkedAt: string;
}

let _state: DataModeState = {
  mode: "demo",
  reason: "not_configured",
  checkedAt: new Date().toISOString(),
};

export function getDataModeState(): DataModeState {
  return _state;
}

export function setDataModeState(partial: Partial<DataModeState>): void {
  _state = {
    ..._state,
    ...partial,
    checkedAt: new Date().toISOString(),
  };
}

export function isLiveDataMode(): boolean {
  return _state.mode === "live";
}

export function classifySupabaseError(message: string): DataModeReason {
  const m = message.toLowerCase();
  if (m.includes("could not find the table") || m.includes("relation") && m.includes("does not exist")) {
    return "schema_missing";
  }
  return "query_error";
}
