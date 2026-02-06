
import { GenerationResult } from "../types";

const DB_NAME = "DreamSceneDB";
const STORE_NAME = "History";
const DB_VERSION = 1;

export class HistoryDB {
  private static instance: HistoryDB;
  private db: IDBDatabase | null = null;

  private constructor() {}

  public static getInstance(): HistoryDB {
    if (!HistoryDB.instance) {
      HistoryDB.instance = new HistoryDB();
    }
    return HistoryDB.instance;
  }

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject("Failed to open DB");
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async save(result: GenerationResult): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      // We don't save videoUrl as Blob URLs are temporary and won't work after refresh
      // But we save everything else
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Failed to save result");
    });
  }

  async getAll(): Promise<GenerationResult[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort by timestamp (id contains timestamp)
        const results = (request.result as GenerationResult[]).sort((a, b) => {
          return b.id.localeCompare(a.id);
        });
        resolve(results);
      };
      request.onerror = () => reject("Failed to get results");
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Failed to delete result");
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Failed to clear store");
    });
  }
}
