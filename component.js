var LeinadDialComponent = (() => {
  'use strict'

  const h = React.createElement

  const layoutCss = `
    .leinad-dial-layout {
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .leinad-dial-header {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid #30313a;
    }

    .leinad-dial-header h2 { margin: 0; font-size: 15px; font-weight: 600; }

    .leinad-dial-header .dial-actions button {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .leinad-dial-header button svg { width: 18px; height: 18px; }

    .leinad-dial-view {
      flex: 1;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 16px;
      animation: leinad-dial-enter 140ms ease-out both;
    }

    .leinad-task-list { list-style: none; margin: 8px 0 0; padding: 0; }
    .leinad-task-list li { border-bottom: 1px solid #30313a; }
    .leinad-task-list a {
      display: block;
      padding: 9px 4px;
      color: inherit;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .leinad-task-list a:hover { background: #22232b; }
    .leinad-task-list small { display: block; color: #b5b6c4; }

    @keyframes leinad-dial-enter {
      from { opacity: 0.75; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .leinad-dial-view { animation: none; }
    }
  `

  const settingsHtml = `
    <form class="dial-form" autocomplete="off">
      <input
        name="token"
        type="password"
        autocomplete="new-password"
        placeholder="Todoist-token"
        aria-label="Todoist-token"
        required
      >
      <div class="dial-actions">
        <button type="submit" value="save">Lagre token</button>
        <button type="submit" value="clear" formnovalidate>Fjern token</button>
      </div>
      <div role="status" aria-live="polite"></div>
    </form>
  `

  const views = [
    { id: 'main', label: 'Oppgaveliste', icon: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01' },
    { id: 'settings', label: 'Innstillinger', icon: 'M10 3h4l.6 2.5 2 .9 2.4-1 2 3.5-1.9 1.7v2.8l1.9 1.7-2 3.5-2.4-1-2 .9L14 21h-4l-.6-2.5-2-.9-2.4 1-2-3.5 1.9-1.7v-2.8L3 8.9l2-3.5 2.4 1 2-.9L10 3Z' }
  ]

  function Layout({ view, onViewChange, children }) {
    return h(
      'div',
      { className: 'leinad-dial-layout' },
      h('style', null, layoutCss),
      h('header', { className: 'leinad-dial-header' },
        h('h2', null, 'Snarveier'),
        h('nav', { className: 'dial-actions', 'aria-label': 'Panelvisning' },
          views.map(({ id, label, icon }) => h('button', {
            key: id,
            type: 'button',
            'data-view': id,
            title: label,
            'aria-label': label,
            'aria-pressed': view === id,
            onClick: () => onViewChange(id)
          }, h('svg', { viewBox: '0 0 24 24', 'aria-hidden': true },
            h('path', { d: icon }),
            id === 'settings' && h('circle', { cx: 12, cy: 12, r: 3 })
          )))
        )
      ),
      h('div', { className: 'leinad-dial-view', 'data-view-content': '', key: view }, children)
    )
  }

  async function listTasks(requestTodoist, token) {
    const tasks = []
    let cursor
    do {
      const query = new URLSearchParams({ limit: '100' })
      if (cursor) query.set('cursor', cursor)
      const page = await requestTodoist(query, token)
      if (!Array.isArray(page.results)) throw new Error('Uventet svar fra Todoist.')
      tasks.push(...page.results)
      cursor = page.next_cursor
    } while (cursor)
    return tasks
  }

  function Main({ token, result, onRefresh }) {
    if (!token) return h('p', null, 'Legg inn Todoist-tokenet under Innstillinger.')

    return h(
      React.Fragment,
      null,
      h('div', { className: 'dial-actions items-center justify-between' },
        h('strong', null, 'Todoist'),
        h('button', { type: 'button', onClick: onRefresh, disabled: result.loading }, 'Oppdater')
      ),
      result.loading && h('p', { role: 'status' }, 'Henter oppgaver …'),
      result.error && h('p', { role: 'alert' }, result.error),
      result.tasks && (result.tasks.length
        ? h('ul', { className: 'leinad-task-list' }, result.tasks.map(task =>
          h('li', { key: task.id },
            h('a', {
              href: 'https://app.todoist.com/app/task/' + encodeURIComponent(task.id),
              target: '_blank',
              rel: 'noopener noreferrer'
            }, task.content, task.due?.date && h('small', null, task.due.date))
          )))
        : h('p', { role: 'status' }, 'Ingen aktive oppgaver.'))
    )
  }

  function Settings({ todoistToken, onTokenChange }) {
    function handleSubmit(event) {
      event.preventDefault()

      const form = event.target
      const input = form.elements.namedItem('token')
      const status = form.querySelector('[role="status"]')
      const isClear = event.nativeEvent.submitter?.value === 'clear'
      const token = input.value.trim()

      if (!isClear && !token) {
        status.textContent = 'Skriv inn Todoist-tokenet.'
        input.focus()
        return
      }

      try {
        if (isClear) todoistToken.clear()
        else todoistToken.set(token)

        form.reset()
        onTokenChange(isClear ? '' : token)
        status.textContent = isClear ? 'Token fjernet.' : 'Token lagret.'
      } catch {
        status.textContent = isClear
          ? 'Kunne ikke fjerne tokenet.'
          : 'Kunne ikke lagre tokenet.'
      }
    }

    return h('div', {
      onSubmit: handleSubmit,
      dangerouslySetInnerHTML: { __html: settingsHtml }
    })
  }

  const loading = { loading: true }

  return function LeinadDialComponent({ todoistToken, requestTodoist }) {
    const [view, setView] = React.useState('main')
    const [token, setToken] = React.useState(() => todoistToken.get())
    const [refresh, setRefresh] = React.useState(0)
    const [result, setResult] = React.useState(loading)

    React.useEffect(() => {
      if (!token) return
      let current = true
      listTasks(requestTodoist, token).then(
        tasks => { if (current) setResult({ tasks }) },
        error => { if (current) setResult({ error: error.message }) }
      )
      return () => { current = false }
    }, [token, refresh, requestTodoist])

    function refreshTasks() {
      setResult(loading)
      setRefresh(value => value + 1)
    }

    function changeToken(value) {
      setToken(value)
      if (value) refreshTasks()
    }

    return h(
      Layout,
      { view, onViewChange: setView },
      view === 'settings'
        ? h(Settings, { todoistToken, onTokenChange: changeToken })
        : h(Main, { token, result, onRefresh: refreshTasks })
    )
  }
})()
