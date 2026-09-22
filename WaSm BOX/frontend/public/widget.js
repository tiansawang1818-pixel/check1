(function () {
  'use strict';
  const script = document.currentScript;
  if (!script || !script.dataset.bot) return;
  const origin = new URL(script.src).origin;
  const iframe = document.createElement('iframe');
  const url = new URL('/embed/' + encodeURIComponent(script.dataset.bot), origin);
  url.searchParams.set('theme', script.dataset.theme || 'light');
  iframe.src = url.href;
  iframe.title = script.dataset.title || 'WasmBot widget';
  iframe.style.cssText = 'width:100%;max-width:520px;height:500px;border:0;border-radius:16px;';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  const receive = function (event) {
    if (event.source !== iframe.contentWindow || event.origin !== origin) return;
    if (event.data?.type === 'wasmbot:ready') iframe.contentWindow.postMessage({ type: 'wasmbot:origin' }, origin);
    if (event.data?.type === 'wasmbot:resize' && Number.isFinite(event.data.height)) iframe.style.height = Math.min(3000, Math.max(200, event.data.height)) + 'px';
  };
  window.addEventListener('message', receive);
  script.after(iframe);
})();
