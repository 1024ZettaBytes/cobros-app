import webpush from 'web-push';

/**
 * Genera el par de claves VAPID que identifica a este servidor ante los
 * servicios de push de los navegadores.
 *
 * Uso: npm run generate-vapid
 *
 * Ojo: si cambias estas claves, todas las suscripciones existentes dejan de
 * servir y hay que volver a suscribir cada navegador.
 */
const keys = webpush.generateVAPIDKeys();

console.log('\nPega esto en .env.local (o en las variables de Railway):\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:tu-correo@ejemplo.com');
