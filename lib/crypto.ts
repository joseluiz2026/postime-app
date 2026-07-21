import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("API_KEY_ENCRYPTION_SECRET is not set");
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32) throw new Error("API_KEY_ENCRYPTION_SECRET must be a 32-byte hex string");
  return key;
}

export function encryptApiKey(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptApiKey(encrypted: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
