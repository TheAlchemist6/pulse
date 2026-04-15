import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variable.
 * Key must be 32 bytes (256 bits) hex-encoded.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`
    );
  }
  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex string containing: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatenate: IV + AuthTag + Ciphertext
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString("hex");
}

/**
 * Decrypt a hex string encrypted with encryptToken().
 * Throws if the authentication tag is invalid (tampering detected).
 */
export function decryptToken(ciphertextHex: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertextHex, "hex");

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: data too short");
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generate a secure random encryption key suitable for TOKEN_ENCRYPTION_KEY.
 * Run this once to generate a new key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("hex");
}
