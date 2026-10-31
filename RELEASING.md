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
`twinlock-release-key.asc` and shown in the release notes.

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
