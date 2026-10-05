// Fallback floating window (normal browser window). Offers a "Keep on top"
// button that moves the view into an always-on-top Picture-in-Picture window.
const { STYLE, mount } = globalThis.LyricBarMini;
document.getElementById('lyricbar-style').textContent = STYLE;

let port = null;
let view = null;
const send = (cmd) => port?.postMessage({ type: 'command', ...cmd });

function attach(target) {
  view = target;
  if (port) return;
  port = chrome.runtime.connect({ name: 'display' });
  port.onMessage.addListener((msg) => {
    if (view !== main) main.update(msg);
    view.update(msg);
  });
  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(() => attach(view), 500);
  });
}

const main = mount(document, send);
attach(main);

if ('documentPictureInPicture' in window) {
  const pin = document.createElement('button');
  pin.textContent = '📌 Keep on top';
  pin.title = 'Float above all windows';
  main.extra.append(pin);
  pin.addEventListener('click', async () => {
    const pip = await documentPictureInPicture.requestWindow({ width: 480, height: 160 });
    const style = pip.document.createElement('style');
    style.textContent = STYLE;
    pip.document.head.append(style);
    pip.document.title = 'LyricBar';
    const floating = mount(pip.document, send, main.model);
    view = floating;
    main.root.style.opacity = '0.35';
    pip.addEventListener('pagehide', () => {
      view = main;
      main.root.style.opacity = '';
    });
  });
}
