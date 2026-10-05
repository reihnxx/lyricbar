#!/usr/bin/env node
// Builds the GitHub Pages landing site (English + Bahasa Indonesia) into _site/.
//   node site/build.mjs && open _site/index.html
// Deployed by .github/workflows/pages.yml. All copy lives in STRINGS below.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const SITE = 'https://reihnxx.github.io/lyricbar/';
const REPO = 'https://github.com/reihnxx/lyricbar';
const DL = `${REPO}/releases/latest/download`;
const VERSION = JSON.parse(readFileSync(join(ROOT, 'extension/manifest.json'), 'utf8')).version;
const INSTALL_CMD = 'curl -fsSL https://raw.githubusercontent.com/reihnxx/lyricbar/main/scripts/install-macos.sh | bash';

const STRINGS = {
  en: {
    path: '',
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'LyricBar – Spotify Lyrics on Touch Bar & Floating Window',
    description:
      'Free, open-source synced Spotify lyrics on your MacBook Touch Bar or in an always-on-top floating window on Windows, Linux and macOS.',
    keywords:
      'spotify lyrics touch bar, spotify touch bar, macbook touch bar lyrics, spotify floating lyrics, spotify lyrics window always on top, spotify web player lyrics, synced lyrics extension, lrc lyrics, lrclib, spotify lyrics windows, spotify lyrics linux',
    switchLabel: 'Bahasa Indonesia',
    h1: 'Spotify lyrics on your <span>Touch Bar</span> — and in a floating window everywhere',
    lead: 'LyricBar shows time-synced lyrics for whatever you play on the Spotify Web Player: across the MacBook Pro Touch Bar, in the menu bar, or in a small window that stays on top on Windows, Linux and macOS. Free, open source, no Spotify login or API keys.',
    ctaExt: 'Get the browser extension',
    ctaMac: 'Mac app (.dmg)',
    ctaGit: 'View on GitHub',
    meta: `Version ${VERSION} · MIT license · Brave, Chrome, Edge, Arc, Opera, Vivaldi`,
    altTouchbar: 'Spotify lyrics on a MacBook Pro Touch Bar with LyricBar',
    altFloat: 'Always-on-top floating Spotify lyrics window',
    worksTitle: 'Works on your computer',
    works: [
      ['Mac with Touch Bar', 'Lyrics across the Touch Bar, in the menu bar and in a floating window.'],
      ['Mac without Touch Bar', 'Floating lyrics window, plus optional lyrics in the menu bar.'],
      ['Windows & Linux', 'A floating lyrics window that stays above your other windows.'],
    ],
    featuresTitle: 'Why LyricBar',
    features: [
      ['Real-time synced', 'Each line appears exactly when it is sung, line by line — even when Spotify plays on your phone via Connect.'],
      ['Nothing to set up', 'No Spotify developer account, no API keys, no login. Install, open Spotify, play.'],
      ['Fix it in one click', 'Lyrics late or early? Nudge them. Wrong song? Try the next match. LyricBar remembers per song.'],
      ['Light & private', 'A native ~1 MB Mac app and a tiny extension. Only the song name is used to look up lyrics. No tracking.'],
      ['Handles the edge cases', 'No lyrics, unsynced lyrics, instrumentals, offline — each is shown clearly, never a blank screen.'],
      ['Open source', 'MIT licensed. Add your own display: Windows taskbar, Linux bars, Stream Deck… via a tiny JSON protocol.'],
    ],
    installTitle: 'Install in 3 minutes',
    install: [
      ['Add the browser extension', `Download <a href="${DL}/LyricBar-extension.zip">LyricBar-extension.zip</a>, unzip it, open <code>brave://extensions</code> (or <code>chrome://extensions</code>), turn on <b>Developer mode</b>, click <b>Load unpacked</b> and pick the folder.`],
      ['Play a song on open.spotify.com', 'Click the <b>LyricBar</b> button next to Spotify’s <b>Lyrics</b> button for the floating window. On Windows and Linux you’re done.'],
      ['Mac: install the app for the Touch Bar', `Download <a href="${DL}/LyricBar.dmg">LyricBar.dmg</a> or paste this into Terminal:`],
    ],
    guide: 'Step-by-step guide with screenshots',
    shotsTitle: 'See it',
    shots: [
      ['images/touchbar-lyrics.png', 'Lyrics on the Touch Bar'],
      ['images/floating-lyrics-controls.png', 'Floating window with per-song fixes'],
      ['images/extension-popup.png', 'Extension popup'],
    ],
    faqTitle: 'Questions',
    faq: [
      ['Can I see Spotify lyrics on the MacBook Touch Bar?', 'Yes. Install the LyricBar browser extension and the free LyricBar Mac app, play music on open.spotify.com, and the current line appears across the Touch Bar. Tap ⊗ to get your normal Touch Bar back and ♪ in the Control Strip to show lyrics again.'],
      ['Is there a floating Spotify lyrics window that stays on top?', 'Yes. Click the LyricBar button in Spotify’s player bar. It opens a small always-on-top lyrics window on Windows, Linux and macOS — no extra app needed.'],
      ['Does it work with the Spotify desktop app?', 'LyricBar reads playback from the Spotify Web Player (open.spotify.com). If the web player is open and controlling your desktop app or phone via Spotify Connect, lyrics still follow along.'],
      ['Do I need Spotify Premium?', 'No. It works with free and Premium accounts.'],
      ['Where do the lyrics come from?', 'From LRCLIB, a free community database of time-synced lyrics. Optionally, LyricBar can reuse the lyrics Spotify’s own player already loaded.'],
      ['What if the lyrics are wrong or out of sync?', 'Use “Wrong lyrics?” to switch to another match, or shift timing in 0.5-second steps. Your choice is remembered for that song.'],
      ['Is it free and safe?', 'Free and open source (MIT). It never reads your Spotify password or cookies, has no accounts, ads or tracking, and the Mac app only accepts connections from your own computer.'],
    ],
    footer: 'LyricBar is not affiliated with Spotify or LRCLIB. Lyrics belong to their rights holders and are displayed for personal use only.',
  },
  id: {
    path: 'id/',
    htmlLang: 'id',
    ogLocale: 'id_ID',
    title: 'LyricBar – Lirik Spotify di Touch Bar & Jendela Melayang',
    description:
      'Gratis & open source: lirik Spotify tersinkron di Touch Bar MacBook atau jendela melayang yang selalu di atas, untuk Windows, Linux, dan macOS.',
    keywords:
      'lirik spotify touch bar, lirik spotify macbook, lirik spotify melayang, lirik spotify di layar, lirik lagu spotify web, ekstensi lirik spotify, lirik tersinkron, spotify touch bar, lirik spotify windows, lirik spotify linux',
    switchLabel: 'English',
    h1: 'Lirik Spotify di <span>Touch Bar</span> — dan di jendela melayang di mana saja',
    lead: 'LyricBar menampilkan lirik tersinkron untuk lagu yang kamu putar di Spotify Web Player: di Touch Bar MacBook Pro, di menu bar, atau di jendela kecil yang selalu di atas untuk Windows, Linux, dan macOS. Gratis, open source, tanpa login Spotify atau API key.',
    ctaExt: 'Pasang ekstensi browser',
    ctaMac: 'App Mac (.dmg)',
    ctaGit: 'Lihat di GitHub',
    meta: `Versi ${VERSION} · Lisensi MIT · Brave, Chrome, Edge, Arc, Opera, Vivaldi`,
    altTouchbar: 'Lirik Spotify di Touch Bar MacBook Pro dengan LyricBar',
    altFloat: 'Jendela lirik Spotify melayang yang selalu di atas',
    worksTitle: 'Bisa dipakai di komputermu',
    works: [
      ['Mac dengan Touch Bar', 'Lirik di Touch Bar, di menu bar, dan di jendela melayang.'],
      ['Mac tanpa Touch Bar', 'Jendela lirik melayang, plus lirik di menu bar (opsional).'],
      ['Windows & Linux', 'Jendela lirik melayang yang selalu berada di atas jendela lain.'],
    ],
    featuresTitle: 'Kenapa LyricBar',
    features: [
      ['Sinkron real-time', 'Tiap baris muncul tepat saat dinyanyikan — bahkan saat Spotify diputar di HP lewat Spotify Connect.'],
      ['Tanpa setting', 'Tanpa akun developer Spotify, tanpa API key, tanpa login. Pasang, buka Spotify, putar lagu.'],
      ['Perbaiki sekali klik', 'Lirik telat atau kecepetan? Geser timing-nya. Lirik salah lagu? Coba versi lain. Diingat per lagu.'],
      ['Ringan & privat', 'App Mac native ~1 MB dan ekstensi mungil. Hanya nama lagu yang dipakai untuk mencari lirik. Tanpa pelacakan.'],
      ['Semua kondisi ditangani', 'Lirik tidak ada, tanpa timing, instrumental, offline — semuanya ditampilkan jelas, bukan layar kosong.'],
      ['Open source', 'Lisensi MIT. Tambahkan tampilan sendiri: taskbar Windows, panel Linux, Stream Deck… lewat protokol JSON sederhana.'],
    ],
    installTitle: 'Pasang dalam 3 menit',
    install: [
      ['Pasang ekstensi browser', `Unduh <a href="${DL}/LyricBar-extension.zip">LyricBar-extension.zip</a>, ekstrak, buka <code>brave://extensions</code> (atau <code>chrome://extensions</code>), nyalakan <b>Developer mode</b>, klik <b>Load unpacked</b>, lalu pilih foldernya.`],
      ['Putar lagu di open.spotify.com', 'Klik tombol <b>LyricBar</b> di sebelah tombol <b>Lyrics</b> Spotify untuk jendela melayang. Pengguna Windows dan Linux sudah selesai.'],
      ['Mac: pasang app untuk Touch Bar', `Unduh <a href="${DL}/LyricBar.dmg">LyricBar.dmg</a> atau tempel perintah ini di Terminal:`],
    ],
    guide: 'Panduan lengkap dengan gambar',
    shotsTitle: 'Tampilannya',
    shots: [
      ['images/touchbar-lyrics.png', 'Lirik di Touch Bar'],
      ['images/floating-lyrics-controls.png', 'Jendela melayang dengan kontrol per lagu'],
      ['images/extension-popup.png', 'Popup ekstensi'],
    ],
    faqTitle: 'Pertanyaan',
    faq: [
      ['Bisa menampilkan lirik Spotify di Touch Bar MacBook?', 'Bisa. Pasang ekstensi browser LyricBar dan app Mac LyricBar (gratis), putar lagu di open.spotify.com, dan baris lirik yang sedang dinyanyikan muncul di Touch Bar. Tap ⊗ untuk kembali ke Touch Bar normal, dan ♪ di Control Strip untuk memunculkan lirik lagi.'],
      ['Ada jendela lirik Spotify melayang yang selalu di atas?', 'Ada. Klik tombol LyricBar di player bar Spotify. Jendela lirik kecil yang selalu di atas akan terbuka di Windows, Linux, dan macOS — tanpa perlu app tambahan.'],
      ['Apakah bisa dengan app Spotify desktop?', 'LyricBar membaca lagu dari Spotify Web Player (open.spotify.com). Kalau web player terbuka dan mengontrol app desktop atau HP lewat Spotify Connect, lirik tetap mengikuti.'],
      ['Perlu Spotify Premium?', 'Tidak. Bisa untuk akun gratis maupun Premium.'],
      ['Liriknya dari mana?', 'Dari LRCLIB, database lirik tersinkron milik komunitas yang gratis. Opsional, LyricBar bisa memakai lirik yang sudah dimuat player Spotify.'],
      ['Kalau liriknya salah atau tidak pas waktunya?', 'Pakai “Wrong lyrics?” untuk ganti ke versi lain, atau geser timing per 0,5 detik. Pilihanmu diingat untuk lagu itu.'],
      ['Gratis dan aman?', 'Gratis dan open source (MIT). Tidak pernah membaca password atau cookie Spotify, tanpa akun, iklan, atau pelacakan, dan app Mac hanya menerima koneksi dari komputermu sendiri.'],
    ],
    footer: 'LyricBar tidak berafiliasi dengan Spotify maupun LRCLIB. Lirik adalah milik pemegang haknya dan hanya ditampilkan untuk penggunaan pribadi.',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function jsonLd(t) {
  const url = SITE + t.path;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'LyricBar',
      url,
      description: t.description,
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Lyrics',
      operatingSystem: 'macOS, Windows, Linux',
      softwareVersion: VERSION,
      inLanguage: t.htmlLang,
      isAccessibleForFree: true,
      license: 'https://opensource.org/licenses/MIT',
      downloadUrl: `${REPO}/releases/latest`,
      installUrl: `${REPO}#readme`,
      image: `${SITE}images/social-preview.png`,
      screenshot: t.shots.map(([src]) => SITE + src),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'reihnxx', url: 'https://github.com/reihnxx' },
      sameAs: [REPO],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: t.htmlLang,
      mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];
}

