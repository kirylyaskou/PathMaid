import { drizzle } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

let sqliteInstance: Awaited<ReturnType<typeof Database.load>> | null = null;

export async function getSqlite() {
  if (!sqliteInstance) {
    sqliteInstance = await Database.load('sqlite:pf2e.db');
  }
  return sqliteInstance;
}

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const sqlite = await getSqlite();
    if (method === 'run') {
      await sqlite.execute(sql, params as any[]);
      return { rows: [] };
    }
    const rows = await sqlite.select<Record<string, unknown>[]>(sql, params as any[]);
    return { rows: rows.map((row) => Object.values(row)) };
  },
  { schema }
);
