import { createPublicKey, createHash, verify } from 'node:crypto';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(buffer) {
  let n = BigInt(`0x${buffer.toString('hex') || '00'}`), out = '';
  while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  for (const byte of buffer) { if (byte !== 0) break; out = '1' + out; }
  return out;
}
export function from58(text) {
  if (!text || text.length > 100) throw new Error('Invalid base58.');
  let n = 0n;
  for (const ch of text) {
    const digit = ALPHABET.indexOf(ch);
    if (digit < 0) throw new Error('Invalid base58 character.');
    n = n * 58n + BigInt(digit);
  }
  let hex = n.toString(16); if (hex.length % 2) hex = '0' + hex;
  const body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  return Buffer.concat([Buffer.alloc(text.match(/^1*/)[0].length), body]);
}
export function didFromPublic(publicKey) {
  const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  return `did:key:z${base58(Buffer.concat([Buffer.from([0xed, 0x01]), raw]))}`;
}
export function publicFromDid(did) {
  if (typeof did !== 'string' || !did.startsWith('did:key:z')) throw new Error('Not an Ed25519 did:key.');
  const raw = from58(did.slice(9));
  if (raw.length !== 34 || raw[0] !== 0xed || raw[1] !== 0x01 || `did:key:z${base58(raw)}` !== did) throw new Error('Invalid DID encoding.');
  return createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw.subarray(2)]), format: 'der', type: 'spki' });
}
export function normalize(text) {
  if (typeof text !== 'string') throw new Error('Message text must be a string.');
  return text.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu, ' ').trim();
}
export function validateName(name) {
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,47}$/.test(name)) throw new Error('Invalid room or note name.');
}
export function registryPath(did) {
  publicFromDid(did);
  const fingerprint = createHash('sha256').update(did).digest('hex').slice(0, 16);
  return `/kv/did-${fingerprint.slice(0, 2)}/${fingerprint.slice(2)}`;
}
export function verifyMessage(room, message) {
  try {
    validateName(room);
    const did = message.did || message.from;
    const nonce = message.nonce;
    if (typeof nonce === 'number' && !Number.isSafeInteger(nonce)) return false;
    if (!/^\d{1,19}$/.test(String(nonce)) || typeof message.text !== 'string' || !message.text || [...message.text].length > 4096 || normalize(message.text) !== message.text) return false;
    if (typeof message.sig !== 'string' || !/^[A-Za-z0-9_-]{85}[AQgw]$/.test(message.sig)) return false;
    const bytes = Buffer.from(message.sig, 'base64url');
    if (bytes.length !== 64 || bytes.toString('base64url') !== message.sig) return false;
    return verify(null, Buffer.from(`${room}|${nonce}|${message.text}`), publicFromDid(did), bytes);
  } catch { return false; }
}
export function parseProtocolJson(text) {
  return JSON.parse(text, (key, value, context) => {
    if (key === 'nonce' && typeof value === 'number') {
      if (context?.source && /^\d{1,19}$/.test(context.source)) return context.source;
      if (!Number.isSafeInteger(value)) throw new Error('Unsafe nonce precision: use Node 22+ with JSON source support.');
      return String(value);
    }
    return value;
  });
}

export function verifyExport(room, text) {
  validateName(room);
  const result = { total: 0, verified: 0, invalid: 0, unsigned: 0, parseErrors: 0 };
  for (const line of text.split(/\r?\n/).filter(x => x.trim())) {
    result.total++;
    try {
      const message = parseProtocolJson(line);
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Expected record object.');
      if (message.sig === undefined || message.sig === null) result.unsigned++;
      else if (verifyMessage(room, message)) result.verified++;
      else result.invalid++;
    } catch { result.parseErrors++; }
  }
  return result;
}
