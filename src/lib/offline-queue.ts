import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { WindowRow } from './supabase';

// ===== Database Schema =====

interface OfflineDB extends DBSchema {
  'pending-measurements': {
    key: string;
    value: {
      id: string;
      windowId: string;
      data: {
        currentWindow: WindowRow;
        newData: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at'>>;
      };
      userId: string;
      timestamp: number;
      retryCount: number;
    };
    indexes: { 'by-timestamp': number };
  };
  'cached-windows': {
    key: string;
    value: {
      id: string;
      window: WindowRow;
      jobId: string | null;
      poNumber: string;
      cachedAt: number;
    };
  };
}

const DB_NAME = 'hf-windows-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Pending measurements store
        if (!db.objectStoreNames.contains('pending-measurements')) {
          const store = db.createObjectStore('pending-measurements', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }

        // Cached windows store
        if (!db.objectStoreNames.contains('cached-windows')) {
          db.createObjectStore('cached-windows', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ===== Pending Measurements =====

export async function queueMeasurement(
  windowId: string,
  currentWindow: WindowRow,
  newData: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at'>>,
  userId: string
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();

  await db.put('pending-measurements', {
    id,
    windowId,
    data: { currentWindow, newData },
    userId,
    timestamp: Date.now(),
    retryCount: 0,
  });

  return id;
}

export async function getPendingMeasurements() {
  const db = await getDB();
  return db.getAllFromIndex('pending-measurements', 'by-timestamp');
}

export async function removePendingMeasurement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending-measurements', id);
}

export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('pending-measurements', id);
  if (item) {
    item.retryCount += 1;
    await db.put('pending-measurements', item);
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count('pending-measurements');
}

// ===== Cached Windows =====

export async function cacheWindowsForOffline(
  windows: WindowRow[],
  poNumber: string,
  jobId: string | null
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cached-windows', 'readwrite');
  const now = Date.now();

  await Promise.all(
    windows.map((w) =>
      tx.store.put({
        id: w.id,
        window: w,
        jobId,
        poNumber,
        cachedAt: now,
      })
    )
  );

  await tx.done;
}

export async function getCachedWindows(poNumber: string): Promise<WindowRow[]> {
  const db = await getDB();
  const all = await db.getAll('cached-windows');
  return all
    .filter((item) => item.poNumber === poNumber)
    .map((item) => item.window);
}

export async function getCachedWindowsByJobId(jobId: string): Promise<WindowRow[]> {
  const db = await getDB();
  const all = await db.getAll('cached-windows');
  return all
    .filter((item) => item.jobId === jobId)
    .map((item) => item.window);
}

export async function clearCachedWindows(): Promise<void> {
  const db = await getDB();
  await db.clear('cached-windows');
}
