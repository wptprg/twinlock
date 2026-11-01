# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
vulnerability reporting on this repository ("Security" tab → "Report a vulnerability").
You will get an acknowledgement within a few days and a fix or a reasoned answer as soon
as possible. Credit is given in the release notes unless you prefer otherwise.

Reports about weak keys chosen by a user, or about a compromised computer, are out of
scope: Twinlock cannot protect against either, and the README says so.

## What is in scope

* Any way to recover the words, the label or either key from a Twinlock file without
  knowing both keys.
* Any way for the page to send data out of the browser (the CSP must make this impossible).
* Incorrect BIP39 validation that could let a wrong phrase be saved as valid.
* Deviations between the page, [SPEC.md](SPEC.md) and the recovery scripts.
* Tampering that the page would not detect.

## Design principles

1. **One file, readable by anyone.** No build step, no minification, no dependencies, no
   third-party code. What you download is what you audit.
2. **No network, by construction.** A `Content-Security-Policy` with `connect-src 'none'`
   and `default-src 'none'` is embedded in the file.
3. **Nothing secret is ever stored.** Keys are derived (PBKDF2-HMAC-SHA256, 1 000 000
   iterations) and used in memory only. The file holds salts, a verifier and ciphertext.
4. **Standard algorithms through the browser's own Web Crypto API.** No home-made crypto.
5. **Fail closed.** Unknown formats are refused; authentication failures stop everything.
6. **A documented, independent recovery path**, so users are never locked into this code.

## Verifying a release

Each release ships `twinlock.html`, a `SHA256SUMS` file and a detached signature.
Check the hash as shown in the README, then verify the signature against the public key
published in the release notes and in this repository (`twinlock-release-key.asc`). A file
whose hash or signature does not match must be considered tampered with.

Project release key fingerprint:

```
7823 EC86 0CD1 CD49 7C9C  0B66 A98E 07B1 4154 21FF
```

If this key is ever compromised, a revocation will be published here and in the release notes,
and the fingerprint of the replacement key will appear in both places.
