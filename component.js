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
      justify-content: flex-end;
      padding: 12px 14px;
      border-bottom: 1px solid #30313a;
    }

    .leinad-dial-header .dial-actions button {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      background: transparent;
      color: #b5b6c4;
    }

    .leinad-dial-header .dial-actions button:is(:hover, [aria-pressed=true]) { color: #a7a7ff; }

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

    .leinad-task-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .leinad-task-row > a { flex: 1; min-width: 0; }
    .leinad-task-row input { accent-color: #a7a7ff; }
    .leinad-task-chip { flex: none; padding: 4px 8px; border-radius: 999px; font: inherit; }
    .leinad-task-links { margin: 0 0 8px 24px; padding: 0; list-style: none; }
    .leinad-task-links a { color: #a7a7ff; }
    .leinad-task-editor textarea {
      box-sizing: border-box;
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #3a3b46;
      border-radius: 9px;
      background: #22232b;
      color: inherit;
      font: inherit;
      resize: vertical;
    }

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

  function taskLinks(task) {
    const markdown = /\[([^\]\n]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)/gi
    const plain = /https?:\/\/[^\s<>"\]]+/gi
    const links = new Map()

    function addLink(raw, label) {
      try {
        const url = new URL(raw)
        if (!links.has(url.href)) links.set(url.href, label || url.hostname)
      } catch {
        // Ignore malformed URLs in the task text.
      }
    }

    for (const text of [task.content ?? '', task.description ?? '']) {
      const remaining = text.replace(markdown, (_, label, url) => {
        addLink(url, label)
        return ' '
      })
      for (const match of remaining.matchAll(plain)) {
        let url = match[0].replace(/[.,!?;:]+$/, '')
        while (url.endsWith(')') && url.split(')').length > url.split('(').length) url = url.slice(0, -1)
        addLink(url)
      }
    }
    return [...links]
  }

  function TaskRow({ task, busy, completing, editable, onEdit, onComplete }) {
    const [expanded, setExpanded] = React.useState(false)
    const links = taskLinks(task)
    return h('li', null,
      h('div', { className: 'leinad-task-row' },
        editable && h('input', {
          type: 'checkbox',
          checked: completing,
          disabled: busy,
          'aria-label': 'Fullfør ' + task.content,
          onChange: onComplete
        }),
        h('a', {
          href: 'https://app.todoist.com/app/task/' + encodeURIComponent(task.id),
          target: '_blank',
          rel: 'noopener noreferrer'
        }, task.content, task.due?.date && h('small', null, task.due.date)),
        editable && h('button', {
          className: 'leinad-task-chip', type: 'button', disabled: busy, onClick: onEdit
        }, 'Rediger'),
        links.length > 0 && h('button', {
          className: 'leinad-task-chip',
          type: 'button',
          'aria-expanded': expanded,
          onClick: () => setExpanded(value => !value)
        }, 'Lenker ' + links.length + (expanded ? ' ▴' : ' ▾'))
      ),
      expanded && links.length > 0 && h('ul', { className: 'leinad-task-links' },
        links.map(([url, label]) => h('li', { key: url },
          h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label)
        ))
      )
    )
  }

  function TaskEditor({ task, busy, onSave, onCancel, onDelete }) {
    const [confirmDelete, setConfirmDelete] = React.useState(false)
    return h('form', {
      className: 'dial-form leinad-task-editor',
      onSubmit(event) {
        event.preventDefault()
        const fields = new FormData(event.currentTarget)
        const content = fields.get('content').trim()
        if (content) onSave({ content, description: fields.get('description').trim() })
      }
    },
    h('input', { name: 'content', placeholder: 'Oppgave', 'aria-label': 'Oppgave', defaultValue: task.content, required: true }),
    h('textarea', { name: 'description', placeholder: 'Beskrivelse', 'aria-label': 'Beskrivelse', defaultValue: task.description, rows: 3 }),
    h('div', { className: 'dial-actions' },
      h('button', { type: 'submit', disabled: busy }, 'Lagre'),
      h('button', { type: 'button', disabled: busy, onClick: onCancel }, 'Avbryt'),
      task.id && h('button', {
        type: 'button', disabled: busy,
        onClick: () => confirmDelete ? onDelete() : setConfirmDelete(true)
      }, confirmDelete ? 'Bekreft sletting' : 'Slett')
    ))
  }

  function Main({ token, result, mutateTask, onResult }) {
    const [editor, setEditor] = React.useState(null)
    const [operation, setOperation] = React.useState(null)
    const busy = operation !== null
    const [error, setError] = React.useState('')
    const [completed, setCompleted] = React.useState(null)
    const pending = React.useRef(false)

    async function change(action, task, fields) {
      if (pending.current) return
      pending.current = true
      setOperation({ action, id: task.id })
      setError('')
      try {
        const { tasks, refreshFailed } = await mutateTask(token, action, task, fields)
        onResult({ tasks })
        setEditor(null)
        setCompleted(action === 'close' && !task.due?.is_recurring ? task : null)
        if (refreshFailed) setError('Endringen er lagret. Kunne ikke synkronisere lista.')
      } catch (error) {
        setError(error.message)
      } finally {
        pending.current = false
        setOperation(null)
      }
    }

    if (!token) return h('p', null, 'Legg inn Todoist-tokenet under Innstillinger.')

    return h(React.Fragment, null,
      mutateTask && !editor && h('div', { className: 'dial-actions' },
        h('button', { type: 'button', disabled: busy, onClick: () => setEditor({}) }, 'Ny oppgave'),
        completed && h('button', {
          type: 'button', disabled: busy, onClick: () => change('reopen', completed)
        }, 'Angre fullføring')
      ),
      editor && h(TaskEditor, {
        key: editor.id ?? 'new', task: editor, busy,
        onSave: fields => change(editor.id ? 'update' : 'create', editor, fields),
        onCancel: () => setEditor(null),
        onDelete: () => change('delete', editor)
      }),
      result.loading && h('p', { role: 'status' }, 'Henter oppgaver …'),
      (error || result.error) && h('p', { role: 'alert' }, error || result.error),
      result.tasks && (result.tasks.length
        ? h('ul', { className: 'leinad-task-list' }, result.tasks.map(task =>
          h(TaskRow, {
            key: task.id, task, busy, editable: Boolean(mutateTask),
            completing: operation?.action === 'close' && operation.id === task.id,
            onEdit: () => setEditor(task), onComplete: () => change('close', task)
          })
        ))
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

  return function LeinadDialComponent({ todoistToken, loadTasks, readTasks, mutateTask }) {
    const [view, setView] = React.useState('main')
    const [token, setToken] = React.useState(() => todoistToken.get())
    const [refresh, setRefresh] = React.useState(0)
    const [result, setResult] = React.useState(() => {
      const tasks = readTasks()
      return Array.isArray(tasks) ? { tasks } : loading
    })

    React.useEffect(() => {
      if (!token) return
      let current = true
      loadTasks(token, { refresh: refresh > 0 }).then(
        tasks => { if (current) setResult({ tasks }) },
        error => { if (current) setResult(previous => ({ tasks: previous.tasks, error: error.message })) }
      )
      return () => { current = false }
    }, [token, refresh, loadTasks])

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
        : h(Main, { token, result, mutateTask, onResult: setResult })
    )
  }
})()
