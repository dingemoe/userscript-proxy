// ==UserScript==
// @name         Dial Panel
// @namespace    https://leinad.no/
// @version      2.0.2
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
// @updateURL    https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @downloadURL  https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @require      https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
// @require      https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
// @require      https://cdn.jsdelivr.net/gh/dingemoe/userscript-proxy@207434b1ba4cd44661a5b8b9bb1d15fd7f8dddab/component.js
// ==/UserScript==

(() => {
  'use strict'

  const host = document.createElement('tm-dial-panel')
  if (document.querySelector(host.localName)) return

  const shadow = host.attachShadow({ mode: 'closed' })
  const styles = new CSSStyleSheet()
  const utilities = `.flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-3{gap:.75rem}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`
  styles.replaceSync(utilities + `:host{all:initial!important;display:block!important;position:fixed!important;right:max(16px,env(safe-area-inset-right))!important;bottom:max(16px,env(safe-area-inset-bottom))!important;z-index:2147483647!important;color:#f5f5f7!important;color-scheme:dark!important;font:14px/1.5 system-ui,sans-serif!important}*,*::before,*::after{box-sizing:border-box}button{color:inherit;background:#22232b;border:1px solid #3a3b46;cursor:pointer}button:hover{background:#30323e}:focus-visible{outline:2px solid #a7a7ff;outline-offset:3px}#dial,#close{display:grid;place-items:center;padding:0}#dial{width:52px;height:52px;border-radius:50%;box-shadow:0 8px 24px #0007}#dial[aria-expanded=true],.dial-actions button[aria-pressed=true]{background:#34344c}button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#dial svg{grid-area:1/1;transition:opacity .16s,transform .2s}#dial .icon-close,#dial[aria-expanded=true] .icon-check{opacity:0;transform:scale(.8)}#dial[aria-expanded=true] .icon-close{opacity:1;transform:none}#panel{position:absolute;right:0;bottom:64px;width:min(340px,100vw - max(16px,env(safe-area-inset-right)) - max(16px,env(safe-area-inset-left)));height:min(420px,100dvh - max(16px,env(safe-area-inset-bottom)) - 80px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #383943;border-radius:16px;background:#17181e;box-shadow:0 16px 40px #0008;opacity:0;visibility:hidden;transform:translateY(8px) scale(.97);transform-origin:bottom right;transition:opacity .18s ease-in,transform .18s ease-in,visibility 0s .18s}#panel[data-open]{opacity:1;visibility:visible;transform:none;transition:opacity .15s ease-out,transform .15s cubic-bezier(.2,.75,.25,1),visibility 0s}#panel>header{flex:none;padding:12px 14px;border-bottom:1px solid #30313a}#title{margin:0;font-size:15px;font-weight:600}#close{width:36px;height:36px;border-radius:10px}#close svg{width:18px;height:18px}#content{flex:1;min-height:0;overflow:hidden;overscroll-behavior:contain;padding:16px}#content p{margin:0}.dial-form{display:grid;gap:10px}.dial-actions{display:flex;flex-wrap:wrap;gap:8px}.dial-form input,.dial-actions button{min-width:0;padding:9px 12px;border:1px solid #3a3b46;border-radius:9px;background:#22232b;color:inherit;font:inherit}.dial-actions button:hover{background:#30323e}@media(prefers-reduced-motion:reduce){#dial svg,#panel,#panel[data-open]{transition:none}#panel{transform:none}}`)
  shadow.adoptedStyleSheets = [styles]

  const closePath = 'm7 7 10 10M17 7 7 17'
  const html = `
    <section id="panel" aria-labelledby="title" inert>
      <header class="flex items-center justify-between gap-3">
        <h2 id="title" class="truncate">Snarveier</h2>
        <button id="close" type="button" aria-label="Lukk panel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${closePath}"/></svg>
        </button>
      </header>
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

    const panel = makeElement('section', { id: 'panel', 'aria-labelledby': 'title', inert: '' })
    const header = makeElement('header', { class: 'flex items-center justify-between gap-3' })
    const title = makeElement('h2', { id: 'title', class: 'truncate' })
    title.textContent = 'Snarveier'

    const close = makeElement('button', { id: 'close', type: 'button', 'aria-label': 'Lukk panel' })
    close.append(makeIcon(closePath))
    header.append(title, close)
    panel.append(header, makeElement('div', { id: 'content' }))

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
  const close = shadow.getElementById('close')
  const content = shadow.getElementById('content')
  const tokenKey = 'tokens.todoist'
  const todoistToken = Object.freeze({
    get: () => GM_getValue(tokenKey, ''),
    set: (token) => GM_setValue(tokenKey, token),
    clear: () => GM_deleteValue(tokenKey)
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

  let root

  function mountContent() {
    if (root) return

    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' ||
        typeof LeinadDialComponent !== 'function') {
      content.textContent = 'React eller component.js er utilgjengelig. Oppdater userscriptet i Tampermonkey.'
      return
    }

    root = ReactDOM.createRoot(content)
    root.render(React.createElement(LeinadDialComponent, { todoistToken, requestTodoist }))
  }

  function setOpen(open) {
    dial.setAttribute('aria-expanded', String(open))
    dial.setAttribute('aria-label', open ? 'Lukk panel' : 'Åpne panel')
    if (!open) dial.focus({ preventScroll: true })
    panel.inert = !open
    panel.toggleAttribute('data-open', open)
    if (open) {
      mountContent()
      close.focus({ preventScroll: true })
    }
  }

  function togglePanel() {
    setOpen(panel.inert)
  }

  dial.addEventListener('click', togglePanel)
  close.addEventListener('click', () => setOpen(false))

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat || event.defaultPrevented || event.isComposing) return
    event.preventDefault()
    togglePanel()
  })

  document.documentElement.append(host)
})()
