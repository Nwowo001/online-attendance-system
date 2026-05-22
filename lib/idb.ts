import { openDB, DBSchema, IDBPDatabase } from "idb";
import { IAttendance } from "@/types";

interface AttendanceDB extends DBSchema {
  "pending-checkins": {
    key: string;
    value: {
      id: string;
      token: string;
      sessionId: string;
      timestamp: number;
      synced: boolean;
    };
  };
  "cached-attendance": {
    key: string;
    value: IAttendance & { cachedAt: number };
  };
}

let db: IDBPDatabase<AttendanceDB> | null = null;

async function getDB(): Promise<IDBPDatabase<AttendanceDB>> {
  if (db) return db;
  db = await openDB<AttendanceDB>("attendance-system", 1, {
    upgrade(database) {
      database.createObjectStore("pending-checkins", { keyPath: "id" });
      database.createObjectStore("cached-attendance", { keyPath: "_id" });
    },
  });
  return db;
}

export async function savePendingCheckin(token: string, sessionId: string): Promise<void> {
  const database = await getDB();
  await database.put("pending-checkins", {
    id: `${sessionId}-${Date.now()}`,
    token,
    sessionId,
    timestamp: Date.now(),
    synced: false,
  });
}

export async function getPendingCheckins() {
  const database = await getDB();
  const all = await database.getAll("pending-checkins");
  return all.filter((c) => !c.synced);
}

export async function markCheckinSynced(id: string): Promise<void> {
  const database = await getDB();
  const item = await database.get("pending-checkins", id);
  if (item) {
    await database.put("pending-checkins", { ...item, synced: true });
  }
}

export async function cacheAttendance(records: IAttendance[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("cached-attendance", "readwrite");
  await Promise.all(
    records.map((r) => tx.store.put({ ...r, cachedAt: Date.now() }))
  );
  await tx.done;
}

export async function getCachedAttendance(): Promise<(IAttendance & { cachedAt: number })[]> {
  const database = await getDB();
  return database.getAll("cached-attendance");
}
