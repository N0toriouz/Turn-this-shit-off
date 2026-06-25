(function () {
  const REPO_ART = 'https://raw.githubusercontent.com/N0toriouz/Turn-this-shit-off/main/art/';
  const SEP       = '\u00A0\u00A0\u00A0\u00B7\u00A0\u00A0\u00A0';
  const SEP_WIDE  = '\u00A0'.repeat(16) + '\u2014' + '\u00A0'.repeat(16);

  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';
  overlay.innerHTML = `
    <div id="lb-box">
      <button id="lb-close" aria-label="Close">&times;</button>
      <div id="lb-art-wrap"><img id="lb-img" src="" alt=""></div>
      <div id="lb-carousels">
        <div class="lb-track"><span id="lb-car-name"    class="lb-car lb-car-slow"></span></div>
        <div class="lb-track"><span id="lb-car-date"    class="lb-car lb-car-med"></span></div>
        <div class="lb-track"><span id="lb-car-streams" class="lb-car lb-car-fast"></span></div>
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
    #lb-carousels { border-top: 1px solid #2A2A2A; }
    .lb-track {
      overflow: hidden; white-space: nowrap;
      padding: 0.55rem 0;
      border-bottom: 1px solid #1A1A1A;
    }
    .lb-track:last-child { border-bottom: none; }
    .lb-car { display: inline-block; will-change: transform; }
    .lb-car-slow {
      font-family: 'DM Serif Display', serif; font-size: 0.95rem; color: #F2F2F2;
      animation: lb-scroll 55s linear infinite;
      animation-delay: -14s;
    }
    .lb-car-med {
      font-size: 0.72rem; color: #888; letter-spacing: 0.1em; text-transform: uppercase;
      animation: lb-scroll 13s linear infinite;
      animation-delay: -3s;
    }
    .lb-car-fast {
      font-size: 0.72rem; color: #D4AF37; letter-spacing: 0.1em; font-variant-numeric: tabular-nums;
      animation: lb-scroll 30s linear infinite;
      animation-delay: -8s;
    }
    @keyframes lb-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
  `;

  function formatStreamsLb(n) {
    if (n < 1000) return '\u25B6 ' + String(n) + ' streams';
    if (n === 1000) return '\u25B6 1K streams';
    return '\u25B6 ' + (n / 1000).toFixed(1) + 'K streams';
  }

  function setCarousel(el, text, reps, sep) {
    const unit = Array(reps).fill(text).join(sep);
    el.textContent = unit + sep + unit;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  function open(el) {
    const { artNumber, songName, releaseDate, streamCount } = el.dataset;
    document.getElementById('lb-img').src = REPO_ART + artNumber + '.jpg';
    document.getElementById('lb-img').alt = songName || '';
    setCarousel(document.getElementById('lb-car-name'),    songName || '',    8, SEP);
    setCarousel(document.getElementById('lb-car-date'),    releaseDate || '', 6, SEP);
    setCarousel(document.getElementById('lb-car-streams'),
      streamCount ? formatStreamsLb(Number(streamCount)) : '\u25B6 \u2014 streams',
      3, SEP_WIDE);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('lb-img').src = '';
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.getElementById('lb-close').addEventListener('click', close);
  });

  window.openLightbox = open;
})();
