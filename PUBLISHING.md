# Publishing dsh-oh-my-pi

The plugin is packaged and verified. Two credential-gated steps remain; both
need a GitHub account (and, for npm, an npm account).

## What is already done

| Step | State |
|---|---|
| Package renamed to `dsh-oh-my-pi` and restructured to a repo-root layout | done |
| Publish-safe defaults (`pi` on `PATH`, no local paths, no keys in the bundle) | done |
| `engines.dsh` + `peerDependencies` + `LICENSE` + English/Chinese READMEs | done |
| Storefront tile `assets/icon-180.png` | done |
| `npm pack` → `dsh-oh-my-pi-0.1.0.tgz` (17 files, no dev files) | done |
| Verified in the running profile: tool `subagent_omp`, sidebar entry, panel, run log | done |
| Git repository with one commit on `main` | done |
| Catalog entry `catalog/dsh-oh-my-pi.yml` | done (placeholders `OWNER`) |

## 1. Create the GitHub repository

```sh
cd D:/codes/dsh-plugin-omp
# create the repo in your account (name: dsh-oh-my-pi, public, with a README/LICENSE)
git remote add origin https://github.com/OWNER/dsh-oh-my-pi.git
git push -u origin main
```

Add the `dsh-plugin` topic to the repository — the curated list expects it.

## 2. Replace the OWNER placeholders

```sh
# in package.json, README.md, README.zh.md and catalog/dsh-oh-my-pi.yml
# replace OWNER with your GitHub account name, then:
git add -A && git commit -m "Fill in the repository owner" && git push
```

## 3. Cut the release (prebuilt tarball)

Upload `dsh-oh-my-pi-0.1.0.tgz` as an asset of the release **v0.1.0**
(tag exactly `v0.1.0`). The catalog entry already points at
`https://github.com/OWNER/dsh-oh-my-pi/releases/download/v0.1.0/dsh-oh-my-pi-0.1.0.tgz`;
a pinned tag does not rot when a later release ships.

```sh
gh release create v0.1.0 dsh-oh-my-pi-0.1.0.tgz --title "v0.1.0" --notes "First release."
```

## 4. Publish to npm (optional but recommended)

The market prefers a registry package: prebuilt installs skip pnpm's
build-approval step.

```sh
npm login            # or: npm token create
npm publish --access public
```

`dsh-oh-my-pi` is free on the npm registry (checked 2026-11-21).

## 5. Open the catalog PR

The curated list is `awesome-dsh-plugin/awesome-dsh-plugin`; its entries live
in `data/plugins/<owner>__<repo>.yml`, one file per plugin.

```sh
git clone https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git
cd awesome-dsh-plugin
mkdir -p data/plugins
cp /d/codes/dsh-plugin-omp/catalog/dsh-oh-my-pi.yml data/plugins/OWNER__dsh-oh-my-pi.yml
# edit the OWNER placeholders, then:
git checkout -b add/dsh-oh-my-pi
git add data/plugins/OWNER__dsh-oh-my-pi.yml
git commit -m "Add dsh-oh-my-pi"
git push origin add/dsh-oh-my-pi
```

Then open a pull request against `main` in the browser. The CI checks the
entry's shape; the website and the dsh-market plugin rebuild automatically
after the merge (usually within a day).

Two requirements to keep in mind:

- **The repository must be at least one day old** — CI checks this
  automatically, so a repository created minutes ago is held back.
- Only `description.en` is required; the Chinese line is a bonus.

## Local profile configuration

The published bundle defaults to `pi` on the host `PATH`. A machine whose pi
lives elsewhere overrides the row in the profile's `cordis.patch.yml`:

```yaml
- id: subagent-oh-my-pi
  name: 'dsh-oh-my-pi'
  config:
    providerName: omp
    timeoutMs: 900000
    disposeGraceMs: 3000
    # Optional overrides, filled in per machine.
    # cliPath: '<absolute path to the pi CLI>'
    # model: '<provider>/<model>'
    # thinkingLevel: '<off|minimal|low|medium|high|xhigh|max>'
    # apiKeyEnv: '<credential name>'
```

`apiKeyEnv` names a credential in the Harness credential store; the provider
reads it through the credential service and hands it to the child process, so
the key is never copied into oh-my-pi's own configuration.
