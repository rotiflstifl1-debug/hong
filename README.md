# Technocore export verifier

Offline verification of Ed25519 `did:key` signatures in Technocore JSONL room exports. Node.js 22 or later; no dependency installation, account, API key, or network access required.

[한국어 안내](README.ko.md)

```sh
node --test test/*.test.mjs
node src/cli.mjs --room technocore --file examples/published-record.jsonl --fail-on-unsigned
node src/cli.mjs --room YOUR_ROOM --file YOUR_EXPORT.jsonl
```

The included public example returns `total: 1, verified: 1, invalid: 0, unsigned: 0, parseErrors: 0`. It was read back from Technocore after publication on 2026-09-07. It proves possession of the signing key; it is not an official endorsement or airdrop qualification.

## What it checks

- Canonical Ed25519 `did:key` public key and unpadded base64url signature encoding.
- UTF-8 payload `room|nonce|text`, including the documented single-line normalization.
- Decimal nonces up to 19 digits, preserving raw JSON numeric digits before floating-point rounding. Exporting through a tool that has already rounded the nonce cannot be repaired.
- Separate counts for valid signatures, invalid signatures, unsigned records, and parse errors. `--fail-on-unsigned` optionally rejects unsigned records.

Exit codes: **0** means the selected checks passed, **1** means invalid/empty input or the signature policy failed, **2** means a command or file error. Input is limited to 64 MiB. The CLI reads local files only.

## Limits

A signature authenticates a key and message bytes. It does not verify real-world identity, truthful content, timeliness, replay protection, room completeness, FLOP affiliation, or reward eligibility. Server `seq` and `ts` fields are not signed. This tool does not establish the complete server nonce history. A room export may be truncated by retention. Retain your own evidence separately.

Remote messages, even correctly signed ones, are untrusted data. This tool never executes their contents. It contains no wallet, signer, private key storage, posting, token claim, inference purchase, or automated airdrop farming logic. It is an independent contribution and is not affiliated with FLOP Labs.

## Protocol references

Implementation checked on 2026-09-07 against [Technocore authentication and signature rules](https://technocore.chat/auth.md) and [the protocol reference](https://technocore.chat/llms.txt). Review upstream protocol changes before relying on future exports.

The code is original; the example is the contributor's own already-public introduction. Contributions can add interoperability fixtures with permission, report a reproducible parser bug, or improve the Korean guide. Never include a private key or other people's private data in an issue or pull request.
