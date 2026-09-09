import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import {
  EncryptionError,
  ERROR_CODES,
} from '../services/databaseEncryptionService';

export const DATABASE_NAME = 'period.db';

const TEMPORARY_DATABASE_NAME = 'period.encrypting.db';
const SIDECAR_SUFFIXES = ['-journal', '-wal', '-shm'];
const PLAINTEXT_HEADER = 'SQLite format 3\0';
const HEX_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const CIPHER_PAGE_SIZE = 4096;
const KDF_ITERATIONS = 256000;

// expo-sqlite surfaces SQLite result codes only in the exception message.
// SQLCipher raises SQLITE_NOTADB when the key does not decrypt the header,
// which is the one failure that genuinely means "wrong key" rather than
// "could not read the file right now".
const KEY_MISMATCH_PATTERN = /not a database|SQLITE_NOTADB/i;

export type DatabaseFileState = 'missing' | 'empty' | 'plaintext' | 'encrypted';

// `defaultDatabaseDirectory` is a bare filesystem path on both platforms
// (`<documents>/SQLite` on iOS, `<filesDir>/SQLite` on Android). SQLite's ATTACH
// needs it in that form; `File` needs a `file://` URI.
function databasePath(name: string): string {
  return `${SQLite.defaultDatabaseDirectory}/${name}`;
}

function databaseFile(name: string): File {
  return new File(`file://${databasePath(name)}`);
}

function startsWithPlaintextHeader(header: Uint8Array): boolean {
  for (let index = 0; index < PLAINTEXT_HEADER.length; index += 1) {
    if (header[index] !== PLAINTEXT_HEADER.charCodeAt(index)) {
      return false;
    }
  }
  return true;
}

export function inspectDatabaseFile(name: string): DatabaseFileState {
  const file = databaseFile(name);
  if (!file.exists) {
    return 'missing';
  }

  const handle = file.open();
  try {
    const header = handle.readBytes(PLAINTEXT_HEADER.length);
    if (header.length < PLAINTEXT_HEADER.length) {
      return 'empty';
    }
    return startsWithPlaintextHeader(header) ? 'plaintext' : 'encrypted';
  } finally {
    handle.close();
  }
}

// Whether any file on disk could be holding data that only the stored key opens.
// The temporary file counts: an interrupted encryption can leave the sole copy
// of the user's data there.
export function hasEncryptedDatabaseOnDisk(): boolean {
  return (
    inspectDatabaseFile(DATABASE_NAME) === 'encrypted' ||
    inspectDatabaseFile(TEMPORARY_DATABASE_NAME) === 'encrypted'
  );
}

// `SQLite.deleteDatabaseAsync` removes only the main file on both platforms. A
// leftover hot journal would be rolled back into whichever file takes its place.
async function deleteDatabaseWithSidecars(name: string): Promise<void> {
  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = databaseFile(`${name}${suffix}`);
    if (sidecar.exists) {
      sidecar.delete();
    }
  }

  if (databaseFile(name).exists) {
    await SQLite.deleteDatabaseAsync(name);
  }
}

function assertValidHexKey(hexKey: string): void {
  if (!HEX_KEY_PATTERN.test(hexKey)) {
    throw new EncryptionError(
      ERROR_CODES.KEY_CORRUPTED,
      'Encryption key is not a 64-character hexadecimal string.'
    );
  }
}

function isKeyMismatch(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return KEY_MISMATCH_PATTERN.test(detail);
}

async function assertCipherAvailable(
  database: SQLite.SQLiteDatabase
): Promise<void> {
  const version = await database.getFirstAsync('PRAGMA cipher_version;');
  if (!version) {
    throw new EncryptionError(
      ERROR_CODES.CIPHER_UNAVAILABLE,
      'This build has no SQLCipher, so the database cannot be encrypted.'
    );
  }
}

async function closeQuietly(
  database: SQLite.SQLiteDatabase | null
): Promise<void> {
  if (!database) {
    return;
  }

  try {
    await database.closeAsync();
  } catch (error) {
    console.error('[Database] Error closing database:', error);
  }
}

async function openEncryptedDatabase(
  name: string,
  hexKey: string
): Promise<SQLite.SQLiteDatabase> {
  assertValidHexKey(hexKey);

  const database = await SQLite.openDatabaseAsync(name);
  try {
    await database.execAsync(`PRAGMA key = "x'${hexKey}'";`);
    await database.execAsync(`PRAGMA cipher_page_size = ${CIPHER_PAGE_SIZE};`);
    await database.execAsync(`PRAGMA kdf_iter = ${KDF_ITERATIONS};`);
    await assertCipherAvailable(database);
    await database.getAllAsync('SELECT count(*) FROM sqlite_master;');
    return database;
  } catch (error) {
    await closeQuietly(database);
    throw error;
  }
}

// The user's own database, as opposed to the working copies the migration makes.
// A key that cannot open it is a distinct situation from one that cannot be read
// at all, and restarting does not fix it, so it gets its own code.
export async function openMainDatabase(
  hexKey: string
): Promise<SQLite.SQLiteDatabase> {
  try {
    return await openEncryptedDatabase(DATABASE_NAME, hexKey);
  } catch (error) {
    if (!(error instanceof EncryptionError) && isKeyMismatch(error)) {
      throw new EncryptionError(
        ERROR_CODES.KEY_MISMATCH,
        'The stored encryption key does not decrypt the database.'
      );
    }
    throw error;
  }
}