function page(lang) {
  const t = STRINGS[lang];
  const other = lang === 'en' ? STRINGS.id : STRINGS.en;
  const up = t.path ? '../' : '';
  const url = SITE + t.path;
  const guide = `${REPO}/blob/main/${lang === 'en' ? 'README.md' : 'README.id.md'}`;
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<meta name="keywords" content="${esc(t.keywords)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#121212">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${SITE}">
<link rel="alternate" hreflang="id" href="${SITE}id/">
<link rel="alternate" hreflang="x-default" href="${SITE}">
<link rel="icon" type="image/png" sizes="32x32" href="${up}images/icon32.png">
<link rel="apple-touch-icon" href="${up}images/icon128.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="LyricBar">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}images/social-preview.png">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta property="og:image:alt" content="${esc(t.altTouchbar)}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:locale:alternate" content="${other.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.description)}">
<meta name="twitter:image" content="${SITE}images/social-preview.png">
<script type="application/ld+json">${JSON.stringify(jsonLd(t))}</script>
<style>
  :root { --bg:#0f1012; --card:#17191d; --line:#262a31; --fg:#f2f4f7; --muted:#a3a9b3; --accent:#1ed760; --accent-ink:#06210f; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Noto Sans",sans-serif; }
  a { color: var(--accent); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
  header.top { display:flex; align-items:center; gap:10px; padding:18px 0; }
  header.top img { width:32px; height:32px; }
  header.top b { font-size:18px; }
  header.top nav { margin-left:auto; display:flex; gap:16px; font-size:14px; }
  header.top nav a { color: var(--muted); text-decoration:none; }
  header.top nav a:hover { color: var(--fg); }
  .hero { padding: 40px 0 24px; text-align:center; }
  h1 { font-size: clamp(30px, 5.4vw, 54px); line-height:1.1; margin:0 auto 18px; max-width: 900px; letter-spacing:-.02em; }
  h1 span { color: var(--accent); }
  .lead { color: var(--muted); font-size: clamp(16px, 2vw, 19px); max-width: 760px; margin: 0 auto 26px; }
  .cta { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
  .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 18px; border-radius:999px; font-weight:650; text-decoration:none; border:1px solid var(--line); color:var(--fg); background:var(--card); }
  .btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .btn:hover { filter: brightness(1.08); }
  .small { color: var(--muted); font-size: 13px; margin-top: 12px; }
  .shot-touchbar { margin: 34px auto 10px; max-width: 1004px; }
  .shot-touchbar img, .shot-float img, figure img { width:100%; height:auto; display:block; border-radius:12px; }
  .shot-float { max-width: 480px; margin: 18px auto 0; }
  section { padding: 44px 0; border-top: 1px solid var(--line); }
  h2 { font-size: clamp(24px, 3.4vw, 32px); margin: 0 0 22px; letter-spacing:-.01em; }
  .grid { display:grid; gap:14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }
  .card h3 { margin:0 0 6px; font-size:17px; }
  .card p { margin:0; color: var(--muted); font-size:15px; }
  ol.steps { list-style:none; padding:0; margin:0; display:grid; gap:14px; counter-reset: s; }
  ol.steps li { counter-increment: s; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 18px 18px 62px; position:relative; }
  ol.steps li::before { content: counter(s); position:absolute; left:18px; top:18px; width:30px; height:30px; border-radius:50%; background:var(--accent); color:var(--accent-ink); font-weight:700; display:grid; place-items:center; }
  ol.steps h3 { margin:0 0 4px; font-size:17px; }
  ol.steps p { margin:0; color: var(--muted); }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; }
  code { background:#22262d; padding:2px 6px; border-radius:6px; color: var(--fg); }
  pre { background:#0b0c0e; border:1px solid var(--line); border-radius:10px; padding:12px 14px; overflow-x:auto; margin:10px 0 0; color: var(--fg); }
  .shots { display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items:start; }
  figure { margin:0; } figure.wide { grid-column: 1 / -1; } figcaption { color: var(--muted); font-size:14px; margin-top:8px; text-align:center; }
  details { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 18px; }
  details + details { margin-top:10px; }
  summary { cursor:pointer; font-weight:650; }
  details p { color: var(--muted); margin: 10px 0 2px; }
  footer { border-top:1px solid var(--line); padding: 26px 0 40px; color: var(--muted); font-size: 13px; }
  footer a { color: var(--muted); }
  @media (max-width: 560px) { header.top nav a.hide-sm { display:none; } ol.steps li { padding-left: 56px; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <img src="${up}images/icon128.png" alt="" width="32" height="32"><b>LyricBar</b>
    <nav>
      <a class="hide-sm" href="#install">${esc(t.installTitle)}</a>
      <a class="hide-sm" href="#faq">${esc(t.faqTitle)}</a>
      <a href="${SITE}${other.path}" hreflang="${other.htmlLang}" lang="${other.htmlLang}">${esc(t.switchLabel)}</a>
      <a href="${REPO}">GitHub</a>
    </nav>
  </header>

  <main>
    <div class="hero">
      <h1>${t.h1}</h1>
      <p class="lead">${esc(t.lead)}</p>
      <div class="cta">
        <a class="btn primary" href="#install">${esc(t.ctaExt)}</a>
        <a class="btn" href="${DL}/LyricBar.dmg">${esc(t.ctaMac)}</a>
        <a class="btn" href="${REPO}">★ ${esc(t.ctaGit)}</a>
      </div>
      <p class="small">${esc(t.meta)}</p>
      <div class="shot-touchbar"><img src="${up}images/touchbar-lyrics.png" alt="${esc(t.altTouchbar)}" width="2008" height="60"></div>
      <div class="shot-float"><img src="${up}images/floating-lyrics.png" alt="${esc(t.altFloat)}" width="1008" height="368" loading="lazy"></div>
    </div>

    <section>
      <h2>${esc(t.worksTitle)}</h2>
      <div class="grid">${t.works.map(([h, p]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
    </section>

    <section>
      <h2>${esc(t.featuresTitle)}</h2>
      <div class="grid">${t.features.map(([h, p]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
    </section>

    <section id="install">
      <h2>${esc(t.installTitle)}</h2>
      <ol class="steps">
        ${t.install.map(([h, p], i) => `<li><h3>${esc(h)}</h3><p>${p}</p>${i === 2 ? `<pre><code>${esc(INSTALL_CMD)}</code></pre>` : ''}</li>`).join('\n        ')}
      </ol>
      <p style="margin-top:18px"><a href="${guide}">${esc(t.guide)} →</a></p>
    </section>

    <section>
      <h2>${esc(t.shotsTitle)}</h2>
      <div class="shots">${t.shots.map(([src, cap], i) => `<figure${i === 0 ? ' class="wide"' : ''}><img src="${up}${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>
    </section>

    <section id="faq">
      <h2>${esc(t.faqTitle)}</h2>
      ${t.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ')}
    </section>
  </main>

  <footer>
    <p>${esc(t.footer)}</p>
    <p><a href="${REPO}">GitHub</a> · <a href="${REPO}/releases">Releases</a> · <a href="${REPO}/blob/main/LICENSE">MIT License</a> · <a href="${SITE}${other.path}" hreflang="${other.htmlLang}">${esc(t.switchLabel)}</a></p>
  </footer>
</div>
</body>
</html>
`;
}

function sitemap() {
  const alt = `<xhtml:link rel="alternate" hreflang="en" href="${SITE}"/><xhtml:link rel="alternate" hreflang="id" href="${SITE}id/"/>`;
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${SITE}</loc><lastmod>${today}</lastmod>${alt}</url>
  <url><loc>${SITE}id/</loc><lastmod>${today}</lastmod>${alt}</url>
</urlset>
`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'id'), { recursive: true });
cpSync(join(ROOT, 'docs/images'), join(OUT, 'images'), { recursive: true });
for (const size of [32, 128]) cpSync(join(ROOT, `extension/icons/icon${size}.png`), join(OUT, `images/icon${size}.png`));
writeFileSync(join(OUT, 'index.html'), page('en'));
writeFileSync(join(OUT, 'id/index.html'), page('id'));
writeFileSync(join(OUT, 'sitemap.xml'), sitemap());
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`✓ ${OUT} (${Object.keys(STRINGS).length} languages, v${VERSION})`);
