/**
 * Hashing de la passphrase. Aparte de auth.ts a propósito: este módulo no
 * toca Next, así que el script `npm run hash-passphrase` puede importarlo
 * con node a secas.
 */
import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// promisify pierde la sobrecarga con opciones, así que la declaramos.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Formato: scrypt:N:r:p:saltBase64:hashBase64
 *
 * El separador es dos puntos y no el signo de dólar por una razón concreta:
 * los cargadores de .env (incluido el de Next) expanden variables, y un
 * fragmento como el de los parámetros se evaporaría al leerlo. Base64 nunca
 * produce dos puntos, así que es un separador seguro.
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(passphrase.normalize('NFKC'), salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: 64 * 1024 * 1024,
  });

  const { N, r, p } = SCRYPT_PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64'), derived.toString('base64')].join(':');
}

/** Comparación en tiempo constante: no filtra información por cuánto tarda. */
export async function verifyPassphrase(passphrase: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  const derived = await scryptAsync(passphrase.normalize('NFKC'), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
