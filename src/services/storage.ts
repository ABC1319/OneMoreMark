import { createMockState, mockState } from "../data/mock";
import { detectBrowserLocale } from "../lib/locale";
import { normalizeStoredIcon } from "../lib/favicon";
import type { AppState } from "../types/models";

const STORAGE_KEY = "tabcard_state";
const LOCAL_META_KEY = "tabcard_local_meta";
const DEVICE_ID_KEY = "tabcard_device_id";
const SYNC_META_KEY = "tabcard_sync_meta";
const SYNC_CHUNK_KEY_PREFIX = "tabcard_sync_chunk_";
const SYNC_CHUNK_BYTES = 6000;
const SYNC_PAYLOAD_LIMIT = 90 * 1024;
const textEncoder = new TextEncoder();

type StoredMeta = {
  schemaVersion: 1;
  revision: string;
  updatedAt: number;
  deviceId: string;
};

type SyncMeta = StoredMeta & {
  chunkCount: number;
  oversized?: boolean;
};

export type SyncStatus =
  | {
      type: "ok";
      syncedAt: number;
      size: number;
    }
  | {
      type: "quota-exceeded";
      size: number;
    }
  | {
      type: "unavailable";
    };

export type ManualSyncResult =
  | "uploaded"
  | "downloaded"
  | "already-synced"
  | "quota-exceeded"
  | "unavailable"
  | "failed";

export type SyncSnapshot = {
  local: {
    updatedAt: number | null;
  };
  cloud: {
    updatedAt: number | null;
    chunkCount: number;
    size: number;
    oversized: boolean;
    available: boolean;
  };
};

function hasChromeLocalStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

function hasChromeSyncStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage?.sync;
}

function emitSyncStatus(status: SyncStatus) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<SyncStatus>("tabcard:sync-status", { detail: status }));
}

export function subscribeSyncStatus(onChange: (status: SyncStatus) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStatus = (event: Event) => {
    onChange((event as CustomEvent<SyncStatus>).detail);
  };

  window.addEventListener("tabcard:sync-status", handleStatus);
  return () => {
    window.removeEventListener("tabcard:sync-status", handleStatus);
  };
}

function normalizeState(value: unknown): AppState {
  const defaultState = createMockState(detectBrowserLocale());

  if (!value || typeof value !== "object") {
    return defaultState;
  }

  const record = value as Partial<AppState>;
  const categories = Array.isArray(record.categories)
    ? record.categories
        .filter(
          (item): item is AppState["categories"][number] =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.order === "number"
        )
        .sort((a, b) => a.order - b.order)
    : defaultState.categories;

  const categoryIds = new Set(categories.map((item) => item.id));

  const bookmarks = Array.isArray(record.bookmarks)
    ? record.bookmarks
        .filter(
          (item): item is AppState["bookmarks"][number] =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.url === "string" &&
            typeof item.icon === "string" &&
            typeof item.categoryId === "string" &&
            typeof item.order === "number" &&
            categoryIds.has(item.categoryId)
        )
        .map((item) => ({
          ...item,
          icon: normalizeStoredIcon(item.url, item.icon)
        }))
        .sort((a, b) => a.order - b.order)
    : defaultState.bookmarks;

  return {
    sidebarCollapsed: Boolean(record.sidebarCollapsed),
    themeMode:
      record.themeMode === "light" || record.themeMode === "dark" || record.themeMode === "system"
        ? record.themeMode
        : defaultState.themeMode,
    localeMode:
      record.localeMode === "system" || record.localeMode === "zh-CN" || record.localeMode === "en"
        ? record.localeMode
        : defaultState.localeMode,
    categories,
    bookmarks
  };
}

function normalizeMeta(value: unknown): StoredMeta | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<StoredMeta>;
  if (
    record.schemaVersion !== 1 ||
    typeof record.revision !== "string" ||
    typeof record.updatedAt !== "number" ||
    typeof record.deviceId !== "string"
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    revision: record.revision,
    updatedAt: record.updatedAt,
    deviceId: record.deviceId
  };
}

function normalizeSyncMeta(value: unknown): SyncMeta | null {
  const meta = normalizeMeta(value);
  if (!meta || !value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<SyncMeta>;
  if (typeof record.chunkCount !== "number") {
    return null;
  }

  return {
    ...meta,
    chunkCount: record.chunkCount,
    oversized: Boolean(record.oversized)
  };
}

function getDeviceId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function createMeta(updatedAt = Date.now()): StoredMeta {
  return {
    schemaVersion: 1,
    revision: crypto.randomUUID(),
    updatedAt,
    deviceId: getDeviceId()
  };
}

function stripLargeIconsForSync(state: AppState): AppState {
  return {
    ...state,
    bookmarks: state.bookmarks.map((bookmark) => ({
      ...bookmark,
      icon: normalizeStoredIcon(bookmark.url, bookmark.icon)
    }))
  };
}

function chunkByUtf8Bytes(value: string, maxBytes: number) {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = textEncoder.encode(char).length;
    if (current && currentBytes + charBytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }

    current += char;
    currentBytes += charBytes;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function loadLocalMirror(): AppState {
  const defaultState = createMockState(detectBrowserLocale());

  if (typeof window === "undefined") {
    return mockState;
  }

  const fallback = window.localStorage.getItem(STORAGE_KEY);
  if (!fallback) {
    return defaultState;
  }

  try {
    return normalizeState(JSON.parse(fallback));
  } catch {
    return defaultState;
  }
}

function loadLocalMetaMirror(): StoredMeta | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(LOCAL_META_KEY);
  if (!value) {
    return null;
  }

  try {
    return normalizeMeta(JSON.parse(value));
  } catch {
    return null;
  }
}

function writeLocalMirror(state: AppState, meta: StoredMeta) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
}

