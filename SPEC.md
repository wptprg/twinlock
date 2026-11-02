# Twinlock file format — version `twinlock/1`

This document is the complete specification of Twinlock files: wallet files (§1 to §7) and,
since Twinlock 1.1, access books (§8). It exists so that anyone can recover their words
**without Twinlock**, using only standard cryptographic libraries, as long as they know the
two keys. Nothing in this document is secret.

## 1. Overview

A Twinlock file is a UTF-8 JSON document holding one recovery phrase (12, 18 or 24
BIP39 words) encrypted with **AES-256-GCM**. The AES key is derived from **two user
secrets** (the *access key* and the *encryption key*) with **PBKDF2-HMAC-SHA256**.
Neither secret, nor anything that allows recovering them, is stored in the file.

A separate *verifier* derived from the access key alone lets a program tell
"wrong access key" apart from "wrong encryption key" without weakening the encryption.

## 2. File layout

```json
{
  "formato": "twinlock/1",
  "versao": "1.0.0",
  "id": "0c1875b3-1a5e-4bf7-a024-10e4c0b18867",
  "descricao": "Ledger Nano X",
  "criadoEm": "2026-10-31T14:02:11.171Z",
  "kdf": { "algoritmo": "PBKDF2-SHA256", "iteracoes": 1000000 },
  "saltVerificador": "<base64, 16 bytes>",
  "verificador":     "<base64, 32 bytes>",
  "saltChave":       "<base64, 16 bytes>",
  "iv":              "<base64, 12 bytes>",
  "dados":           "<base64, ciphertext || 16-byte GCM tag>",
  "descricaoCifrada": { "iv": "<base64, 12 bytes>", "dados": "<base64>" }
}
```

| Field | Required | Meaning |
|---|---|---|
| `formato` | yes | Format identifier. Readers must accept `twinlock/1`. (`cofre/1` is an identical pre-release layout.) |
| `versao` | no | Version of the program that wrote the file. Informational. |
| `id` | yes | Random UUID v4. Used as *additional authenticated data* (AAD), so a ciphertext cannot be moved to another file. |
| `descricao` | yes | Plain-text label, max 20 characters. Empty string when the label is encrypted. |
| `criadoEm` | yes | ISO 8601 timestamp. Informational. |
| `kdf.algoritmo` | yes | Always `PBKDF2-SHA256`. |
| `kdf.iteracoes` | yes | PBKDF2 iteration count. Twinlock 1.0 writes 1 000 000. Readers must use the value in the file. |
| `saltVerificador` | yes | 16 random bytes, salt of the verifier derivation. |
| `verificador` | yes | 32-byte PBKDF2 output, see §3.2. |
| `saltChave` | yes | 16 random bytes, salt of the AES key derivation. |
| `iv` | yes | 12 random bytes, AES-GCM nonce for the words. |
| `dados` | yes | AES-GCM output for the words: ciphertext followed by the 16-byte authentication tag (the WebCrypto convention). |
| `descricaoCifrada` | no | Present only when the label was encrypted. Same AES key, its own 12-byte IV, AAD = `id + "\u0000descricao"`. |

All binary values are standard base64 with padding. Field names are Portuguese
(`descricao` = description, `saltChave` = key salt, `dados` = data, `criadoEm` = created at).

## 3. Derivations

Let `A` be the access key and `E` the encryption key, exactly as typed. Before use, every
input string is normalised with Unicode **NFKC** and encoded as UTF-8. `\0` denotes the
single byte 0x00. `||` is byte concatenation.

### 3.1 PBKDF2

```
PBKDF2(password, salt) = PBKDF2-HMAC-SHA256(password, salt, kdf.iteracoes, 32 bytes)
```

### 3.2 Verifier (access key only)

```
verificador = PBKDF2( NFKC("acesso" || \0 || A), saltVerificador )
```

A reader compares this value with the stored `verificador` in constant time.
A mismatch means **wrong access key**. The verifier reveals nothing about `E`.

### 3.3 AES key (both keys)

```
K = PBKDF2( NFKC("aes" || \0 || A || \0 || E), saltChave )
```

`K` is a 256-bit AES-GCM key. It is never stored.

### 3.4 Words

```
plaintext = words joined with a single ASCII space, e.g. "zoo zoo ... vote"
dados     = AES-256-GCM-Encrypt( key = K, iv = iv, aad = UTF8(id), plaintext )
```

A GCM authentication failure means **wrong encryption key** (or a tampered file).

### 3.5 Encrypted label (optional)

```
descricaoCifrada.dados = AES-256-GCM-Encrypt( key = K, iv = descricaoCifrada.iv,
                                              aad = UTF8(id || \0 || "descricao"), UTF8(label) )
```

## 4. Recovery procedure (without Twinlock)

1. Read the JSON. Check `formato`.
2. Compute §3.2. If it differs from `verificador`, the access key is wrong. Stop.
3. Compute §3.3, then decrypt `dados` as in §3.4. If authentication fails, the encryption key is wrong.
4. Split the plaintext on spaces. You have the words, in order.
5. If `descricaoCifrada` exists, decrypt it as in §3.5 to get the label.

Reference implementations: [`tools/recover.mjs`](tools/recover.mjs) (Node 18+, no dependencies)
and [`tools/recover.py`](tools/recover.py) (Python 3 + the `cryptography` package).

## 5. Test vector

[`tools/sample-wallet.json`](tools/sample-wallet.json) is a real Twinlock file created with:

| | |
|---|---|
| Access key | `test-access-key` |
| Encryption key | `test-encryption-key-1` |
| Words | `zoo` × 23 followed by `vote` (24 words, valid BIP39 checksum) |
| Label | `Sample wallet` (encrypted, so `descricao` is empty in the file) |
| Iterations | 2 000 (deliberately low, so tests run fast; real files use 1 000 000) |

Any conforming implementation must recover exactly those words and that label from that file.

## 6. Security parameters and rationale

* **PBKDF2 instead of Argon2**: PBKDF2 is the only password KDF available natively in every
  browser (Web Crypto API). Adding an Argon2 implementation would mean shipping third-party
  code inside the single file, which is exactly what Twinlock avoids. The cost is compensated
  with a high iteration count (1 000 000, above the OWASP 2023 recommendation of 600 000) and
  by deriving the key from two secrets.
* **Two secrets, one key**: the AES key depends on both `A` and `E`. Knowing one of them gives
  no advantage. The verifier is bound to `A` only, with a different salt and a domain prefix,
  so it cannot be used to attack `K`.
* **AAD = id**: binds the ciphertext to its file. Swapping `dados` between two files fails.
* **Fresh random salts and IVs per file**: two wallets with the same keys and words produce
  completely different files.
* **No key material in the file**: there is no "encrypted copy of the keys" to attack.

## 7. Versioning

A breaking change to any derivation creates a new `formato` value (`twinlock/2`…).
Readers must refuse unknown values rather than guess.

## 8. Access book — `twinlock-acessos/1`

Since Twinlock 1.1 the same folder can also hold **access books**: one file holding a whole
list of logins (service, user name, which password to use, notes). A book is a regular
Twinlock container with a different `formato` and a different payload. **Every derivation in
§3 is unchanged**; only the plaintext and one AAD differ.

### 8.1 File layout

Identical to §2, with these differences:

| Field | Meaning |
|---|---|
| `formato` | `twinlock-acessos/1`. A reader for wallets must refuse it, and vice versa. |
| `atualizadoEm` | ISO 8601 timestamp of the last save. Informational. |
| `dados` | AES-GCM output of the **UTF-8 JSON document** described in §8.2, with AAD = `id || \0 || "acessos"`. |

`descricao`, `descricaoCifrada`, `kdf`, the salts, the verifier and `iv` keep the meaning and
the derivations of §2 and §3. `criadoEm` is the creation date of the book, not of the entries.

### 8.2 Payload

```json
{
  "acessos": [
    {
      "id": "7d1c4c7e-4c0a-4fd2-9a63-2e4d1d6b3f10",
      "servico": "Netflix",
      "endereco": "netflix.com",
      "usuario": "someone@example.com",
      "codigoSenha": "4",
      "senha": "",
      "notas": "Family plan, renews in March.",
      "campos": [ { "nome": "PIN", "valor": "1234", "oculto": true } ],
      "criadoEm": "2026-11-02T10:00:00.000Z",
      "atualizadoEm": "2026-11-02T10:00:00.000Z"
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `acessos` | yes | Array of entries, in no particular order. |
| `id` | yes | Random UUID v4 of the entry. |
| `servico` | yes | Name of the service or site. The only mandatory text. |
| `endereco` | no | Address of the site. |
| `usuario` | no | Login, e-mail or user name. |
| `codigoSenha` | no | A short reference to a password kept **outside** the file, for example the number of a line on a piece of paper. Twinlock's recommended way of using a book: the file, even decrypted, does not contain the password. |
| `senha` | no | The password itself, for entries whose owner chose to store it. Empty when not stored. |
| `notas` | no | Free text, may contain line breaks. |
| `campos` | no | Extra name/value pairs. `oculto: true` marks a value to be shown blurred, like a password. |
| `criadoEm`, `atualizadoEm` | no | ISO 8601 timestamps of the entry. |

Unknown fields must be preserved by writers and ignored by readers.

### 8.3 Decryption

```
dados = AES-256-GCM-Encrypt( key = K, iv = iv, aad = UTF8(id || \0 || "acessos"), UTF8(json) )
```

The procedure of §4 applies, with the AAD above in step 3 and `JSON.parse` in step 4. The AAD
suffix guarantees that a wallet ciphertext relabelled as a book, or the reverse, fails
authentication instead of being misread.

### 8.4 Saving changes

A book is rewritten on every change. Twinlock keeps the derived key `K` in memory, as a
non-extractable WebCrypto key, from the moment a book is unlocked until it locks again, so a
save does not ask for the keys or run PBKDF2 again. Each save uses a **fresh random `iv`**,
keeps `id`, the salts, the verifier and `descricaoCifrada` unchanged (they are all bound to the
same `K` and `id`), and updates `atualizadoEm`. Before overwriting, the previous content is
copied to a file with the same name plus `.bak` (for example `a01.json.bak`), which readers
must ignore because it does not end in `.json`.

### 8.5 Test vector

[`tools/sample-book.json`](tools/sample-book.json) is a book created with the same keys as the
wallet vector (§5): access key `test-access-key`, encryption key `test-encryption-key-1`,
2 000 iterations, encrypted label `Sample book`. It holds two entries: `Netflix`
(`someone@example.com`, `codigoSenha` `4`, no stored password) and `Example forum`
(`someone`, stored password `correct horse battery staple`, one hidden extra field `PIN` = `1234`).