async function countRowsPerTable(
  database: SQLite.SQLiteDatabase
): Promise<Record<string, number>> {
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' " +
      "AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );

  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    const row = await database.getFirstAsync<{ rowCount: number }>(
      `SELECT count(*) AS rowCount FROM "${name.replace(/"/g, '""')}";`
    );
    counts[name] = row?.rowCount ?? 0;
  }
  return counts;
}

function assertRowCountsMatch(
  original: Record<string, number>,
  copy: Record<string, number>
): void {
  const tables = new Set([...Object.keys(original), ...Object.keys(copy)]);
  for (const table of tables) {
    if (original[table] !== copy[table]) {
      throw new EncryptionError(
        ERROR_CODES.MIGRATION_FAILED,
        `Encrypted copy of "${table}" does not match the original.`
      );
    }
  }
}

function migrationFailed(error: unknown, hexKey?: string): EncryptionError {
  if (error instanceof EncryptionError) {
    return error;
  }

  const detail = error instanceof Error ? error.message : String(error);
  const redacted = hexKey ? detail.split(hexKey).join('[key]') : detail;
  return new EncryptionError(
    ERROR_CODES.MIGRATION_FAILED,
    `Failed to encrypt the database: ${redacted}`
  );
}

async function exportToTemporaryDatabase(
  hexKey: string
): Promise<Record<string, number>> {
  let plaintext: SQLite.SQLiteDatabase | null = null;
  try {
    plaintext = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await assertCipherAvailable(plaintext);
    const originalCounts = await countRowsPerTable(plaintext);

    // SQLCipher 4 defaults to the page size and KDF iterations that
    // `openEncryptedDatabase` sets, so the export needs no cipher pragmas.
    await plaintext.execAsync(
      `ATTACH DATABASE '${databasePath(TEMPORARY_DATABASE_NAME)}' AS encrypted KEY "x'${hexKey}'";
       SELECT sqlcipher_export('encrypted');
       DETACH DATABASE encrypted;`
    );

    return originalCounts;
  } catch (error) {
    throw migrationFailed(error, hexKey);
  } finally {
    await closeQuietly(plaintext);
  }
}

async function verifyTemporaryDatabase(
  hexKey: string,
  originalCounts: Record<string, number>
): Promise<void> {
  let encrypted: SQLite.SQLiteDatabase | null = null;
  try {
    encrypted = await openEncryptedDatabase(TEMPORARY_DATABASE_NAME, hexKey);
    assertRowCountsMatch(originalCounts, await countRowsPerTable(encrypted));
  } catch (error) {
    throw migrationFailed(error, hexKey);
  } finally {
    await closeQuietly(encrypted);
  }
}

async function swapInTemporaryDatabase(): Promise<void> {
  try {
    await deleteDatabaseWithSidecars(DATABASE_NAME);
    databaseFile(TEMPORARY_DATABASE_NAME).move(databaseFile(DATABASE_NAME));
  } catch (error) {
    throw migrationFailed(error);
  }
}

export async function discardTemporaryDatabase(): Promise<void> {
  await deleteDatabaseWithSidecars(TEMPORARY_DATABASE_NAME);
}

// Both files have to go together. A temporary file left behind by a reset is
// read as an interrupted encryption on the next launch, and the freshly created
// key cannot open it, which locks the user out of an app they just wiped.
export async function deleteAllDatabaseFiles(): Promise<void> {
  await deleteDatabaseWithSidecars(DATABASE_NAME);
  await discardTemporaryDatabase();
}

export async function encryptPlaintextDatabase(hexKey: string): Promise<void> {
  assertValidHexKey(hexKey);
  await discardTemporaryDatabase();

  const originalCounts = await exportToTemporaryDatabase(hexKey);
  await verifyTemporaryDatabase(hexKey, originalCounts);
  await swapInTemporaryDatabase();
}

// A temporary file that the active key genuinely cannot decrypt is unrecoverable,
// so it is left on disk rather than promoted or deleted. Every other failure —
// a busy, full or unreadable file — costs the user nothing and is retryable, so
// it must not be reported as lost data.
async function assertTemporaryDatabaseOpens(hexKey: string): Promise<void> {
  let temporary: SQLite.SQLiteDatabase | null = null;
  try {
    temporary = await openEncryptedDatabase(TEMPORARY_DATABASE_NAME, hexKey);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    if (isKeyMismatch(error)) {
      throw new EncryptionError(
        ERROR_CODES.ORPHANED_DATABASE,
        'An interrupted encryption left a database that the current key cannot open. Your data cannot be recovered.'
      );
    }
    throw migrationFailed(error);
  } finally {
    await closeQuietly(temporary);
  }
}

// The swap deletes the plaintext file before moving the encrypted copy in, so a
// crash in that window leaves no main file. Promoting the temporary file
// recovers from that, but only once the active key has been shown to open it.
export async function finishInterruptedEncryption(
  hexKey: string
): Promise<void> {
  if (inspectDatabaseFile(TEMPORARY_DATABASE_NAME) !== 'encrypted') {
    await discardTemporaryDatabase();
    return;
  }

  await assertTemporaryDatabaseOpens(hexKey);
  await swapInTemporaryDatabase();
}
