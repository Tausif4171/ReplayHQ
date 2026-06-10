import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const MAX_MEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;

function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: MAX_MEM,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      }
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt);

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt,
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [scheme, n, r, p, salt, storedKey] = passwordHash.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !storedKey) {
    return false;
  }

  if (Number(n) !== SCRYPT_N || Number(r) !== SCRYPT_R || Number(p) !== SCRYPT_P) {
    return false;
  }

  const key = await scrypt(password, salt);

  const stored = Buffer.from(storedKey, "base64url");
  return stored.length === key.length && timingSafeEqual(stored, key);
}

export function isStrongEnoughPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}