async function loadLocalStoredState() {
  if (!hasChromeLocalStorage()) {
    return {
      state: loadLocalMirror(),
      meta: loadLocalMetaMirror()
    };
  }

  const result = await chrome.storage.local.get([STORAGE_KEY, LOCAL_META_KEY]);
  const state = normalizeState(result[STORAGE_KEY] ?? loadLocalMirror());
  const meta = normalizeMeta(result[LOCAL_META_KEY]) ?? loadLocalMetaMirror();

  if (meta) {
    writeLocalMirror(state, meta);
  }

  return { state, meta };
}

async function saveLocalState(state: AppState, meta: StoredMeta) {
  const normalizedState = normalizeState(state);
  writeLocalMirror(normalizedState, meta);

  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: normalizedState,
      [LOCAL_META_KEY]: meta
    });
  }
}

async function loadSyncedState() {
  if (!hasChromeSyncStorage()) {
    return null;
  }

  const result = await chrome.storage.sync.get(null);
  const meta = normalizeSyncMeta(result[SYNC_META_KEY]);
  if (!meta || meta.oversized || meta.chunkCount <= 0) {
    return null;
  }

  const chunks: string[] = [];
  for (let index = 0; index < meta.chunkCount; index += 1) {
    const chunk = result[`${SYNC_CHUNK_KEY_PREFIX}${index}`];
    if (typeof chunk !== "string") {
      return null;
    }
    chunks.push(chunk);
  }

  try {
    return {
      state: normalizeState(JSON.parse(chunks.join(""))),
      meta
    };
  } catch {
    return null;
  }
}

async function loadRawSyncSnapshot() {
  if (!hasChromeSyncStorage()) {
    return null;
  }

  const result = await chrome.storage.sync.get(null);
  const meta = normalizeSyncMeta(result[SYNC_META_KEY]);
  if (!meta) {
    return {
      meta: null,
      size: 0
    };
  }

  let size = 0;
  for (let index = 0; index < meta.chunkCount; index += 1) {
    const chunk = result[`${SYNC_CHUNK_KEY_PREFIX}${index}`];
    if (typeof chunk === "string") {
      size += textEncoder.encode(chunk).length;
    }
  }

  return {
    meta,
    size
  };
}

async function removeStaleSyncChunks(nextChunkCount: number) {
  if (!hasChromeSyncStorage()) {
    return;
  }

  const allItems = await chrome.storage.sync.get(null);
  const staleKeys = Object.keys(allItems).filter((key) => {
    if (!key.startsWith(SYNC_CHUNK_KEY_PREFIX)) {
      return false;
    }

    const index = Number(key.slice(SYNC_CHUNK_KEY_PREFIX.length));
    return Number.isInteger(index) && index >= nextChunkCount;
  });

  if (staleKeys.length > 0) {
    await chrome.storage.sync.remove(staleKeys);
  }
}

async function markSyncOversized(size: number, meta: StoredMeta) {
  if (!hasChromeSyncStorage()) {
    emitSyncStatus({ type: "unavailable" });
    return false;
  }

  await removeStaleSyncChunks(0);
  await chrome.storage.sync.set({
    [SYNC_META_KEY]: {
      ...meta,
      chunkCount: 0,
      oversized: true
    } satisfies SyncMeta
  });
  emitSyncStatus({ type: "quota-exceeded", size });
  return true;
}

async function saveStateToSync(state: AppState, meta: StoredMeta) {
  if (!hasChromeSyncStorage()) {
    emitSyncStatus({ type: "unavailable" });
    return "unavailable" as const;
  }

  const syncState = stripLargeIconsForSync(state);
  const payload = JSON.stringify(syncState);
  if (payload.length > SYNC_PAYLOAD_LIMIT) {
    await markSyncOversized(payload.length, meta);
    return "quota-exceeded" as const;
  }

  const chunks = chunkByUtf8Bytes(payload, SYNC_CHUNK_BYTES);
  const items: Record<string, unknown> = {
    [SYNC_META_KEY]: {
      ...meta,
      chunkCount: chunks.length,
      oversized: false
    } satisfies SyncMeta
  };

  chunks.forEach((chunk, index) => {
    items[`${SYNC_CHUNK_KEY_PREFIX}${index}`] = chunk;
  });

  try {
    await chrome.storage.sync.set(items);
    await removeStaleSyncChunks(chunks.length);
    emitSyncStatus({
      type: "ok",
      syncedAt: meta.updatedAt,
      size: payload.length
    });
    return "ok" as const;
  } catch {
    await markSyncOversized(payload.length, meta);
    return "quota-exceeded" as const;
  }
}

