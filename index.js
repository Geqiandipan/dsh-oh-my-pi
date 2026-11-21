/**
 * dsh-plugin-omp — Host half.
 *
 * Registers one profile-named `omp` subagent provider. Every accepted run
 * starts a fresh, unattended oh-my-pi (the `pi` coding agent CLI with the
 * oh-my-pi orchestrator extension) in the delegating Session's workspace and
 * returns only its final answer.
 *
 * The module deliberately imports nothing outside `node:` builtins: the
 * subagent seam's contracts are structural, and a bundle that resolves no
 * bare specifier loads identically whether the installer linked the checkout
 * or copied it into the profile.
 *
 * The run log lives in a file under the harness home, not in module state:
 * one Harness process can mount this plugin in more than one composition, and
 * each composition loads its own module instance. A file is the one place
 * every instance agrees on, and it also keeps the history across restarts.
 *
 * @module dsh-plugin-omp
 */

import { randomUUID } from 'node:crypto'
import { accessSync, constants, statSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'

/** Plugin name shown by the Loader. */
export const name = 'subagent-omp'

/** Services this provider needs: the subagent seam and the subprocess seam. */
export const inject = ['subagents', 'subprocess']

/** Default registry name of the provider on `ctx.subagents`. */
const DEFAULT_PROVIDER_NAME = 'omp'

/** Default executable, resolved through the host `PATH`. */
const DEFAULT_COMMAND = 'pi'

/** Default wall-clock budget for one delegated run. */
const DEFAULT_TIMEOUT_MS = 900_000

/** Default grace between the subprocess seam's termination tiers. */
const DEFAULT_DISPOSE_GRACE_MS = 3_000

/** How many finished runs the status route remembers. */
const MAX_HISTORY = 20

/** How much of a finished answer the status route exposes. */
const MAX_PREVIEW = 240

/** Path of the status resource the browser panel reads. */
const STATUS_PATH = '/omp/status'

/** Name of the run log inside the harness storage directory. */
const LOG_FILE = 'omp-runs.json'

/**
 * Read one string field from a raw configuration object.
 * @param {unknown} value - the raw field value.
 * @param {string} fallback - the value used when the field is absent or blank.
 * @returns {string} the accepted string.
 */
function text(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

/**
 * Read one string-array field from a raw configuration object.
 * @param {unknown} value - the raw field value.
 * @returns {string[]} the accepted entries, ignoring non-strings.
 */
function textList(value) {
  if (!Array.isArray(value)) return []
  return value.filter(entry => typeof entry === 'string')
}

/**
 * Read one positive finite number field from a raw configuration object.
 * @param {unknown} value - the raw field value.
 * @param {number} fallback - the value used when the field is absent or invalid.
 * @param {string} name - the field name, for the diagnostic.
 * @returns {number} the accepted number.
 */
function positiveNumber(value, fallback, name) {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`subagent-omp: ${name} must be a positive finite number`)
  }
  return value
}

/**
 * Normalize the raw row configuration into the provider's resolved settings.
 *
 * The plugin declares no Config schema, so the Loader hands the row's raw
 * configuration to `apply` unchanged; every field is therefore validated
 * here and every absent field falls back to a documented default.
 *
 * @param {unknown} raw - the raw row configuration.
 * @returns {object} the resolved settings.
 */
function resolveSettings(raw) {
  const config = raw === null || typeof raw !== 'object' ? {} : raw
  const env = {}
  const rawEnv = config.env
  if (rawEnv !== null && typeof rawEnv === 'object' && !Array.isArray(rawEnv)) {
    for (const [key, value] of Object.entries(rawEnv)) {
      if (typeof value === 'string') env[key] = value
    }
  }
  return {
    providerName: text(config.providerName, DEFAULT_PROVIDER_NAME),
    command: text(config.command, DEFAULT_COMMAND),
    commandArgs: textList(config.commandArgs),
    cliPath: text(config.cliPath, ''),
    nodePath: text(config.nodePath, ''),
    model: text(config.model, ''),
    thinkingLevel: text(config.thinkingLevel, ''),
    extraArgs: textList(config.extraArgs),
    env,
    apiKeyEnv: text(config.apiKeyEnv, ''),
    timeoutMs: positiveNumber(config.timeoutMs, DEFAULT_TIMEOUT_MS, 'timeoutMs'),
    disposeGraceMs: positiveNumber(config.disposeGraceMs, DEFAULT_DISPOSE_GRACE_MS, 'disposeGraceMs'),
  }
}

/**
 * The absolute path of the run log inside the harness storage directory.
 * @returns {string} the log file path.
 */
function logPath() {
  const home = process.env.DSH_HOME
  const base = home !== undefined && home !== '' ? home : join(homedir(), '.dsh')
  return join(base, 'storages', LOG_FILE)
}

