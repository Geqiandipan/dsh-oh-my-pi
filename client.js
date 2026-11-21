window.__ModuleLoader__.load({
  id: 'dsh-oh-my-pi',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    /** Dictionary namespace owned by this plugin. */
    const NS = 'omp'

    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'omp'

    /** The Host resource that publishes the provider's live status. */
    const STATUS_URL = '/omp/status'

    const en = {
      panel: 'OMP',
      title: 'oh-my-pi delegation',
      subtitle: 'Delegate a task to the local oh-my-pi coding agent.',
      sectionDelegation: 'Delegation',
      sectionRuntime: 'Runtime',
      sectionRuns: 'Recent runs',
      sectionUsage: 'Usage',
      provider: 'Provider',
      tool: 'Tool',
      model: 'Model',
      thinking: 'Thinking level',
      timeout: 'Budget',
      program: 'Program',
      cliPath: 'CLI path',
      apiKey: 'API key',
      configured: 'configured',
      missing: 'not found',
      seconds: '{value}s',
      minutes: '{value}m',
      usageText: 'Ask the agent to hand a task to the omp subagent; it runs a fresh unattended oh-my-pi session in the current workspace and returns the final answer.',
      emptyRuns: 'No delegated run yet.',
      unavailable: 'The host did not answer the status request, so the live state is unavailable.',
      loading: 'Reading the host status…',
      statusRunning: 'Running',
      statusCompleted: 'Completed',
      statusFailed: 'Failed',
      statusAborted: 'Aborted',
      totals: '{completed} completed · {failed} failed · {aborted} aborted',
    }

    const zh = {
      panel: 'OMP',
      title: 'oh-my-pi 委派',
      subtitle: '把任务委派给本地的 oh-my-pi 编码代理。',
      sectionDelegation: '委派',
      sectionRuntime: '运行环境',
      sectionRuns: '最近的运行',
      sectionUsage: '用法',
      provider: '提供方',
      tool: '工具',
      model: '模型',
      thinking: '思考等级',
      timeout: '时间预算',
      program: '程序',
      cliPath: 'CLI 路径',
      apiKey: 'API 密钥',
      configured: '已配置',
      missing: '未找到',
      seconds: '{value} 秒',
      minutes: '{value} 分钟',
      usageText: '让代理把任务交给 omp 子代理：它会在当前工作区里新开一个无人值守的 oh-my-pi 会话，并返回最终答案。',
      emptyRuns: '还没有委派记录。',
      unavailable: '宿主没有返回状态请求，实时状态不可用。',
      loading: '正在读取宿主状态…',
      statusRunning: '运行中',
      statusCompleted: '已完成',
      statusFailed: '失败',
      statusAborted: '已中止',
      totals: '成功 {completed} · 失败 {failed} · 中止 {aborted}',
    }

    const ja = {
      panel: 'OMP',
      title: 'oh-my-pi 委譲',
      subtitle: 'タスクをローカルの oh-my-pi コーディングエージェントに委譲します。',
      sectionDelegation: '委譲',
      sectionRuntime: '実行環境',
      sectionRuns: '最近の実行',
      sectionUsage: '使い方',
      provider: 'プロバイダー',
      tool: 'ツール',
      model: 'モデル',
      thinking: '思考レベル',
      timeout: '予算',
      program: 'プログラム',
      cliPath: 'CLI パス',
      apiKey: 'API キー',
      configured: '設定済み',
      missing: '未検出',
      seconds: '{value} 秒',
      minutes: '{value} 分',
      usageText: 'エージェントに omp サブエージェントへタスクを渡すよう依頼します。現在のワークスペースで新しい無人実行の oh-my-pi セッションが起動し、最終回答が返ります。',
      emptyRuns: '委譲履歴はまだありません。',
      unavailable: 'ホストがステータス要求に応答しないため、ライブ状態は利用できません。',
      loading: 'ホストのステータスを読み込み中…',
      statusRunning: '実行中',
      statusCompleted: '完了',
      statusFailed: '失敗',
      statusAborted: '中止',
      totals: '完了 {completed} · 失敗 {failed} · 中止 {aborted}',
    }

    const es = {
      panel: 'OMP',
      title: 'Delegación a oh-my-pi',
      subtitle: 'Delega una tarea al agente de programación oh-my-pi local.',
      sectionDelegation: 'Delegación',
      sectionRuntime: 'Entorno',
      sectionRuns: 'Ejecuciones recientes',
      sectionUsage: 'Uso',
      provider: 'Proveedor',
      tool: 'Herramienta',
      model: 'Modelo',
      thinking: 'Nivel de razonamiento',
      timeout: 'Presupuesto',
      program: 'Programa',
      cliPath: 'Ruta del CLI',
      apiKey: 'Clave de API',
      configured: 'configurada',
      missing: 'no encontrada',
      seconds: '{value} s',
      minutes: '{value} min',
      usageText: 'Pide al agente que entregue una tarea al subagente omp: ejecuta una sesión oh-my-pi nueva y desatendida en el espacio de trabajo actual y devuelve la respuesta final.',
      emptyRuns: 'Todavía no hay ejecuciones delegadas.',
      unavailable: 'El host no respondió a la petición de estado, así que el estado en vivo no está disponible.',
      loading: 'Leyendo el estado del host…',
      statusRunning: 'En curso',
      statusCompleted: 'Completada',
      statusFailed: 'Fallida',
      statusAborted: 'Abortada',
      totals: '{completed} completadas · {failed} fallidas · {aborted} abortadas',
    }

    const fr = {
      panel: 'OMP',
      title: 'Délégation à oh-my-pi',
      subtitle: 'Déléguez une tâche à l’agent de code oh-my-pi local.',
      sectionDelegation: 'Délégation',
      sectionRuntime: 'Exécution',
      sectionRuns: 'Exécutions récentes',
      sectionUsage: 'Utilisation',
      provider: 'Fournisseur',
      tool: 'Outil',
      model: 'Modèle',
      thinking: 'Niveau de raisonnement',
      timeout: 'Budget',
      program: 'Programme',
      cliPath: 'Chemin du CLI',
      apiKey: 'Clé d’API',
      configured: 'configurée',
      missing: 'introuvable',
      seconds: '{value} s',
      minutes: '{value} min',
      usageText: 'Demandez à l’agent de confier une tâche au sous-agent omp : il exécute une nouvelle session oh-my-pi non surveillée dans l’espace de travail courant et renvoie la réponse finale.',
      emptyRuns: 'Aucune délégation pour l’instant.',
      unavailable: 'L’hôte n’a pas répondu à la demande d’état ; l’état en direct est indisponible.',
      loading: 'Lecture de l’état de l’hôte…',
      statusRunning: 'En cours',
      statusCompleted: 'Terminée',
      statusFailed: 'Échec',
      statusAborted: 'Abandonnée',
      totals: '{completed} terminées · {failed} en échec · {aborted} abandonnées',
    }

    const de = {
      panel: 'OMP',
      title: 'Delegation an oh-my-pi',
      subtitle: 'Delegieren Sie eine Aufgabe an den lokalen oh-my-pi-Coding-Agenten.',
      sectionDelegation: 'Delegation',
      sectionRuntime: 'Laufzeit',
      sectionRuns: 'Letzte Läufe',
      sectionUsage: 'Verwendung',
      provider: 'Anbieter',
      tool: 'Werkzeug',
      model: 'Modell',
      thinking: 'Denkstufe',
      timeout: 'Budget',
      program: 'Programm',
      cliPath: 'CLI-Pfad',
      apiKey: 'API-Schlüssel',
      configured: 'konfiguriert',
      missing: 'nicht gefunden',
      seconds: '{value} s',
      minutes: '{value} min',
      usageText: 'Bitten Sie den Agenten, eine Aufgabe an den omp-Subagenten zu übergeben: er startet eine neue unbeaufsichtigte oh-my-pi-Sitzung im aktuellen Arbeitsbereich und liefert die endgültige Antwort.',
      emptyRuns: 'Noch keine delegierten Läufe.',
      unavailable: 'Der Host hat die Statusabfrage nicht beantwortet, der Live-Status ist daher nicht verfügbar.',
      loading: 'Host-Status wird gelesen…',
      statusRunning: 'Läuft',
      statusCompleted: 'Abgeschlossen',
      statusFailed: 'Fehlgeschlagen',
      statusAborted: 'Abgebrochen',
      totals: '{completed} abgeschlossen · {failed} fehlgeschlagen · {aborted} abgebrochen',
    }

    const ru = {
      panel: 'OMP',
      title: 'Делегирование в oh-my-pi',
      subtitle: 'Передайте задачу локальному кодовому агенту oh-my-pi.',
      sectionDelegation: 'Делегирование',
      sectionRuntime: 'Среда выполнения',
      sectionRuns: 'Последние запуски',
      sectionUsage: 'Использование',
      provider: 'Провайдер',
      tool: 'Инструмент',
      model: 'Модель',
      thinking: 'Уровень размышления',
      timeout: 'Бюджет',
      program: 'Программа',
      cliPath: 'Путь к CLI',
      apiKey: 'API-ключ',
      configured: 'настроен',
      missing: 'не найден',
      seconds: '{value} с',
      minutes: '{value} мин',
      usageText: 'Попросите агента передать задачу субагенту omp: он запустит новую неконтролируемую сессию oh-my-pi в текущем рабочем каталоге и вернёт итоговый ответ.',
      emptyRuns: 'Запусков делегирования пока нет.',
      unavailable: 'Хост не ответил на запрос состояния, поэтому живые данные недоступны.',
      loading: 'Чтение состояния хоста…',
      statusRunning: 'Выполняется',
      statusCompleted: 'Завершено',
      statusFailed: 'Ошибка',
      statusAborted: 'Прервано',
      totals: 'завершено {completed} · ошибок {failed} · прервано {aborted}',
    }

    const pt = {
      panel: 'OMP',
      title: 'Delegação para o oh-my-pi',
      subtitle: 'Delegue uma tarefa ao agente de código oh-my-pi local.',
      sectionDelegation: 'Delegação',
      sectionRuntime: 'Ambiente',
      sectionRuns: 'Execuções recentes',
      sectionUsage: 'Uso',
      provider: 'Provedor',
      tool: 'Ferramenta',
      model: 'Modelo',
      thinking: 'Nível de raciocínio',
      timeout: 'Orçamento',
      program: 'Programa',
      cliPath: 'Caminho do CLI',
      apiKey: 'Chave de API',
      configured: 'configurada',
      missing: 'não encontrada',
      seconds: '{value} s',
      minutes: '{value} min',
      usageText: 'Peça ao agente que entregue uma tarefa ao subagente omp: ele executa uma nova sessão oh-my-pi não assistida no espaço de trabalho atual e devolve a resposta final.',
      emptyRuns: 'Nenhuma execução delegada ainda.',
      unavailable: 'O host não respondeu à solicitação de status, então o estado ao vivo não está disponível.',
      loading: 'Lendo o status do host…',
      statusRunning: 'Em execução',
      statusCompleted: 'Concluída',
      statusFailed: 'Falhou',
      statusAborted: 'Abortada',
      totals: '{completed} concluídas · {failed} com falha · {aborted} abortadas',
    }

    const DICTIONARIES = { en, zh, ja, es, fr, de, ru, pt }

    /** Surface tokens used by the panel; every color comes from the host theme. */
    const token = (name) => `var(--dsw-alias-${name})`

    const styles = {
      page: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px 28px 40px',
        maxWidth: '880px',
        margin: '0 auto',
        color: token('label-primary'),
        fontSize: '13px',
        lineHeight: 1.6,
      },
      header: { display: 'flex', flexDirection: 'column', gap: '4px' },
      title: { fontSize: '18px', fontWeight: 600, color: token('label-primary') },
      subtitle: { color: token('label-secondary') },
      section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        border: `1px solid ${token('border-l1')}`,
        borderRadius: '10px',
        background: token('bg-layer-1'),
        padding: '14px 16px',
      },
      sectionTitle: { fontSize: '13px', fontWeight: 600, color: token('label-primary') },
      rows: { display: 'flex', flexDirection: 'column', gap: '6px' },
      row: { display: 'flex', gap: '12px', alignItems: 'baseline' },
      rowLabel: { minWidth: '140px', color: token('label-secondary') },
      rowValue: { color: token('label-primary'), wordBreak: 'break-all' },
      code: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '12px',
      },
      run: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        borderTop: `1px solid ${token('border-l1')}`,
        paddingTop: '8px',
      },
      runHead: { display: 'flex', gap: '10px', alignItems: 'baseline' },
      runStatus: { fontWeight: 600 },
      runMeta: { color: token('label-secondary'), fontSize: '12px' },
      preview: { color: token('label-secondary'), fontSize: '12px' },
      notice: {
        border: `1px solid ${token('border-l2')}`,
        borderRadius: '10px',
        padding: '10px 14px',
        color: token('label-secondary'),
        background: token('bg-layer-1'),
      },
      empty: { color: token('label-secondary') },
    }

    /**
     * The sidebar's OMP entry glyph; the sidebar owns the button, label, and
     * selected state around it.
     * @param {{size?: number}} props - the sidebar's icon share.
     * @returns {React.ReactNode} the icon element.
     */
    function OmpPanelIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': true,
          style: { display: 'block', pointerEvents: 'none' },
        },
        h('path', {
          d: 'M3.2 7.4h17.6',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M9.1 7.4v4.9c0 3.4-1.5 5.8-4.1 7.6',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M14.9 7.4v5.2c0 3 1.3 5.2 3.6 6.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 19.4, cy: 5.1, r: 1.7, fill: 'currentColor' }),
      )
    }

    /**
     * Format a duration in whole seconds or minutes.
     * @param {number | undefined} durationMs - the run duration.
     * @param {(key: string, params?: object) => string} t - the translate function.
     * @returns {string} the formatted duration.
     */
    function formatDuration(durationMs, t) {
      if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) return '—'
      const seconds = Math.round(durationMs / 1000)
      if (seconds < 60) return t('seconds', { value: String(seconds) })
      return t('minutes', { value: String(Math.round(seconds / 60)) })
    }

    /**
     * The OMP panel: the provider's configuration, its runtime, and the runs
     * it has completed in this profile.
     * @param {object} props - the slot's props.
     * @returns {React.ReactNode} the panel.
     */
    function OmpPanel(props) {
      // The slot's own locale namespace supplies `t`; the injected copy is the
      // fallback for a composition that renders the panel without the seat.
      const t = props && typeof props.t === 'function'
        ? props.t
        : props && typeof props.ompLocale === 'function'
          ? props.ompLocale
          : (key) => key
      const [status, setStatus] = useState(null)
      const [failed, setFailed] = useState(false)

      const load = useCallback(() => {
        let cancelled = false
        fetch(STATUS_URL, { headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`status ${response.status}`)
            return response.json()
          })
          .then((body) => {
            if (cancelled) return
            setStatus(body)
            setFailed(false)
          })
          .catch(() => {
            if (cancelled) return
            setFailed(true)
          })
        return () => { cancelled = true }
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, 5000)
        return () => clearInterval(timer)
      }, [load])

      const addRow = (label, value) => h(
        'div',
        { key: label, style: styles.row },
        h('span', { style: styles.rowLabel }, label),
        h('span', { style: styles.rowValue }, value),
      )

      const delegation = h(
        'section',
        { style: styles.section },
        h('div', { style: styles.sectionTitle }, t('sectionDelegation')),
        h('div', { style: styles.rows },
          addRow(t('provider'), status?.provider ?? 'omp'),
          addRow(t('tool'), status?.tool ?? 'subagent_omp'),
          addRow(t('model'), status?.model && status.model !== '' ? status.model : '—'),
          addRow(t('thinking'), status?.thinkingLevel && status.thinkingLevel !== '' ? status.thinkingLevel : '—'),
          addRow(t('timeout'), status?.timeoutMs ? `${Math.round(status.timeoutMs / 1000)} s` : '—')),
      )

      const runtime = h(
        'section',
        { style: styles.section },
        h('div', { style: styles.sectionTitle }, t('sectionRuntime')),
        h('div', { style: styles.rows },
          addRow(t('program'), h('span', { style: styles.code }, status?.program ?? '—')),
          status?.cliPath
            ? addRow(t('cliPath'), h('span', { style: styles.code }, status.cliPath))
            : undefined,
          status?.apiKeyEnv
            ? addRow(
              t('apiKey'),
              h(
                'span',
                null,
                h('span', { style: styles.code }, status.apiKeyEnv),
                ' — ',
                status.apiKeyConfigured ? t('configured') : t('missing'),
              ),
            )
            : undefined),
      )

      const runRows = []
      for (const run of status?.runs ?? []) {
        const label = run.status === 'completed'
          ? t('statusCompleted')
          : run.status === 'running'
            ? t('statusRunning')
            : run.status === 'aborted'
              ? t('statusAborted')
              : t('statusFailed')
        runRows.push(h(
          'div',
          { key: run.id, style: styles.run },
          h(
            'div',
            { style: styles.runHead },
            h('span', { style: styles.runStatus }, label),
            h('span', { style: styles.runMeta }, formatDuration(run.durationMs, t)),
            h('span', { style: styles.runMeta }, new Date(run.startedAt).toLocaleTimeString()),
          ),
          run.preview
            ? h('div', { style: styles.preview }, run.preview)
            : undefined,
        ))
      }

      const runs = h(
        'section',
        { style: styles.section },
        h('div', { style: styles.sectionTitle }, t('sectionRuns')),
        status?.totals
          ? h('div', { style: styles.runMeta }, t('totals', status.totals))
          : undefined,
        runRows.length === 0
          ? h('div', { style: styles.empty }, status === null && !failed ? t('loading') : t('emptyRuns'))
          : h('div', { style: styles.rows }, runRows),
      )

      const usage = h(
        'section',
        { style: styles.section },
        h('div', { style: styles.sectionTitle }, t('sectionUsage')),
        h('div', { style: styles.row }, t('usageText')),
      )

      return h(
        'div',
        { style: styles.page },
        h(
          'header',
          { style: styles.header },
          h('h1', { style: styles.title }, t('title')),
          h('div', { style: styles.subtitle }, t('subtitle')),
        ),
        failed ? h('div', { style: styles.notice }, t('unavailable')) : undefined,
        delegation,
        runtime,
        runs,
        usage,
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'omp: dictionaries')
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          label: () => t('panel'),
          locale: NS,
        }, OmpPanelIcon))
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ ompLocale: t }),
        }, OmpPanel))
      },
    }
  },
})
