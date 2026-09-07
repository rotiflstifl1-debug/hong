import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { didFromPublic, publicFromDid, base58, from58, normalize, parseProtocolJson, verifyMessage, verifyExport } from '../src/protocol.mjs';

function record(nonce = '1234567890123456789', text = 'Verifier test 한글') {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { from: didFromPublic(publicKey), nonce, text,
    sig: sign(null, Buffer.from(`technocore|${nonce}|${text}`), privateKey).toString('base64url') };
}
test('public DID round trips and invalid base58 is rejected', () => {
  const p = record(); assert.equal(didFromPublic(publicFromDid(p.from)), p.from);
  const bytes = Buffer.from([0, 0, 4, 8]); assert.deepEqual(from58(base58(bytes)), bytes);
  assert.throws(() => from58('0OIl')); assert.throws(() => publicFromDid('did:key:z1'));
});
test('a previously published real Technocore record verifies offline', () => {
  const text = readFileSync(new URL('../examples/published-record.jsonl', import.meta.url), 'utf8');
  assert.deepEqual(verifyExport('technocore', text), { total: 1, verified: 1, invalid: 0, unsigned: 0, parseErrors: 0 });
});
test('numeric 19-digit JSON nonce preserves original digits', () => {
  const p = record(); const raw = JSON.stringify(p).replace('"1234567890123456789"', '1234567890123456789');
  assert.equal(verifyMessage('technocore', parseProtocolJson(raw)), true);
  assert.equal(verifyMessage('technocore', JSON.parse(raw)), false);
});
test('room, nonce, message, signer, and signature tampering is rejected', () => {
  const p = record(); assert.equal(verifyMessage('technocore', p), true);
  assert.equal(verifyMessage('lobby', p), false);
  for (const change of [{ nonce: '4' }, { text: 'changed' }, { from: record().from }, { sig: p.sig + '=' }, { sig: p.sig.slice(0, -1) + 'B' }]) assert.equal(verifyMessage('technocore', { ...p, ...change }), false);
});
test('normalization preserves combining marks and rejects hidden-control payloads', () => {
  assert.equal(normalize('e\u0301\n한글\u200b끝'), 'e\u0301 한글 끝');
  assert.equal(verifyMessage('technocore', record('4', 'text\ntext')), false);
  assert.equal(verifyMessage('technocore', record('4', '')), false);
  assert.equal(verifyMessage('technocore', record('4', 'a'.repeat(4097))), false);
});
test('server sequence and timestamp are outside the signature', () => {
  const p = record(); assert.equal(verifyMessage('technocore', { ...p, seq: 99, ts: 'untrusted' }), true);
});
test('bad signature encoding, unsigned messages, and invalid JSON are counted separately', () => {
  const p = record(); const lines = [p, { text: 'anonymous' }, { ...p, sig: '' }, null].map(JSON.stringify).join('\n') + '\n{broken';
  assert.deepEqual(verifyExport('technocore', lines), { total: 5, verified: 1, unsigned: 1, invalid: 1, parseErrors: 2 });
});
test('CLI checks the published example and rejects incomplete input', () => {
  const cwd = new URL('../', import.meta.url);
  const ok = spawnSync(process.execPath, ['src/cli.mjs', '--room', 'technocore', '--file', 'examples/published-record.jsonl', '--fail-on-unsigned'], { cwd, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr); assert.equal(JSON.parse(ok.stdout).verified, 1);
  const bad = spawnSync(process.execPath, ['src/cli.mjs', '--room', 'technocore'], { cwd, encoding: 'utf8' });
  assert.equal(bad.status, 2);
});
