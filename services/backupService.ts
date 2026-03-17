import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { gcm } from '@noble/ciphers/aes.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import { getDB } from '../db';
import { periodDates, healthLogs, settings } from '../db/schema';
import { NOTIFICATION_SETTINGS_KEYS } from '../constants/notificationKeys';
import { NotificationService } from './notificationService';

const WIRE_VERSION = 2;
const SCHEMA_VERSION = 2;
const AAD = new TextEncoder().encode('bluma-backup-v1');
const SCRYPT_PARAMS = { N: 2048, r: 8, p: 1, dkLen: 32 } as const;

const THEME_STORAGE_KEY = 'theme_mode';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

interface BackupPayloadV1 {
  schemaVersion: 2;
  exportedAt: string;
  data: {
    periodDates: { id: number; date: string }[];
    healthLogs: { id: number; date: string; type: string; item_id: string; name?: string | null }[];
    settings: { id: number; key: string; value: string }[];
    preferences?: {
      themeMode?: 'light' | 'dark' | 'system';
      reminders?: {
        beforePeriod?: boolean;
        dayOfPeriod?: boolean;
        latePeriod?: boolean;
        fertilityWindow?: boolean;
        timeHour?: string;
        timeMinute?: string;
      };
    };
  };
}

function isValidBackupPayload(obj: unknown): obj is BackupPayloadV1 {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  if (p.schemaVersion !== 2) return false;

  const data = p.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return false;

  return (
    Array.isArray(data.periodDates) &&
    Array.isArray(data.healthLogs) &&
    Array.isArray(data.settings)
  );
}

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

