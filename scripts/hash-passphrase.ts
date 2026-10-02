import { createInterface } from 'node:readline/promises';

import { hashPassphrase } from '../src/lib/passphrase.ts';

/**
 * Genera el valor de APP_PASSPHRASE_HASH.
 * Uso: npm run hash-passphrase
 */
const rl = createInterface({ input: process.stdin, output: process.stdout });

const passphrase = await rl.question('Passphrase para entrar a la app: ');
rl.close();

if (passphrase.trim().length < 8) {
  console.error('Usa al menos 8 caracteres.');
  process.exit(1);
}

console.log('\nPega esto en .env.local (o en las variables de Railway):\n');
console.log(`APP_PASSPHRASE_HASH=${await hashPassphrase(passphrase)}`);
