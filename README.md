# dsh-oh-my-pi

Delegate a task from DeepSeek Harness to your local **oh-my-pi** coding agent,
and watch what it did from the **OMP** entry in the left sidebar.

- **Host half** — one one-shot subagent provider (`omp`) on the Harness
  subagent seam, plus the `subagent_omp` tool every Agent can call.
- **Browser half** — a left-sidebar entry and a panel showing the provider's
  configuration, its runtime, and the runs it has finished.

The provider starts a fresh, unattended `pi` session (the Pi CLI, with the
oh-my-pi orchestrator extension when it is installed) in the delegating
Session's workspace and returns **only its final answer**. Reasoning, tool
traffic, and stderr stay in the child process.

## Requirements

The plugin does **not** install oh-my-pi. Install the CLI and its extension
first:

```sh
# the Pi CLI
npm install -g @earendil-works/pi-coding-agent

# the oh-my-pi orchestrator extension (optional but recommended)
pi install npm:oh-my-pi
```

`pi` must be on the host `PATH`, or you point the bundle at it with
`cliPath` (see [Configuration](#configuration)).

The plugin itself needs **DeepSeek Harness 0.2.2 or newer**.

## Install

From npm:

```sh
dsh plugin --profile <profile> add dsh-oh-my-pi
```

From source:

```sh
dsh plugin --profile <profile> add github:Geqiandipan/dsh-oh-my-pi
```

Then restart the host if the installer asks for it. The **OMP** entry appears
in the left sidebar; the `subagent_omp` tool is available to every Agent.

## Configuration

The bundle's defaults need no local paths: the provider runs `pi` from the
host `PATH`. Change them in your profile's `cordis.patch.yml`:

```yaml
- id: subagent-oh-my-pi
  name: 'dsh-oh-my-pi'
  config:
    providerName: omp
    timeoutMs: 900000
    disposeGraceMs: 3000
    # Every field below is optional. Uncomment the ones you need and fill in
    # your own values; none of them is required to install the plugin.
    # cliPath: '<absolute path to the pi CLI>'
    # model: '<provider>/<model>'
    # thinkingLevel: '<off|minimal|low|medium|high|xhigh|max>'
    # apiKeyEnv: '<credential name>'
```

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `omp` | Registry name of the provider on `ctx.subagents`. |
| `command` | `pi` | Executable used when `cliPath` is empty; resolved through the host `PATH`. |
| `commandArgs` | `[]` | Arguments placed before the pi flags. |
| `cliPath` | `''` | Absolute path of pi's `dist/cli.js`. When set, the child runs it with the host runtime. |
| `nodePath` | `''` | Node executable used with `cliPath`. Empty means the host runtime. |
| `model` | `''` | Model passed to pi as `--model provider/id`. Empty keeps pi's own selection. |
| `thinkingLevel` | `''` | Thinking level passed to pi as `--thinking`. |
| `extraArgs` | `[]` | Extra pi flags placed after the plugin's own. |
| `env` | `{}` | Explicit environment entries layered over the scrubbed parent environment. |
| `apiKeyEnv` | `''` | Credential reference handed to the child as that environment variable. |
| `timeoutMs` | `900000` | Wall-clock budget for one delegated run. |
| `disposeGraceMs` | `3000` | Grace between the subprocess seam's termination tiers. |

### Credentials

`apiKeyEnv` names a credential in the Harness credential store (the **Models**
page writes it there). The provider reads it through the credential service and
passes it to the child process as that environment variable, so the key never
has to be copied into oh-my-pi's own configuration. Leave the field empty when
oh-my-pi already authenticates on its own.

### Models

By default the child uses whatever model oh-my-pi itself is configured with.
Set `model` to pin a route for delegated runs — `model` takes pi's
`--model provider/id` spelling, and `thinkingLevel` takes pi's `--thinking`
level.

## The OMP panel

The left-sidebar entry opens a page with four sections:

- **Delegation** — the provider name, the tool name, the pinned model and
  thinking level, and the per-run budget.
- **Runtime** — the program the child runs, the CLI path, and whether the
  configured API key resolves.
- **Recent runs** — the finished runs with their status, duration, exit code,
  and a short answer preview.
- **Usage** — how to hand a task to the provider.

The page reads `/omp/status` from the local Harness web server and refreshes
every five seconds. The run list lives in `$DSH_HOME/storages/omp-runs.json`
(the same directory the Harness storage service uses), so it survives a restart
and every Harness process reads the same records: at most the twenty most
recent runs, each with its id, status, duration, exit code, and a short answer
preview. Credentials are never written there.

## Behavior and limits

- One fresh process per delegation: no continuation, no resume, no pooling.
- Only the final answer crosses back into the parent Session. The child's
  reasoning, tool traffic, and stderr stay in the child's own output.
- A cancelled run settles as `aborted`; a failed process settles as `error`
  with a short diagnostic (stage, exit code) and never a raw protocol dump.
- The delegated agent may edit files in the current workspace; the plugin does
  not roll those changes back.
- The provider advertises no start-time capability: it cannot inherit the
  parent's conversation, select its own preset, or enforce a depth limit —
  the same one-shot contract the official Claude Code and Codex subagent
  bundles use.
- Turning the bundle off removes the tool and the sidebar entry. The run log
  stays on disk until you delete it.

## License

MIT
