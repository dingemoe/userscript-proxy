// ==UserScript==
// @name         Dial Panel
// @namespace    https://leinad.no/
// @version      2.0.9
// @description  React-panel nederst til høyre med Todoist-oppgaver og lokal tokenlagring.
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @sandbox      DOM
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.todoist.com
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @downloadURL  https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @require      https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
// @require      https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
// ==/UserScript==

(() => {
  'use strict'

  const host = document.createElement('tm-dial-panel')
  if (document.querySelector(host.localName)) return

  const shadow = host.attachShadow({ mode: 'closed' })
  const styles = new CSSStyleSheet()
  const utilities = `.flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-3{gap:.75rem}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`
  styles.replaceSync(utilities + `:host{all:initial!important;display:block!important;position:fixed!important;right:max(16px,env(safe-area-inset-right))!important;bottom:max(16px,env(safe-area-inset-bottom))!important;z-index:2147483647!important;color:#f5f5f7!important;color-scheme:dark!important;font:14px/1.5 system-ui,sans-serif!important}*,*::before,*::after{box-sizing:border-box}button{color:inherit;background:#22232b;border:1px solid #3a3b46;cursor:pointer}button:hover{background:#30323e}:focus-visible{outline:2px solid #a7a7ff;outline-offset:3px}#dial{display:grid;place-items:center;padding:0}#dial{width:52px;height:52px;border-radius:50%;box-shadow:0 8px 24px #0007}#dial[aria-expanded=true]{background:#34344c}button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#dial svg{grid-area:1/1;transition:opacity .16s,transform .2s}#dial .icon-close,#dial[aria-expanded=true] .icon-check{opacity:0;transform:scale(.8)}#dial[aria-expanded=true] .icon-close{opacity:1;transform:none}#panel{position:absolute;right:0;bottom:64px;width:min(340px,100vw - max(16px,env(safe-area-inset-right)) - max(16px,env(safe-area-inset-left)));height:min(420px,100dvh - max(16px,env(safe-area-inset-bottom)) - 80px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #383943;border-radius:16px;background:#17181e;box-shadow:0 16px 40px #0008;opacity:0;visibility:hidden;transform:translateY(8px) scale(.97);transform-origin:bottom right;transition:opacity .18s ease-in,transform .18s ease-in,visibility 0s .18s}#panel[data-open]{opacity:1;visibility:visible;transform:none;transition:opacity .15s ease-out,transform .15s cubic-bezier(.2,.75,.25,1),visibility 0s}#content{flex:1;min-height:0;overflow:hidden}#content p{margin:0}.dial-form{display:grid;gap:10px}.dial-actions{display:flex;flex-wrap:wrap;gap:8px}.dial-form input,.dial-actions button{min-width:0;padding:9px 12px;border:1px solid #3a3b46;border-radius:9px;background:#22232b;color:inherit;font:inherit}.dial-actions button:hover{background:#30323e}@media(prefers-reduced-motion:reduce){#dial svg,#panel,#panel[data-open]{transition:none}#panel{transform:none}}`)
  shadow.adoptedStyleSheets = [styles]

  const closePath = 'm7 7 10 10M17 7 7 17'
  const html = `
    <section id="panel" aria-label="Dial Panel" tabindex="-1" inert>
      <div id="content"></div>
    </section>
    <button id="dial" type="button" aria-controls="panel" aria-expanded="false"
      aria-label="Åpne panel" aria-keyshortcuts="Escape">
      <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>
      <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path d="${closePath}"/></svg>
    </button>
  `

  function makeElement(tag, attributes = {}) {
    const element = document.createElement(tag)
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
    return element
  }

  function makeIcon(path, className) {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    const shape = document.createElementNS(ns, 'path')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    if (className) svg.setAttribute('class', className)
    shape.setAttribute('d', path)
    svg.append(shape)
    return svg
  }

  try {
    shadow.innerHTML = html
  } catch (error) {
    if (error.name !== 'TypeError') throw error

    const panel = makeElement('section', { id: 'panel', 'aria-label': 'Dial Panel', tabindex: '-1', inert: '' })
    panel.append(makeElement('div', { id: 'content' }))

    const dial = makeElement('button', {
      id: 'dial',
      type: 'button',
      'aria-controls': 'panel',
      'aria-expanded': 'false',
      'aria-label': 'Åpne panel',
      'aria-keyshortcuts': 'Escape'
    })
    dial.append(makeIcon('m5 12 4.5 4.5L19 7', 'icon-check'), makeIcon(closePath, 'icon-close'))
    shadow.append(panel, dial)
  }

  const panel = shadow.getElementById('panel')
  const dial = shadow.getElementById('dial')
  const content = shadow.getElementById('content')
  const tokenKey = 'tokens.todoist'
  const tasksKey = 'cache.todoist.tasks'
  let taskRequest

  const todoistToken = Object.freeze({
    get: () => GM_getValue(tokenKey, ''),
    set: (token) => {
      if (token === GM_getValue(tokenKey, '')) return
      GM_deleteValue(tasksKey)
      GM_setValue(tokenKey, token)
      taskRequest = undefined
    },
    clear: () => {
      GM_deleteValue(tasksKey)
      GM_deleteValue(tokenKey)
      taskRequest = undefined
    }
  })

  function requestTodoist(query, token) {
    return new Promise((resolve, reject) => {
      function connectionError() {
        reject(new Error('Kunne ikke kontakte Todoist. Prøv igjen.'))
      }

      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api.todoist.com/api/v1/tasks?' + query,
        headers: { Authorization: 'Bearer ' + token },
        anonymous: true,
        redirect: 'error',
        timeout: 12000,
        onerror: connectionError,
        ontimeout: connectionError,
        onload(response) {
          if (response.status === 401 || response.status === 403) {
            reject(new Error('Todoist avviste tilgangen. Sjekk tokenet i Innstillinger.'))
            return
          }
          if (response.status !== 200) {
            reject(new Error('Kunne ikke hente oppgaver fra Todoist (' + response.status + ').'))
            return
          }
          try {
            resolve(JSON.parse(response.responseText))
          } catch {
            reject(new Error('Uventet svar fra Todoist.'))
          }
        }
      })
    })
  }

  async function fetchTasks(token) {
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

  function loadTasks(token, { refresh = false } = {}) {
    if (taskRequest?.token === token && (!refresh || taskRequest.pending)) return taskRequest.promise

    const promise = fetchTasks(token).then(tasks => {
      if (taskRequest?.promise === promise && todoistToken.get() === token) {
        GM_setValue(tasksKey, tasks)
      }
      return tasks
    })
    const request = { token, promise, pending: true }
    taskRequest = request
    promise.then(
      () => { request.pending = false },
      () => { if (taskRequest === request) taskRequest = undefined }
    )
    return promise
  }

  function createDialComponent() {
    const h = React.createElement

    const layoutCss = `.leinad-dial-layout{box-sizing:border-box;height:100%;display:flex;flex-direction:column;min-width:0}.leinad-dial-header{flex:none;display:flex;align-items:center;justify-content:flex-end;padding:12px 14px;border-bottom:1px solid #30313a}.leinad-dial-header .dial-actions button{width:36px;height:36px;display:grid;place-items:center;padding:0;border:0;background:transparent;color:#b5b6c4}.leinad-dial-header .dial-actions button:is(:hover,[aria-pressed=true]){color:#a7a7ff}.leinad-dial-header button svg{width:18px;height:18px}.leinad-dial-view{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px;animation:leinad-dial-enter 140ms ease-out both}.leinad-task-list{list-style:none;margin:8px 0 0;padding:0}.leinad-task-list li{border-bottom:1px solid #30313a}.leinad-task-list a{display:block;padding:9px 4px;color:inherit;text-decoration:none;overflow-wrap:anywhere}.leinad-task-list a:hover{background:#22232b}.leinad-task-list small{display:block;color:#b5b6c4}@keyframes leinad-dial-enter{from{opacity:0.75;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media (prefers-reduced-motion:reduce){.leinad-dial-view{animation:none}}`

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

    function Main({ token, result }) {
      if (!token) return h('p', null, 'Legg inn Todoist-tokenet under Innstillinger.')

      return h(
        React.Fragment,
        null,
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

    return function LeinadDialComponent({ todoistToken, loadTasks, readTasks }) {
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
          : h(Main, { token, result })
      )
    }
  }

  function fetchComponent() {
    return new Promise(resolve => {
      const url = 'https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/component.js'
      const fallback = () => resolve(null)

      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          anonymous: true,
          redirect: 'error',
          nocache: true,
          timeout: 1800,
          onerror: fallback,
          ontimeout: fallback,
          onabort: fallback,
          onload(response) {
            if (response.status !== 200) {
              fallback()
              return
            }

            try {
              const evaluate = new Function('React', response.responseText + '\n;return LeinadDialComponent')
              const component = evaluate(React)
              resolve(typeof component === 'function' ? component : null)
            } catch {
              fallback()
            }
          }
        })
      } catch {
        fallback()
      }
    })
  }

  let componentRequest
  let root

  async function mountContent() {
    if (root || componentRequest) return

    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      content.textContent = 'React er utilgjengelig. Oppdater userscriptet i Tampermonkey.'
      return
    }

    componentRequest = fetchComponent()
    const Component = await componentRequest || createDialComponent()
    root = ReactDOM.createRoot(content)
    root.render(React.createElement(Component, {
      todoistToken,
      loadTasks,
      readTasks: () => todoistToken.get() ? GM_getValue(tasksKey, null) : null
    }))
  }

  function setOpen(open) {
    dial.setAttribute('aria-expanded', String(open))
    dial.setAttribute('aria-label', open ? 'Lukk panel' : 'Åpne panel')
    if (!open) dial.focus({ preventScroll: true })
    panel.inert = !open
    panel.toggleAttribute('data-open', open)
    if (open) {
      mountContent()
      panel.focus({ preventScroll: true })
    }
  }

  function togglePanel() {
    setOpen(panel.inert)
  }

  dial.addEventListener('click', togglePanel)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat || event.defaultPrevented || event.isComposing) return
    event.preventDefault()
    togglePanel()
  })

  document.documentElement.append(host)

  const savedToken = todoistToken.get()
  if (savedToken) loadTasks(savedToken)
  mountContent()
})()
