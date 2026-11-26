var LeinadDialComponent = (() => {
  'use strict'

  const h = React.createElement

  const layoutCss = `
    .leinad-dial-layout {
      box-sizing: border-box;
      height: min(320px, 58vh);
      height: min(320px, 58dvh);
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .leinad-dial-layout > nav { flex: none; }

    .leinad-dial-view {
      flex: 1;
      min-height: 0;
      overflow: auto;
      animation: leinad-dial-enter 140ms ease-out both;
    }

    @keyframes leinad-dial-enter {
      from { opacity: 0.75; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .leinad-dial-view { animation: none; }
    }
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
    return h(
      'div',
      { className: 'dial-form leinad-dial-layout' },
      h('style', null, layoutCss),
      h(
        'nav',
        { className: 'dial-actions', 'aria-label': 'Panelvisning' },
        h('button', {
          type: 'button',
          'data-view': 'main',
          'aria-pressed': view === 'main',
          onClick: () => onViewChange('main')
        }, 'Main'),
        h('button', {
          type: 'button',
          'data-view': 'settings',
          'aria-pressed': view === 'settings',
          onClick: () => onViewChange('settings')
        }, 'Innstillinger')
      ),
      h('div', { className: 'leinad-dial-view', 'data-view-content': '', key: view }, children)
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
