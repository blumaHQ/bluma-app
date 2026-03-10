import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { gcm } from '@noble/ciphers/aes.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import { getDB } from '../db';
import { periodDates, healthLogs, settings } from '../db/schema';

const WIRE_VERSION = 1;
const SCHEMA_VERSION = 1;
const AAD = new TextEncoder().encode('bluma-backup-v1');
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 32 } as const;

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_KEY_LENGTH = 22; // ceil(log(256^16) / log(58)) = 22 chars for 128 bits

function toBase58Fixed(bytes: Uint8Array): string {
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }
  let result = '';
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num = num / 58n;
  }
  return result.padStart(BASE58_KEY_LENGTH, '1');
}

export function generateBackupKey(): string {
  const bytes = Crypto.getRandomBytes(16);
  const encoded = toBase58Fixed(bytes);
  return `${encoded.slice(0, 11)}-${encoded.slice(11)}`;
}

function deriveKey(backupKey: string, salt: Uint8Array): Uint8Array {
  return scrypt(backupKey, salt, SCRYPT_PARAMS);
}

export interface BackupResult {
  backupKey: string;
  filePath: string;
}

export async function createBackup(): Promise<BackupResult> {
  const backupKey = generateBackupKey();
  const db = getDB();

  const payload = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      periodDates: await db.select().from(periodDates),
      healthLogs: await db.select().from(healthLogs),
      settings: await db.select().from(settings),
    },
  });

  const salt = Crypto.getRandomBytes(32);
  const nonce = Crypto.getRandomBytes(12);
  const key = deriveKey(backupKey, salt);
  const ciphertext = gcm(key, nonce, AAD).encrypt(new TextEncoder().encode(payload));

  // [1 byte version][32 bytes salt][12 bytes nonce][ciphertext + 16 byte GCM tag]
  const wire = new Uint8Array(1 + 32 + 12 + ciphertext.length);
  wire[0] = WIRE_VERSION;
  wire.set(salt, 1);
  wire.set(nonce, 33);
  wire.set(ciphertext, 45);

  const date = new Date().toISOString().split('T')[0];
  const filePath = `${FileSystem.cacheDirectory}bluma-backup-${date}.bluma`;
  await FileSystem.writeAsStringAsync(filePath, uint8ToBase64(wire), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { backupKey, filePath };
}

export async function shareBackup(filePath: string): Promise<void> {
  await Sharing.shareAsync(filePath, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Bluma Backup',
  });
}

export async function cleanupBackupFile(filePath: string): Promise<void> {
  await FileSystem.deleteAsync(filePath, { idempotent: true });
}

export async function validateBackupFile(fileUri: string): Promise<void> {
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wire = base64ToUint8(raw);

  if (wire.length < 61) throw new Error('INVALID_FILE');
  if (wire[0] !== WIRE_VERSION) throw new Error('UNSUPPORTED_VERSION');
}

export async function restoreBackup(fileUri: string, backupKey: string): Promise<void> {
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wire = base64ToUint8(raw);

  if (wire.length < 61) throw new Error('INVALID_FILE');
  if (wire[0] !== WIRE_VERSION) throw new Error('UNSUPPORTED_VERSION');

  const salt = wire.slice(1, 33);
  const nonce = wire.slice(33, 45);
  const ciphertext = wire.slice(45);

  // Strip dashes from key before deriving (user may have typed it with or without them)
  const normalizedKey = backupKey.replace(/-/g, '');
  const key = deriveKey(normalizedKey, salt);

  let plaintext: Uint8Array;
  try {
    plaintext = gcm(key, nonce, AAD).decrypt(ciphertext);
  } catch {
    throw new Error('WRONG_KEY');
  }

  const { schemaVersion, data } = JSON.parse(new TextDecoder().decode(plaintext));
  if (schemaVersion !== SCHEMA_VERSION) throw new Error('UNSUPPORTED_SCHEMA');

  // Intentionally bypass validatePeriodDate — backup data may include dates older
  // than 1 year, which is valid in a restore context.
  const db = getDB();
  await db.transaction(async tx => {
    await tx.delete(healthLogs);
    await tx.delete(periodDates);
    await tx.delete(settings);
    if (data.periodDates?.length) await tx.insert(periodDates).values(data.periodDates);
    if (data.healthLogs?.length) await tx.insert(healthLogs).values(data.healthLogs);
    if (data.settings?.length) await tx.insert(settings).values(data.settings);
  });
}
