# Changelog

## 1.0.0 — unreleased

First public version.

* Single-file, offline page: `twinlock.html`.
* 12, 18 or 24 BIP39 words with official word list, autocomplete and checksum validation.
* Two keys (access + encryption) → PBKDF2-HMAC-SHA256, 1 000 000 iterations → AES-256-GCM.
* Optional encryption of the wallet label.
* Folder mode (File System Access API, Chrome/Edge) and manual mode (any browser).
* Words revealed one at a time on hover, focus or touch; "Reveal all" for 30 seconds;
  auto-lock after two minutes or when the tab loses focus.
* Interface in English, Portuguese and Spanish.
* File format `twinlock/1` documented in SPEC.md, with a public test vector and
  standalone recovery scripts in Node.js and Python.
