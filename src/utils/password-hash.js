import crypto from 'node:crypto';

const SCRYPT_PARAMS = Object.freeze({ N: 16384, r: 8, p: 1, keylen: 64 });
const LEGACY_SHA256_RE = /^[a-f0-9]{64}$/i;

export class PasswordHash {
  static hash(password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(String(password || ''), salt, SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
      maxmem: 64 * 1024 * 1024
    });
    return `$scrypt$v=1$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p},keylen=${SCRYPT_PARAMS.keylen}$${salt.toString('base64url')}$${key.toString('base64url')}`;
  }

  static verify(password, storedHash) {
    const hash = String(storedHash || '');
    if (LEGACY_SHA256_RE.test(hash)) {
      return {
        valid: this.constantTimeEqual(this.legacySha256(password), hash),
        needsRehash: true
      };
    }

    const parsed = this.parseScrypt(hash);
    if (!parsed) return { valid: false, needsRehash: false };

    const key = crypto.scryptSync(String(password || ''), parsed.salt, parsed.keylen, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: 64 * 1024 * 1024
    });
    return {
      valid: this.constantTimeEqual(key, parsed.key),
      needsRehash: parsed.N !== SCRYPT_PARAMS.N || parsed.r !== SCRYPT_PARAMS.r || parsed.p !== SCRYPT_PARAMS.p || parsed.keylen !== SCRYPT_PARAMS.keylen
    };
  }

  static legacySha256(password) {
    return crypto.createHash('sha256').update(String(password || '')).digest('hex');
  }

  static parseScrypt(hash) {
    const parts = hash.split('$');
    if (parts.length !== 6 || parts[1] !== 'scrypt' || parts[2] !== 'v=1') return null;
    const params = Object.fromEntries(parts[3].split(',').map(item => item.split('=')));
    const parsed = {
      N: Number(params.N),
      r: Number(params.r),
      p: Number(params.p),
      keylen: Number(params.keylen),
      salt: Buffer.from(parts[4], 'base64url'),
      key: Buffer.from(parts[5], 'base64url')
    };
    if (!parsed.N || !parsed.r || !parsed.p || !parsed.keylen || !parsed.salt.length || parsed.key.length !== parsed.keylen) return null;
    return parsed;
  }

  static constantTimeEqual(left, right) {
    const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(String(left));
    const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }
}