let pendingSyncTimer: number | null = null;
let pendingSyncState: AppState | null = null;
let pendingSyncMeta: StoredMeta | null = null;

function scheduleSyncSave(state: AppState, meta: StoredMeta) {
  pendingSyncState = state;
  pendingSyncMeta = meta;

  if (pendingSyncTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(pendingSyncTimer);
  }

  if (typeof window === "undefined") {
    void saveStateToSync(state, meta);
    return;
  }

  pendingSyncTimer = window.setTimeout(() => {
    pendingSyncTimer = null;
    if (pendingSyncState && pendingSyncMeta) {
      void saveStateToSync(pendingSyncState, pendingSyncMeta);
      pendingSyncState = null;
      pendingSyncMeta = null;
    }
  }, 1200);
}

async function flushPendingSyncSave() {
  if (!pendingSyncState || !pendingSyncMeta) {
    return null;
  }

  if (pendingSyncTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }

  const nextState = pendingSyncState;
  const nextMeta = pendingSyncMeta;
  pendingSyncState = null;
  pendingSyncMeta = null;

  const result = await saveStateToSync(nextState, nextMeta);
  return {
    state: nextState,
    meta: nextMeta,
    result
  };
}

export function loadStateSync(): AppState {
  return loadLocalMirror();
}

export function subscribeStateChanges(onChange: (state: AppState) => void) {
  if (hasChromeLocalStorage() || hasChromeSyncStorage()) {
    const handleChromeStorageChange = async (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        const normalized = normalizeState(changes[STORAGE_KEY].newValue);
        const meta = normalizeMeta(changes[LOCAL_META_KEY]?.newValue) ?? createMeta();
        writeLocalMirror(normalized, meta);
        onChange(normalized);
        return;
      }

      if (areaName !== "sync" || !changes[SYNC_META_KEY]) {
        return;
      }

      const synced = await loadSyncedState();
      if (!synced) {
        return;
      }

      const local = await loadLocalStoredState();
      if ((local.meta?.updatedAt ?? 0) >= synced.meta.updatedAt) {
        return;
      }

      await saveLocalState(synced.state, synced.meta);
      onChange(synced.state);
    };

    chrome.storage.onChanged.addListener(handleChromeStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    };
  }

  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleWindowStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    try {
      onChange(normalizeState(event.newValue ? JSON.parse(event.newValue) : null));
    } catch {
      onChange(mockState);
    }
  };

  window.addEventListener("storage", handleWindowStorage);
  return () => {
    window.removeEventListener("storage", handleWindowStorage);
  };
}

export async function loadState(): Promise<AppState> {
  const result = await syncStateWithCloud();
  return result.state;
}

export async function saveState(state: AppState): Promise<void> {
  const meta = createMeta();
  await saveLocalState(state, meta);
  scheduleSyncSave(state, meta);
}

export async function syncStateWithCloud(): Promise<{
  state: AppState;
  result: ManualSyncResult;
}> {
  try {
    const flushed = await flushPendingSyncSave();
    if (flushed) {
      return {
        state: flushed.state,
        result:
          flushed.result === "ok"
            ? "uploaded"
            : flushed.result === "quota-exceeded"
              ? "quota-exceeded"
              : "unavailable"
      };
    }

    const local = await loadLocalStoredState();
    const synced = await loadSyncedState();

    if (synced && synced.meta.updatedAt > (local.meta?.updatedAt ?? 0)) {
      await saveLocalState(synced.state, synced.meta);
      return {
        state: synced.state,
        result: "downloaded"
      };
    }

    if (!local.meta) {
      const meta = createMeta();
      await saveLocalState(local.state, meta);
      const syncResult = await saveStateToSync(local.state, meta);
      return {
        state: local.state,
        result:
          syncResult === "ok"
            ? "uploaded"
            : syncResult === "quota-exceeded"
              ? "quota-exceeded"
              : "unavailable"
      };
    }

    if (!synced || local.meta.updatedAt > synced.meta.updatedAt) {
      const syncResult = await saveStateToSync(local.state, local.meta);
      return {
        state: local.state,
        result:
          syncResult === "ok"
            ? "uploaded"
            : syncResult === "quota-exceeded"
              ? "quota-exceeded"
              : "unavailable"
      };
    }

    return {
      state: local.state,
      result: "already-synced"
    };
  } catch {
    return {
      state: loadStateSync(),
      result: "failed"
    };
  }
}

export async function getSyncSnapshot(): Promise<SyncSnapshot> {
  const local = await loadLocalStoredState();
  const sync = await loadRawSyncSnapshot();

  return {
    local: {
      updatedAt: local.meta?.updatedAt ?? null
    },
    cloud: {
      updatedAt: sync?.meta?.updatedAt ?? null,
      chunkCount: sync?.meta?.chunkCount ?? 0,
      size: sync?.size ?? 0,
      oversized: Boolean(sync?.meta?.oversized),
      available: hasChromeSyncStorage()
    }
  };
}
