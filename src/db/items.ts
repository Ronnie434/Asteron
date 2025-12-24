import * as SQLite from 'expo-sqlite';
import { type SQLiteDatabase } from 'expo-sqlite';

export type ItemType = 'task' | 'bill' | 'renewal' | 'followup' | 'reminder' | 'note';
export type ItemPriority = 'low' | 'med' | 'high';
export type ItemStatus = 'active' | 'done' | 'archived';

export interface Item {
    id: string;
    title: string;
    details?: string | null;
    type: ItemType;
    dueAt?: string | null;   // ISO 8601
    remindAt?: string | null; // ISO 8601
    priority: ItemPriority;
    status: ItemStatus;
    confidence: number;
    createdAt: string;
    updatedAt: string;
}

let db: SQLiteDatabase | null = null;

export const initDb = async (): Promise<void> => {
    if (db) return;
    db = await SQLite.openDatabaseAsync('items.db');

    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      type TEXT NOT NULL,
      dueAt TEXT,
      remindAt TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      confidence REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);
    CREATE INDEX IF NOT EXISTS idx_items_dueAt ON items (dueAt);
    CREATE INDEX IF NOT EXISTS idx_items_remindAt ON items (remindAt);
  `);
};

export const getDb = async () => {
    if (!db) await initDb();
    return db!;
}

export const createItem = async (item: Item): Promise<void> => {
    const database = await getDb();
    await database.runAsync(
        `INSERT INTO items (id, title, details, type, dueAt, remindAt, priority, status, confidence, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.id,
            item.title,
            item.details ?? null,
            item.type,
            item.dueAt ?? null,
            item.remindAt ?? null,
            item.priority,
            item.status,
            item.confidence,
            item.createdAt,
            item.updatedAt,
        ]
    );
};

export const updateItem = async (id: string, patch: Partial<Item>): Promise<void> => {
    const database = await getDb();
    const fields = Object.keys(patch).filter(k => k !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => (patch as any)[f]);

    // Updating updatedAt automatically? Spec says it's passed in, but good practice to enforce.
    // For now relying on caller to set updatedAt or we can force it here.
    // Let's assume caller handles it or we append it if missing.

    await database.runAsync(
        `UPDATE items SET ${setClause} WHERE id = ?`,
        [...values, id]
    );
};

export const getItem = async (id: string): Promise<Item | null> => {
    const database = await getDb();
    const result = await database.getFirstAsync<Item>(
        `SELECT * FROM items WHERE id = ?`,
        [id]
    );
    return result ?? null;
};

export const listItems = async (filter?: { status?: string }): Promise<Item[]> => {
    const database = await getDb();
    let query = `SELECT * FROM items`;
    const params: any[] = [];

    if (filter?.status) {
        query += ` WHERE status = ?`;
        params.push(filter.status);
    } else {
        // Default sort?
        query += ` ORDER BY createdAt DESC`;
    }

    return await database.getAllAsync<Item>(query, params);
};

export const deleteItem = async (id: string): Promise<void> => {
    const database = await getDb();
    await database.runAsync(`DELETE FROM items WHERE id = ?`, [id]);
};
