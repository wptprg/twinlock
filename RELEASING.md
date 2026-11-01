# Releasing Twinlock (maintainer notes)

Every release must let a stranger verify that the file they downloaded is the one you built.

## 1. Before tagging

```bash
node tests/run.js            # all tests must pass
```

Update `VERSAO` in `twinlock.html`, the entry in `CHANGELOG.md`, and make sure
`URL_OFICIAL` in the page points to this repository.

## 2. Hash

```bash
sha256sum twinlock.html > SHA256SUMS
```

(PowerShell: `(Get-FileHash twinlock.html -Algorithm SHA256).Hash.ToLower() + "  twinlock.html" | Out-File -Encoding ascii SHA256SUMS`)

## 3. Sign

Use a GPG key that exists only for this project and whose public key is committed as
`twinlock-release-key.asc` and shown in the release notes. Current key:

```
7823 EC86 0CD1 CD49 7C9C  0B66 A98E 07B1 4154 21FF
```

### Creating the key (done once)

On Windows, `gpg` ships with Git for Windows but is not on the PATH of PowerShell. Either use
Git Bash, or add it for the current window: `$env:Path += ";C:\Program Files\Git\usr\bin"`.
Use `--output` instead of `>` for every export: PowerShell redirection writes a BOM, which
corrupts `.asc` files.

```bash
gpg --full-generate-key                     # ECC (sign and encrypt), Curve 25519, 2y,
                                            # name "Twinlock Release Key", strong passphrase
gpg --list-secret-keys --keyid-format long  # note the id after "ed25519/"
gpg --armor --output twinlock-release-key.asc --export <ID>
gpg --armor --output /secure/offline/place/twinlock-release-key-PRIVATE.asc --export-secret-keys <ID>
```

Back up, offline and outside the repository: the private key export above and the revocation
certificate GnuPG created in `~/.gnupg/openpgp-revocs.d/`. Then tell git to sign everything:

```bash
git config gpg.program "C:/Program Files/Git/usr/bin/gpg.exe"   # Windows only
git config user.signingkey <ID>
git config commit.gpgsign true
git config tag.gpgsign true
```

Renew before the expiry date with `gpg --edit-key <ID>` then `expire`, re-export the public
key and commit it; the fingerprint does not change.

### Signing a release

```bash
gpg --armor --detach-sign SHA256SUMS      # produces SHA256SUMS.asc
```

Users verify with:

```bash
gpg --import twinlock-release-key.asc
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

## 4. Tag and publish

```bash
git tag -s v1.0.0 -m "Twinlock 1.0.0"
git push origin main --tags
```

Create the GitHub Release from the tag and attach **exactly three files**:
`twinlock.html`, `SHA256SUMS`, `SHA256SUMS.asc`. Paste the SHA-256 in the release notes
as plain text too, so it is visible without downloading anything.

## 5. After publishing

* Open the released `twinlock.html` from a USB stick, offline, and run through: new wallet,
  open wallet, wrong keys, delete.
* Run `node tools/recover.mjs` against a file created by the released page.
* Never re-upload a changed file under the same version. A fix is a new version.
