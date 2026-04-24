# Building on GitHub

This repo ships with two workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `build.yml` | Push or PR to `master` | Compiles TypeScript, builds the Docker image, packs an unsigned `.s9pk`. Sanity check — nothing is published. |
| `release.yml` | Push of a `v*.*` tag | Builds `.s9pk` for x86_64 and aarch64 and attaches them to a **GitHub Release**. |

Both use the official [`start9labs/shared-workflows`](https://github.com/Start9Labs/shared-workflows) reusable workflows, which is the same plumbing Start9's own service repos use.

## One-time setup

### 1. Create a developer signing key

StartOS packages must be signed. You need a long-lived Ed25519 key.

On any Linux/macOS machine with `start-cli` installed:

```bash
start-cli init-key                                 # writes ~/.startos/developer.key.pem
cat ~/.startos/developer.key.pem                   # copy this whole block
```

Don't have `start-cli` locally? Generate one with `openssl`:

```bash
openssl genpkey -algorithm ED25519 -out developer.key.pem
cat developer.key.pem
```

### 2. Add it as a repo secret

1. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `DEV_KEY`
3. Value: paste the entire PEM including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.

> ⚠️ **Back this key up.** If you lose it, users who installed prior releases won't be able to update — every new release must be signed by the same key.

### 3. (Optional) The other secrets

`release.yml` also references `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `RELEASE_REGISTRY`, and `S3_S9PKS_BASE_URL`. These are only used if you want to publish to an s9pk registry + S3 bucket like Start9 does. **Leave them unset and the workflow will just attach the `.s9pk` files to the GitHub Release** — which is what you want.

### 4. Update the manifest URLs

Open `startos/manifest/index.ts` and replace every occurrence of `YOURNAME` with your GitHub username (or whatever the final repo URL will be):

```ts
packageRepo:   'https://github.com/YOURNAME/local-outings-startos',
upstreamRepo:  'https://github.com/YOURNAME/local-outings-startos',
marketingUrl:  'https://github.com/YOURNAME/local-outings-startos',
docsUrls:     ['https://github.com/YOURNAME/local-outings-startos/blob/master/README.md'],
```

Commit and push.

## Cutting a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Within ~10 minutes, the **Release** workflow finishes and you'll have a GitHub Release with two assets:

- `local-outings_x86_64.s9pk`
- `local-outings_aarch64.s9pk`

Grab the one that matches your StartOS server's architecture and sideload it via the StartOS UI (**System → Sideload a service**).

## Development loop

While iterating, push to `master` and watch the **Build** workflow on the Actions tab. If it's red, read the logs — the first failure is usually in `npm run check` (TypeScript) or `docker build`.

For faster local iteration, you can skip GitHub entirely:

```bash
npm install
make arch/x86_64   # builds local-outings_x86_64.s9pk locally
make install       # sideloads to server defined in ~/.startos/config.yaml
```

## Which tag format?

The `release.yml` trigger is `v*.*` so any of these work:

- `v1.0.0` ✓
- `v1.0.0-beta.1` ✓
- `v2.3` ✓
- `v1` ✗ (no dot, won't fire)
- `1.0.0` ✗ (no `v` prefix)

Match the `version` in `startos/versions/v1.0.0.ts` to the tag when you release — i.e. if you tag `v1.1.0`, first bump the file to `1.1.0:0` and create a matching `VersionInfo` entry.
