// ==UserScript==
// @name         Dial Panel
// @namespace    https://leinad.no/
// @version      2.0.12
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
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @downloadURL  https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/dial-panel.user.js
// @require      https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js
// @require      https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js
// ==/UserScript==

(() => {
  'use strict'

  const sourceKey = 'cache.dial.component'
  const url = 'https://api.github.com/repos/dingemoe/userscript-proxy/contents/component.js?ref=main'
  const rawUrl = 'https://raw.githubusercontent.com/dingemoe/userscript-proxy/main/component.js'
  const runtime = { ReactDOM, GM_getValue, GM_setValue, GM_deleteValue, GM_xmlhttpRequest }

  function compile(source) {
    if (typeof source !== 'string' || !source.trim()) return null
    try {
      const load = new Function('React', source + '\n;return mountLeinadDial')
      const mount = load(React)
      return typeof mount === 'function' ? mount : null
    } catch {
      return null
    }
  }

  function start(source) {
    const current = compile(source)
    if (current) {
      current(runtime)
      GM_setValue(sourceKey, source)
      return
    }

    const cached = compile(GM_getValue(sourceKey, ''))
    if (cached) cached(runtime)
    else console.error('[Dial Panel] Kunne ikke laste component.js.')
  }

  function request(url, onload, onfailure) {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      anonymous: true,
      redirect: 'error',
      nocache: true,
      timeout: 2500,
      onload: response => response.status === 200 ? onload(response.responseText) : onfailure(),
      onerror: onfailure,
      ontimeout: onfailure,
      onabort: onfailure
    })
  }

  function fallback() {
    if (GM_getValue(sourceKey, '')) start(null)
    else request(rawUrl, start, () => start(null))
  }

  request(url, response => {
    let source
    try {
      const file = JSON.parse(response)
      if (file.encoding !== 'base64') throw new Error('Unexpected encoding')
      source = new TextDecoder().decode(Uint8Array.from(atob(file.content), c => c.charCodeAt(0)))
    } catch {
      fallback()
      return
    }
    start(source)
  }, fallback)
})()
