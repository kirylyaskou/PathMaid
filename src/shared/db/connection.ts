import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null
let dbPromise: Promise<Database> | null = null

async function loadDb(): Promise<Database> {
  const connection = await Database.load('sqlite:pathmaid.db')
  await connection.execute('PRAGMA busy_timeout=15000', [])
  return connection
}

export async function getDb(): Promise<Database> {
  if (db) return db
  if (!dbPromise) {
    dbPromise = loadDb()
      .then((connection) => {
        db = connection
        return connection
      })
      .catch((err) => {
        dbPromise = null
        throw err
      })
  }
  return dbPromise
}

export async function closeDb(): Promise<void> {
  const connection = await getDb()
  try {
    await connection.close()
  } finally {
    db = null
    dbPromise = null
  }
}
