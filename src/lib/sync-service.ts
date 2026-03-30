import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { tempDir } from '@tauri-apps/api/path';
import { eq, and } from 'drizzle-orm';
import { db, getSqlite } from './database';
import { pf2eEntities, syncState } from './schema';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface SyncProgress {
  stage: 'checking' | 'downloading' | 'extracting' | 'importing' | 'cleanup' | 'done';
  message: string;
  current?: number;
  total?: number;
}

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  release: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pure utility functions (exported for testing)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hash of the given string content.
 * Uses Web Crypto API (available in Tauri WebView2/WebKit without any dependency).
 */
export async function computeHash(content: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extract the pack name from a GitHub archive file path.
 *
 * GitHub ZIP archives wrap content in a root folder like `foundryvtt-pf2e-{sha}/`.
 * The actual pack directory is at: `{root}/packs/pf2e/{packName}/{entity}.json`
 *
 * We find the two-segment sequence `packs/pf2e` to avoid matching `pf2e` in the
 * root folder name (documented anti-pattern: do NOT use indexOf('pf2e')).
 */
export function extractPackName(filePath: string): string {
  const parts = filePath.split('/');
  for (let i = 0; i < parts.length - 2; i++) {
    if (parts[i] === 'packs' && parts[i + 1] === 'pf2e') {
      return parts[i + 2] ?? 'unknown';
    }
  }
  return 'unknown';
}

/**
 * Type guard: returns true only if `data` is a non-null object with
 * string `_id`, `name`, and `type` properties.
 *
 * Per locked decision: `system` object is NOT required.
 */
export function isValidEntity(data: unknown): data is { _id: string; name: string; type: string } {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d['_id'] === 'string' &&
    typeof d['name'] === 'string' &&
    typeof d['type'] === 'string'
  );
}

/**
 * Returns true if the file should be skipped based on its name.
 * Files starting with `_` (e.g., `_folders.json`) are internal Foundry metadata.
 */
export function shouldSkipFile(fileName: string): boolean {
  return fileName.startsWith('_');
}

export interface EntityRow {
  sourceId: string;
  pack: string;
  slug: string;
  name: string;
  entityType: string;
  rawData: string;
  contentHash: string;
  syncedAt: string;
}

/**
 * Build a parameterized multi-row INSERT OR REPLACE SQL statement.
 *
 * Uses $1, $2... placeholders for tauri-plugin-sql.
 * Does NOT include level/rarity — those are STORED generated columns computed by SQLite.
 *
 * 8 columns per row. 500 rows = 4,000 params (within SQLite 3.46 limit of 32,766).
 */
