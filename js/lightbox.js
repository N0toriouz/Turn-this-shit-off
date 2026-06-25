(function () {
  const REPO_ART = 'https://raw.githubusercontent.com/N0toriouz/Turn-this-shit-off/main/art/';

  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';
  overlay.innerHTML = `
    <div id="lb-box">
      <button id="lb-close" aria-label="Close">&times;</button>
      <div id="lb-art-wrap"><img id="lb-img" src="" alt=""></div>
      <div id="lb-info">
        <p id="lb-title"></p>
        <p id="lb-meta"></p>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #lb-overlay {
      display: none; position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.88); backdrop-filter: blur(6px);
      align-items: center; justify-content: center;
    }
    #lb-overlay.open { display: flex; }
    #lb-box {
      background: #111; border: 1px solid #2A2A2A; border-radius: 2px;
      max-width: 480px; width: calc(100% - 2rem);
      overflow: hidden; position: relative;
    }
    #lb-close {
      position: absolute; top: 0.6rem; right: 0.75rem;
      background: none; border: none; color: #888; font-size: 1.4rem;
      cursor: pointer; line-height: 1; z-index: 1;
      transition: color 0.15s;
    }
    #lb-close:hover { color: #D4AF37; }
    #lb-art-wrap { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; }
    #lb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #lb-info { padding: 1rem 1.25rem 1.25rem; }
    #lb-title {
      font-family: 'DM Serif Display', serif; font-size: 1rem;
      color: #F2F2F2; margin-bottom: 0.35rem; line-height: 1.4;
    }
    #lb-meta { font-size: 0.75rem; color: #888; letter-spacing: 0.04em; }
  `;

  function formatStreamsLb(n) {
    if (n < 1000) return String(n);
    if (n === 1000) return '1K';
    return (n / 1000).toFixed(1) + 'K';
  }

  function open(el) {
    const { artNumber, songName, releaseDate, streamCount } = el.dataset;
    document.getElementById('lb-img').src = REPO_ART + artNumber + '.jpg';
    document.getElementById('lb-img').alt = songName;
    document.getElementById('lb-title').textContent = songName;
    const streams = streamCount ? formatStreamsLb(Number(streamCount)) + ' streams' : '';
    const parts = [releaseDate, streams].filter(Boolean);
    document.getElementById('lb-meta').textContent = parts.join(' · ');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('lb-img').src = '';
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('lb-close') || document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lb-close').addEventListener('click', close);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.getElementById('lb-close').addEventListener('click', close);
  });

  window.openLightbox = open;
})();