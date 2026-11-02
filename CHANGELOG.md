# Changelog

## 1.1.0 — unreleased

* **Access books**: a second kind of file, `twinlock-acessos/1`, holding a whole list of
  logins (service, address, user, password code, optional stored password, notes, extra
  fields). Same two keys, same derivations and container as a wallet; the payload is JSON and
  the AAD gets a suffix so wallets and books can never be misread as each other.
* Book screen: search, expand, add, edit and delete entries; hidden values shown on hover,
  touch or Tab; "Copy" clears the clipboard after 20 seconds; the code badge tells how many
  entries share the same password code; auto-lock as for words.
* Saving a book re-encrypts it with the key kept in memory (fresh IV, no PBKDF2 again) and
  keeps the previous version as `<name>.json.bak`. Books are named `a01.json`, `a02.json`…
* `tools/recover.mjs` and `tools/recover.py` also recover books. New public test vector
  `tools/sample-book.json`; SPEC.md §8 documents the format.
* Cards: books first, with their own icon; "New access book" next to "New wallet".
* Translations for the new screens in English, Portuguese and Spanish.
* Wallet files and the `twinlock/1` format are unchanged.

## 1.0.0 — 2026-10-31

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