export function buildBatchInsertSql(rows: EntityRow[]): { sql: string; params: string[] } {
  if (rows.length === 0) return { sql: '', params: [] };

  const COLS = '(source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at)';
  const COLS_PER_ROW = 8;

  const placeholders = rows
    .map((_, i) => {
      const base = i * COLS_PER_ROW;
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8})`;
    })
    .join(',');

  const sqlStr = `INSERT OR REPLACE INTO pf2e_entities ${COLS} VALUES ${placeholders}`;

  const params = rows.flatMap((r) => [
    r.sourceId,
    r.pack,
    r.slug,
    r.name,
    r.entityType,
    r.rawData,
    r.contentHash,
    r.syncedAt,
  ]);

  return { sql: sqlStr, params };
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync orchestration
// ──────────────────────────────────────────────────────────────────────────────

const GITHUB_API_URL = 'https://api.github.com/repos/foundryvtt/pf2e/releases/latest';
const BATCH_SIZE = 500;

/**
 * Full sync pipeline:
 * 1. Check latest GitHub release (skip if already synced)
 * 2. Download ZIP via Rust command (redirect-safe reqwest)
 * 3. Extract ZIP via Rust command
 * 4. Walk packs/pf2e/**\/*.json files, hash content, upsert entities
 * 5. Delete entities no longer in upstream
 * 6. Update sync_state
 * 7. Clean up temp files
 */
export async function syncPacks(onProgress: (progress: SyncProgress) => void): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, deleted: 0, release: '' };

  // Step 1 — Check latest release
  onProgress({ stage: 'checking', message: 'Checking for latest release...' });

  const releaseResp = await fetch(GITHUB_API_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'pathbuddy',
    },
  });
  const release = (await releaseResp.json()) as { tag_name: string; zipball_url: string };

  // Check if already up to date
  const [currentState] = await db.select().from(syncState).limit(1);
  if (currentState?.lastRelease === release.tag_name) {
    onProgress({ stage: 'done', message: `Already up to date (${release.tag_name})` });
    result.release = release.tag_name;
    return result;
  }

  result.release = release.tag_name;

  const tmpPath = await tempDir();
  const zipPath = `${tmpPath}/pf2e-release.zip`;
  const extractPath = `${tmpPath}/pf2e-extracted`;

  try {
    // Step 2 — Download ZIP
    onProgress({ stage: 'downloading', message: `Downloading ${release.tag_name}...` });
    await invoke('download_file', { url: release.zipball_url, destPath: zipPath });

    // Step 3 — Extract ZIP
    onProgress({ stage: 'extracting', message: 'Extracting archive...' });
    await invoke('extract_zip', { zipPath, destPath: extractPath });

    // Step 4 — Import entities
    const allFiles: string[] = await invoke('glob_json_files', { basePath: extractPath });

    // Filter to only files within the packs/pf2e/ path segment
    const packFiles = allFiles.filter((f) => f.includes('/packs/pf2e/'));
    const totalFiles = packFiles.length;

    const importedKeys = new Set<string>();
    let processed = 0;

    // Pre-fetch existing content hashes for change detection.
    // Narrow projection (no raw_data) — fast even at 28K+ rows.
    const sqlite = await getSqlite();
    const existingHashRows = await sqlite.select<{ pack: string; slug: string; content_hash: string }[]>(
      'SELECT pack, slug, content_hash FROM pf2e_entities',
      []
    );
    const hashMap = new Map<string, string>();
    for (const row of existingHashRows) {
      hashMap.set(`${row.pack}::${row.slug}`, row.content_hash);
    }

    // Process in batches of BATCH_SIZE
    for (let batchStart = 0; batchStart < packFiles.length; batchStart += BATCH_SIZE) {
      const batch = packFiles.slice(batchStart, batchStart + BATCH_SIZE);
      const batchRows: EntityRow[] = [];

      await sqlite.execute('BEGIN', []);
      try {
        for (const filePath of batch) {
          const segments = filePath.split('/');
          const fileName = segments[segments.length - 1] ?? '';

          // Skip files starting with _
          if (shouldSkipFile(fileName)) {
            processed++;
            continue;
          }

          const slug = fileName.replace('.json', '');
          const pack = extractPackName(filePath);

          // Read file content via Rust command
          let content: string;
          try {
            content = await invoke('read_text_file', { path: filePath });
          } catch {
            processed++;
            continue;
          }

          // Parse JSON — skip malformed
          let data: unknown;
          try {
            data = JSON.parse(content);
          } catch {
            processed++;
            continue;
          }

          // Validate entity fields
          if (!isValidEntity(data)) {
            processed++;
            continue;
          }

          // Hash raw file content
          const contentHash = await computeHash(content);
          const key = `${pack}::${slug}`;
          importedKeys.add(key);

          // Content-hash pre-check: skip if hash unchanged (avoids unnecessary INSERT OR REPLACE
          // and FTS trigger churn — INSERT OR REPLACE fires AFTER DELETE + AFTER INSERT triggers)
          const existingHash = hashMap.get(key);
          if (existingHash === contentHash) {
            processed++;
            continue;
          }

          // Collect row for batch INSERT OR REPLACE
          batchRows.push({
            sourceId: data._id,
            pack,
            slug,
            name: data.name,
            entityType: data.type,
            rawData: content,
            contentHash,
            syncedAt: new Date().toISOString(),
          });

          processed++;
        }

        // Execute batch INSERT OR REPLACE (one SQL statement for up to 500 rows)
        if (batchRows.length > 0) {
          const { sql: batchSql, params } = buildBatchInsertSql(batchRows);
          await sqlite.execute(batchSql, params);
        }

        await sqlite.execute('COMMIT', []);
      } catch (err) {
        await sqlite.execute('ROLLBACK', []);
        throw err;
      }

      // Update hashMap with newly inserted/updated hashes for subsequent batches
      for (const row of batchRows) {
        hashMap.set(`${row.pack}::${row.slug}`, row.contentHash);
      }

      onProgress({
        stage: 'importing',
        message: `Importing: ${processed} / ${totalFiles}`,
        current: processed,
        total: totalFiles,
      });
    }

    // Step 5 — Delete entities no longer in upstream
    onProgress({ stage: 'cleanup', message: 'Removing deleted entities...' });

    const existingEntities = await db
      .select({ pack: pf2eEntities.pack, slug: pf2eEntities.slug })
      .from(pf2eEntities);

    const toDelete = existingEntities.filter((e) => !importedKeys.has(`${e.pack}::${e.slug}`));
    result.deleted = toDelete.length;

    // Delete in batches of BATCH_SIZE to avoid SQLite variable limit
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const deleteBatch = toDelete.slice(i, i + BATCH_SIZE);
      for (const { pack, slug } of deleteBatch) {
        await db
          .delete(pf2eEntities)
          .where(and(eq(pf2eEntities.pack, pack), eq(pf2eEntities.slug, slug)));
      }
    }

    // Step 6 — Update sync_state (single-row replacement)
    await db.delete(syncState);
    await db.insert(syncState).values({
      lastRelease: release.tag_name,
      lastSyncAt: new Date().toISOString(),
      totalEntities: importedKeys.size,
    });

    // Approximate added vs updated counts
    const preExistingCount = existingEntities.length - toDelete.length;
    result.added = Math.max(0, importedKeys.size - preExistingCount);
    result.updated = Math.max(0, importedKeys.size - result.added);

  } finally {
    // Step 7 — Cleanup temp files (always attempt, even on error)
    try {
      await invoke('remove_dir', { path: extractPath });
    } catch {
      // ignore cleanup errors
    }
    try {
      await invoke('remove_file', { path: zipPath });
    } catch {
      // ignore cleanup errors
    }
  }

  onProgress({ stage: 'done', message: `Sync complete: ${release.tag_name}` });
  return result;
}
