# Twinlock

**Your recovery phrase, encrypted. One file, two keys, no internet.**

Twinlock is a single HTML file that encrypts the 12, 18 or 24 words of a crypto wallet
(BIP39 recovery phrase) so you can keep them anywhere, on a USB stick, in a drawer, in the
cloud, without anyone being able to read them. To see the words again you need the file,
the Twinlock page and **two keys that only you know**.

*Leia em [português](README.pt-BR.md).*

---

## Why

Writing a recovery phrase on paper is fragile: it burns, fades, gets lost, gets photographed.
Steel plates are better, but they still sit in one physical place. Twinlock lets you keep
encrypted copies in several places, physical or virtual, while the thing that matters stays
in your head: two keys.

## How it works

1. You open `twinlock.html` in Chrome, Edge or Firefox. **No internet needed, ever.**
2. You choose a folder (a second USB stick, for example) where the encrypted files live.
3. For each wallet you type a short label, an **access key**, an **encryption key** and the words.
4. Twinlock derives an AES-256 key from both of your keys (PBKDF2, one million iterations)
   and writes one small JSON file per wallet. The words, and optionally the label, exist in that
   file only in encrypted form. Your keys are never written anywhere.
5. To read a wallet you click its card, type the two keys, and the words appear, one at a
   time as you hover them, with automatic re-locking after two minutes.

Someone who finds the USB stick with the HTML sees an empty program. Someone who finds the
files sees random data. Someone who finds both still needs your two keys.

## Access books: the passwords for everything else

Since version 1.1 the same folder can hold **access books**: one encrypted file with your
list of logins (streaming, e-mail, bank, forums), each with the service, the user name, a
**password code** and notes. The code is Twinlock's recommended way of using a book: keep the
passwords themselves on a piece of paper, numbered, and write only the number in the book.
Even decrypted, the file then reveals which accounts exist, never their passwords. For
accounts that do not deserve the paper you can store the password in the entry instead; it is
shown blurred, revealed on hover, and "Copy" clears the clipboard after 20 seconds.