export async function createBackupForKey(backupKey: string): Promise<string> {
  const db = getDB();

  // Fire all DB queries before blocking on scrypt — SQLite runs on a native thread
  // so I/O completes in the background while JS is occupied with key derivation.
  const payloadPromise = Promise.all([
    db.select({ id: periodDates.id, date: periodDates.date }).from(periodDates),
    db.select({ id: healthLogs.id, date: healthLogs.date, type: healthLogs.type, item_id: healthLogs.item_id, name: healthLogs.name }).from(healthLogs),
    db.select({ id: settings.id, key: settings.key, value: settings.value }).from(settings),
    AsyncStorage.getItem(THEME_STORAGE_KEY),
    Promise.all([
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, SECURE_STORE_OPTIONS),
      SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, SECURE_STORE_OPTIONS),
    ]),
  ]).then(([pd, hl, s, themeModeRaw, notificationRaw]) =>
    JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        periodDates: pd,
        healthLogs: hl,
        settings: s,
        preferences: {
          themeMode:
            themeModeRaw === 'light' || themeModeRaw === 'dark' || themeModeRaw === 'system'
              ? themeModeRaw
              : undefined,
          reminders: {
            beforePeriod: notificationRaw[0] === 'true',
            dayOfPeriod: notificationRaw[1] === 'true',
            latePeriod: notificationRaw[2] === 'true',
            fertilityWindow: notificationRaw[3] === 'true',
            timeHour: notificationRaw[4] ?? undefined,
            timeMinute: notificationRaw[5] ?? undefined,
          },
        },
      },
    })
  );

  // Yield the JS thread so the UI can render the key before scrypt blocks it.
  await new Promise<void>(resolve => setTimeout(resolve, 0));

  const salt = Crypto.getRandomBytes(32);
  const nonce = Crypto.getRandomBytes(12);
  const key = deriveKey(backupKey.replace(/-/g, ''), salt); // blocks ~500ms–2s; native DB I/O runs in parallel

  const payload = await payloadPromise; // likely already resolved by now

  const ciphertext = gcm(key, nonce, AAD).encrypt(new TextEncoder().encode(payload));

  // [1 byte version][2 bytes N/256 as uint16][32 bytes salt][12 bytes nonce][ciphertext + 16 byte GCM tag]
  const wire = new Uint8Array(1 + 2 + 32 + 12 + ciphertext.length);
  wire[0] = WIRE_VERSION;
  new DataView(wire.buffer).setUint16(1, SCRYPT_PARAMS.N / 256, false);
  wire.set(salt, 3);
  wire.set(nonce, 35);
  wire.set(ciphertext, 47);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${FileSystem.cacheDirectory}bluma-backup-${timestamp}.bluma`;
  await FileSystem.writeAsStringAsync(filePath, uint8ToBase64(wire), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return filePath;
}

export async function shareBackup(
  filePath: string,
  options?: { dialogTitle?: string }
): Promise<void> {
  if (Platform.OS === 'android') {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('SHARE_CANCELLED');
    }
    

    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileName = filePath.split('/').pop()!;
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      'application/octet-stream'
    );
    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/octet-stream',
      dialogTitle: options?.dialogTitle ?? 'Save Bluma Backup',
      UTI: 'public.data',
    });
  }
}

export async function cleanupBackupFile(filePath: string): Promise<void> {
  await FileSystem.deleteAsync(filePath, { idempotent: true });
}

function parseWire(wire: Uint8Array): { scryptN: number; salt: Uint8Array; nonce: Uint8Array; ciphertext: Uint8Array } {
  if (wire.length < 63) throw new Error('INVALID_FILE');
  if (wire[0] !== WIRE_VERSION) throw new Error('UNSUPPORTED_VERSION');
  const scryptN = new DataView(wire.buffer, wire.byteOffset).getUint16(1, false) * 256;
  const MAX_SCRYPT_N = 2 ** 17;
  if (scryptN < 256 || scryptN > MAX_SCRYPT_N || (scryptN & (scryptN - 1)) !== 0)
    throw new Error('INVALID_FILE');
  return {
    scryptN,
    salt: wire.slice(3, 35),
    nonce: wire.slice(35, 47),
    ciphertext: wire.slice(47),
  };
}

export async function validateBackupFile(fileUri: string): Promise<void> {
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  parseWire(base64ToUint8(raw));
}

export async function restoreBackup(fileUri: string, backupKey: string): Promise<void> {
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wire = base64ToUint8(raw);

  const { scryptN, salt, nonce, ciphertext } = parseWire(wire);

  // Strip dashes from key before deriving (user may have typed it with or without them)
  const normalizedKey = backupKey.replace(/-/g, '');
  const key = scrypt(normalizedKey, salt, { ...SCRYPT_PARAMS, N: scryptN });

  let plaintext: Uint8Array;
  try {
    plaintext = gcm(key, nonce, AAD).decrypt(ciphertext);
  } catch {
    throw new Error('WRONG_KEY');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('INVALID_FILE');
  }
  if (!isValidBackupPayload(parsed)) throw new Error('INVALID_FILE');
  if (parsed.schemaVersion !== 2) throw new Error('UNSUPPORTED_SCHEMA');
  const { data } = parsed;

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

  const prefs = data.preferences;
  const themeMode = prefs?.themeMode;
  if (themeMode === 'light' || themeMode === 'dark' || themeMode === 'system') {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }

  const reminders = prefs?.reminders;
  if (reminders) {
    await Promise.all([
      SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD,
        reminders.beforePeriod ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      ),
      SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD,
        reminders.dayOfPeriod ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      ),
      SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD,
        reminders.latePeriod ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      ),
      SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW,
        reminders.fertilityWindow ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      ),
      reminders.timeHour !== undefined
        ? SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, reminders.timeHour, SECURE_STORE_OPTIONS)
        : Promise.resolve(),
      reminders.timeMinute !== undefined
        ? SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, reminders.timeMinute, SECURE_STORE_OPTIONS)
        : Promise.resolve(),
    ]);

    try {
      await NotificationService.rescheduleNotifications();
    } catch {
      // If the OS denies scheduling (permissions/device state), the preference is still restored.
    }
  }
}
