import { mockState } from "../data/mock";
import type { AppState } from "../types/models";

const STORAGE_KEY = "tabcard_state";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export async function loadState(): Promise<AppState> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as AppState | undefined) ?? mockState;
  }

  const fallback = window.localStorage.getItem(STORAGE_KEY);
  return fallback ? (JSON.parse(fallback) as AppState) : mockState;
}

export async function saveState(state: AppState): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