/**
 * Read the remembered runs.
 * @returns {Promise<object[]>} the recorded runs, newest first.
 */
async function readRuns() {
  try {
    const parsed = JSON.parse(await readFile(logPath(), 'utf8'))
    return Array.isArray(parsed?.runs) ? parsed.runs : []
  } catch {
    // A missing or unreadable log is an empty log: the provider still works.
    return []
  }
}

/**
 * Write the remembered runs, replacing the log atomically.
 * @param {object[]} runs - the runs to publish.
 * @returns {Promise<void>} completion of the write.
 */
async function writeRuns(runs) {
  const path = logPath()
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.tmp`
  await writeFile(temporary, `${JSON.stringify({ version: 1, runs }, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

/**
 * Insert or replace one run in the log.
 * @param {object} record - the run to store.
 * @returns {Promise<void>} completion of the write.
 */
async function saveRun(record) {
  const runs = await readRuns()
  const index = runs.findIndex(run => run.id === record.id)
  if (index >= 0) runs.splice(index, 1)
  runs.unshift(record)
  runs.length = Math.min(runs.length, MAX_HISTORY)
  await writeRuns(runs)
}

/**
 * Summarize the remembered runs.
 * @param {object[]} runs - the recorded runs.
 * @returns {object} the counters the status route publishes.
 */
function summarize(runs) {
  let completed = 0
  let failed = 0
  let aborted = 0
  for (const run of runs) {
    if (run.status === 'completed') completed++
    else if (run.status === 'aborted') aborted++
    else if (run.status !== 'running') failed++
  }
  return { runs: runs.length, completed, failed, aborted }
}

/**
 * Whether a directory exists and can be entered.
 * @param {string} path - the candidate directory.
 * @returns {boolean} whether the harness can use it as a child working directory.
 */
function isEnterableDirectory(path) {
  try {
    if (!statSync(path).isDirectory()) return false
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Assert the child working directory can host the delegated run.
 * @param {string} prefix - the diagnostic prefix.
 * @param {string} label - the source of the value, for the diagnostic.
 * @param {string} cwd - the candidate working directory.
 * @returns {string} the validated directory.
 */
function assertUsableCwd(prefix, label, cwd) {
  if (!isAbsolute(cwd)) {
    throw new Error(`${prefix}: ${label} must be an absolute path: ${cwd}`)
  }
  if (!isEnterableDirectory(cwd)) {
    throw new Error(`${prefix}: ${label} is not an accessible directory: ${cwd}`)
  }
  return cwd
}

/**
 * Collect the one-shot task as plain text.
 * @param {readonly {type: string, text?: string}[]} prompt - the task blocks.
 * @returns {string} the task text.
 */
function textTask(prompt) {
  if (!Array.isArray(prompt) || prompt.length === 0) {
    throw new Error('subagent-omp: the one-shot task must contain only text blocks')
  }
  const texts = []
  for (const block of prompt) {
    if (block === null || typeof block !== 'object' || block.type !== 'text' || typeof block.text !== 'string') {
      throw new Error('subagent-omp: the one-shot task must contain only text blocks')
    }
    texts.push(block.text)
  }
  const task = texts.join('\n\n').trim()
  if (task === '') throw new Error('subagent-omp: the one-shot task must not be empty')
  return task
}

/**
 * Read the final answer out of one pi message.
 * @param {unknown} message - the message carried by a pi event.
 * @returns {string} the message's text, or an empty string.
 */
function extractText(message) {
  if (message === null || typeof message !== 'object') return ''
  const content = message.content
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

/**
 * The one-shot omp provider.
 */
class OmpProvider {
  /**
   * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
   * @param {object} settings - the resolved settings.
   */
  constructor(ctx, settings) {
    this.ctx = ctx
    this.settings = settings
    this.name = settings.providerName
    /** Identity of this provider instance, for the status diagnostics. */
    this.instanceId = randomUUID()
    /** An out-of-process child honors no parent-enforced start capability. */
    this.capabilities = Object.freeze({
      agentOptions: false,
      agentPreset: false,
      outputSchema: false,
      depthLimit: false,
    })
    this.inheritsParentContext = false
  }

  /**
   * The executable the child process runs.
   * @returns {string} the program path or command name.
   */
  program() {
    if (this.settings.cliPath !== '') {
      return this.settings.nodePath !== '' ? this.settings.nodePath : process.execPath
    }
    return this.settings.command
  }

  /**
   * The complete argument vector for one delegated run.
   * @param {string} task - the one-shot task text.
   * @returns {string[]} the argument vector.
   */
  argv(task) {
    const args = []
    if (this.settings.cliPath !== '') args.push(this.settings.cliPath)
    args.push(...this.settings.commandArgs)
    // One unattended turn: print mode, machine-readable events, no session file.
    args.push('-p', '--mode', 'json', '--no-session')
    if (this.settings.model !== '') args.push('--model', this.settings.model)
    if (this.settings.thinkingLevel !== '') args.push('--thinking', this.settings.thinkingLevel)
    args.push(...this.settings.extraArgs)
    args.push(task)
    return [this.program(), ...args]
  }

  /**
   * The environment layered over the subprocess seam's scrubbed parent base.
   * @returns {Promise<Record<string, string>>} the explicit environment entries.
   */
  async childEnv() {
    const env = { ...this.settings.env }
    if (this.settings.cliPath !== '' && this.settings.nodePath === '' && process.versions.electron !== undefined) {
      // The desktop host runs inside Electron; that binary executes plain
      // Node only when the runtime is told to.
      env.ELECTRON_RUN_AS_NODE = '1'
    }
    if (this.settings.apiKeyEnv !== '') {
      const key = await this.resolveApiKey()
      if (key !== undefined) env[this.settings.apiKeyEnv] = key
    }
    return env
  }

  /**
   * Read the provider's API key from the credential seam, then the ambient environment.
   * @returns {Promise<string | undefined>} the key, when one is available.
   */
  async resolveApiKey() {
    const ref = this.settings.apiKeyEnv
    const credentials = this.ctx.get('credentials')
    if (credentials !== undefined) {
      try {
        const resolved = await credentials.resolve(ref)
        if (resolved !== undefined && typeof resolved.value === 'string' && resolved.value !== '') {
          return resolved.value
        }
      } catch (error) {
        this.ctx.logger.warn(`subagent-omp: could not read the credential "${ref}": %o`, error)
      }
    }
    const ambient = process.env[ref]
    return typeof ambient === 'string' && ambient !== '' ? ambient : undefined
  }

  /**
   * Record one run in the shared log.
   * @param {object} record - the run to store.
   * @returns {Promise<void>} completion of the write.
   */
  async record(record) {
    try {
      await saveRun(record)
    } catch (error) {
      this.ctx.logger.warn('subagent-omp: could not write the run log: %o', error)
    }
  }

  /**
   * Start one delegated omp run.
   * @param {object} request - the resolved subagent request.
   * @returns {Promise<object>} the published run handle.
   */
  async start(request) {
    let cwd
    try {
      cwd = assertUsableCwd('subagent-omp', 'child cwd', request.cwd)
    } catch (error) {
      if (request.signal.aborted) {
        throw new Error('subagent-omp: request was aborted before startup')
      }
      throw error
    }
    const task = textTask(request.prompt)
    if (request.signal.aborted) {
      throw new Error('subagent-omp: request was aborted before startup')
    }
    const env = await this.childEnv()
    const argv = this.argv(task)
    const id = randomUUID()
    const record = {
      id,
      provider: this.name,
      startedAt: Date.now(),
      endedAt: undefined,
      status: 'running',
      durationMs: undefined,
      exitCode: undefined,
      preview: '',
    }
    await this.record(record)

    let child
    try {
      child = this.ctx.subprocess.spawn({
        argv,
        cwd,
        stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
        graceMs: this.settings.disposeGraceMs,
        env,
        signal: request.signal,
      })
    } catch (error) {
      const code = error !== null && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'unknown'
      record.status = 'failed'
      record.endedAt = Date.now()
      record.durationMs = record.endedAt - record.startedAt
      await this.record(record)
      throw new Error(`subagent-omp: failed to start the omp process (${code})`)
    }

    return this.runChild(request, child, record)
  }

  /**
   * Consume the child's output and settle the run.
   * @param {object} request - the resolved subagent request.
   * @param {object} child - the subprocess handle.
   * @param {object} record - the remembered run.
   * @returns {object} the published run handle.
   */
  runChild(request, child, record) {
    const settings = this.settings
    let pending = ''
    let answer = ''
    let stderrTail = ''
    let cancelled = false
    let timedOut = false

    const consume = (line) => {
      const text = line.trim()
      if (text === '') return
      let event
      try {
        event = JSON.parse(text)
      } catch {
        return
      }
      if (event === null || typeof event !== 'object') return
      if (event.type !== 'turn_end' && event.type !== 'message_end') return
      const extracted = extractText(event.message)
      if (extracted !== '') answer = extracted
    }

    const onStdout = (chunk) => {
      pending += chunk.toString('utf8')
      let index = pending.indexOf('\n')
      while (index >= 0) {
        const line = pending.slice(0, index)
        pending = pending.slice(index + 1)
        consume(line)
        index = pending.indexOf('\n')
      }
    }
    const onStderr = (chunk) => {
      stderrTail = `${stderrTail}${chunk.toString('utf8')}`.slice(-800)
    }
    child.stdout?.on('data', onStdout)
    child.stderr?.on('data', onStderr)

    const onAbort = () => { cancelled = true }
    request.signal.addEventListener('abort', onAbort, { once: true })

    const timer = setTimeout(() => {
      timedOut = true
      child.terminate()
    }, settings.timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      request.signal.removeEventListener('abort', onAbort)
      child.stdout?.off('data', onStdout)
      child.stderr?.off('data', onStderr)
    }

    /** Settle the remembered run and publish it to the shared log. */
    const settle = async (status, exitCode) => {
      record.status = status
      record.endedAt = Date.now()
      record.durationMs = record.endedAt - record.startedAt
      record.exitCode = exitCode
      record.preview = answer.slice(0, MAX_PREVIEW)
      await this.record(record)
    }

    const result = (async () => {
      let outcome
      try {
        outcome = await child.done
      } catch (error) {
        cleanup()
        await settle('failed', undefined)
        this.ctx.logger.warn('subagent-omp: the delegated run failed: %o', error)
        return {
          output: [],
          diagnostic: 'The omp process could not be observed to completion.',
          stopReason: 'error',
        }
      }
      cleanup()
      const exitCode = outcome?.exitCode ?? undefined
      if (cancelled) {
        await settle('aborted', exitCode)
        return {
          output: answer === '' ? [] : [{ type: 'text', text: answer }],
          stopReason: 'aborted',
        }
      }
      if (timedOut) {
        await settle('failed', exitCode)
        return {
          output: answer === '' ? [] : [{ type: 'text', text: answer }],
          diagnostic: `The omp run exceeded its ${settings.timeoutMs} ms budget and was stopped.`,
          stopReason: 'error',
        }
      }
      if (exitCode !== undefined && exitCode !== 0) {
        await settle('failed', exitCode)
        if (stderrTail !== '') this.ctx.logger.debug('subagent-omp: child stderr: %s', stderrTail)
        return {
          output: answer === '' ? [] : [{ type: 'text', text: answer }],
          diagnostic: `The omp process exited with code ${String(exitCode)}.`,
          stopReason: 'error',
        }
      }
      if (answer === '') {
        await settle('failed', exitCode)
        if (stderrTail !== '') this.ctx.logger.debug('subagent-omp: child stderr: %s', stderrTail)
        return {
          output: [],
          diagnostic: 'The omp process finished without a final answer.',
          stopReason: 'error',
        }
      }
      await settle('completed', exitCode)
      return { output: [{ type: 'text', text: answer }], stopReason: 'completed' }
    })()

    let disposal
    return {
      id: record.id,
      result,
      dispose() {
        if (disposal !== undefined) return disposal
        clearTimeout(timer)
        request.signal.removeEventListener('abort', onAbort)
        child.terminate()
        disposal = child.done.then(() => undefined, () => undefined)
        return disposal
      },
    }
  }
}

/**
 * Register the omp provider and, when the host serves HTTP, the status route.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 * @param {unknown} raw - the row configuration.
 */
export function apply(ctx, raw) {
  const settings = resolveSettings(raw)
  const provider = new OmpProvider(ctx, settings)
  ctx.subagents.registerProvider(provider)
  ctx.logger.info(
    'subagent-omp: provider "%s" registered (instance: %s, program: %s, model: %s)',
    provider.name,
    provider.instanceId,
    provider.program(),
    settings.model === '' ? 'omp default' : settings.model,
  )

  // The status route is optional: a composition without the web server keeps
  // the provider working and simply serves no panel data.
  ctx.inject(['webServer'], (child) => {
    const route = {
      kind: 'exact',
      path: STATUS_PATH,
      resource: async () => {
        const runs = await readRuns()
        const body = {
          provider: settings.providerName,
          tool: 'subagent_omp',
          model: settings.model,
          thinkingLevel: settings.thinkingLevel,
          program: provider.program(),
          cliPath: settings.cliPath,
          nodePath: settings.nodePath,
          command: settings.command,
          apiKeyEnv: settings.apiKeyEnv,
          apiKeyConfigured: settings.apiKeyEnv === '' ? true : await provider.resolveApiKey() !== undefined,
          timeoutMs: settings.timeoutMs,
          totals: summarize(runs),
          runs: runs.map(run => ({
            id: run.id,
            status: run.status,
            startedAt: run.startedAt,
            endedAt: run.endedAt,
            durationMs: run.durationMs,
            exitCode: run.exitCode,
            preview: run.preview,
          })),
          logPath: logPath(),
        }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        })
      },
    }
    child.effect(() => child.webServer.register(route), 'subagent-omp: status route')
  })
}