A book opens like a wallet, with its two keys, and shows a searchable list. Adding or editing
an entry re-encrypts the whole file with a fresh nonce; the previous version is kept as
`a01.json.bak`. The book locks itself after two minutes without activity or when the tab loses
focus, exactly like the words. The file format is in [SPEC.md](SPEC.md#8-access-book--twinlock-acessos1).

## Quick start

1. Download `twinlock.html` from the [latest release](https://github.com/wptprg/twinlock/releases/latest).
2. **Verify it** (see [Verifying the download](#verifying-the-download)).
3. Copy it to a USB stick or any folder. Double-click it. It opens in your browser.
4. Click **Choose folder** and pick where the encrypted files should live.
5. Click **New wallet** and follow the three steps.

Twinlock remembers the folder between sessions (only a reference to it, never its content).

## Verifying the download

Every release publishes the SHA-256 of `twinlock.html`. Compare it with the file you have:

```powershell
# Windows (PowerShell)
Get-FileHash twinlock.html -Algorithm SHA256
```

```bash
# macOS
shasum -a 256 twinlock.html
```

```bash
# Linux
sha256sum twinlock.html
```

If the hash does not match the one in the release notes, **do not use the file**.
### Checking the signature (optional, stronger)

Every release also ships `SHA256SUMS.asc`, a GPG signature of the hash file made with the
project key. The public key is committed here as [`twinlock-release-key.asc`](twinlock-release-key.asc).
Its fingerprint is:

```
7823 EC86 0CD1 CD49 7C9C  0B66 A98E 07B1 4154 21FF
```

```bash
gpg --import twinlock-release-key.asc
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS          # macOS: shasum -a 256 -c SHA256SUMS
```

`gpg --verify` must say "Good signature" and show the fingerprint above. A different
fingerprint means a different key, not a different version: **do not use the file**.

Twinlock is deliberately a single, readable, unminified file with no build step and no
dependencies. Anyone can open it in a text editor and audit the roughly 1 900 lines of code.
The page itself shows its version and the official source address in the footer.

## What Twinlock protects against, and what it does not

**Protects against**

* Loss or theft of the files: without both keys they are useless.
* Loss or theft of the HTML: it contains nothing of yours.
* Tampered files: any modification makes decryption fail (AES-GCM authentication).
* Casual observation: words are blurred and shown one at a time; the screen re-locks on its own.

**Does not protect against**

* **Forgetting a key.** There is no recovery. None. Write down a hint for yourself if you must,
  never the key itself next to the files.
* A compromised computer (keylogger, malware, screen capture). Use a machine you trust.
* Weak keys when the files are stored online. If anyone can download your files, they can try
  keys offline without limit. Use long keys (20+ characters combined) and encrypt the label.
* Someone who has both keys. Keep them separate, and separate from the files.

## Recovering your words without Twinlock

Twinlock's file format is fully documented in [SPEC.md](SPEC.md) and uses only standard
algorithms (PBKDF2-HMAC-SHA256 and AES-256-GCM). If this project, the browser or the HTML
file ever disappear, you can still recover your words, or the entries of an access book, with
a few lines of code:

* [`tools/recover.mjs`](tools/recover.mjs): Node.js, no dependencies.
* [`tools/recover.py`](tools/recover.py): Python 3 with the `cryptography` package.

```bash
node tools/recover.mjs c01.json
```

```bash
node tools/recover.mjs a01.json
```

[`tools/sample-wallet.json`](tools/sample-wallet.json) and [`tools/sample-book.json`](tools/sample-book.json)
are public test files; their keys are in SPEC.md.

## Languages

The interface is available in English, Portuguese and Spanish. It follows your browser's
language and can be switched from the menu in the top-right corner. The words themselves are
always English, which is what every hardware and software wallet uses.

## Manual mode

Firefox and Safari do not let a web page write directly to a folder. In those browsers
Twinlock falls back to manual mode: you load your `.json` files to see the cards, and each
new wallet is downloaded for you to move to the right place. Everything else is identical.

## Frequently asked questions

**Is it safe to keep the files in Google Drive / iCloud / e-mail?**
Safer than paper, as long as your keys are strong and you tick "Also encrypt the description".
Read the section above about what Twinlock does not protect against.

**Can I store something other than a BIP39 phrase?**
Wallets hold only BIP39 phrases: Twinlock validates the words against the official English
list, including the checksum, because a typo in a recovery phrase is the worst kind of error.
For everything else (site logins, PINs, notes) create an access book, described above.

**Should a book use the same keys as my wallets?**
It can, but you will type the book's keys far more often than a wallet's, and what is typed
often is more exposed to a tampered keyboard or screen. Different keys for the book keep a
leak there away from your wallets.

**Why two keys instead of one strong password?**
Because people reuse passwords and write them down. Two keys that you keep in different
places (one memorised, one on a card in a safe, for example) are harder to lose together.

**Does the page send anything anywhere?**
No. The file contains a Content-Security-Policy that forbids all network access, and you can
read the code to confirm there is no network call in it. It works with the Wi-Fi off.

**Why not an app?**
An app has to be installed, updated and trusted. A single HTML file runs on any computer
with a browser, now and in ten years, and can be audited by anyone.

## Support the project

Twinlock is free and will stay free. If it helps you, you can support its maintenance:

* Bitcoin (BTC): `14Udp9aA1woSDCQhcwKVDLricHRkr8yvy8`
* Ethereum (ETH): `0xEd9BC7282a522879569dd7c670054ac8684a62Af`

The same addresses, with QR codes, are on the [website](https://wptprg.github.io/twinlock/#apoiar).
Before sending, compare the address shown there with the one here: donation addresses are a
classic target for tampering.

## Security

Found a vulnerability? Please read [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Copyright © 2026 Waldir P Thomaz.
