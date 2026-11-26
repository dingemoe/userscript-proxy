var LeinadDialComponent = (() => {
  'use strict'

  const h = React.createElement

  const layoutHtml = `
    <div class="dial-form">
      <nav class="dial-actions" aria-label="Panelvisning">
        <button type="button" data-view="main" aria-pressed="true">Main</button>
        <button type="button" data-view="settings" aria-pressed="false">Innstillinger</button>
      </nav>
      <div data-view-content></div>
    </div>
  `

  const mainHtml = {
    configured: `<p>Todoist-token er lagret.</p>`,
    missing: `<p>Legg inn Todoist-tokenet under Innstillinger.</p>`
  }

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

  function Layout({ view, onViewChange, children }) {
    const [outlet, setOutlet] = React.useState(null)
    const shellRef = React.useRef(null)

    React.useLayoutEffect(() => {
      setOutlet(shellRef.current.querySelector('[data-view-content]'))
    }, [])

    React.useLayoutEffect(() => {
      for (const button of shellRef.current.querySelectorAll('button[data-view]')) {
        button.setAttribute('aria-pressed', String(button.dataset.view === view))
      }
    }, [view])

    function handleClick(event) {
      const button = event.target.closest('button[data-view]')
      if (button) onViewChange(button.dataset.view)
    }

    return h(
      React.Fragment,
      null,
      h('div', {
        ref: shellRef,
        onClick: handleClick,
        dangerouslySetInnerHTML: { __html: layoutHtml }
      }),
      outlet && ReactDOM.createPortal(children, outlet)
    )
  }

  function Main({ hasToken }) {
    return h('div', {
      dangerouslySetInnerHTML: {
        __html: hasToken ? mainHtml.configured : mainHtml.missing
      }
    })
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
        onTokenChange(!isClear)
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

  return function LeinadDialComponent({ todoistToken }) {
    const [view, setView] = React.useState('main')
    const [hasToken, setHasToken] = React.useState(() => Boolean(todoistToken.get()))

    return h(
      Layout,
      { view, onViewChange: setView },
      view === 'settings'
        ? h(Settings, { todoistToken, onTokenChange: setHasToken })
        : h(Main, { hasToken })
    )
  }
})()
