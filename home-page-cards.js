(() => {
  'use strict';
  document.querySelectorAll('.home-responsive .dot-grid').forEach(grid => {
    if (grid.children.length) return;
    grid.setAttribute('aria-hidden', 'true');
    const filled = Math.max(0, Math.min(100, Number(grid.dataset.filled) || 0));
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const dot = document.createElement('span');
      if (i < filled) dot.className = 'on';
      fragment.appendChild(dot);
    }
    grid.appendChild(fragment);
  });
  document.querySelectorAll('.home-responsive .flip-card').forEach(card => {
    if (card.dataset.ready) return;
    card.dataset.ready = 'true';
    const front = card.querySelector('.flip-front');
    const back = card.querySelector('.flip-back');
    function sync() {
      const flipped = card.classList.contains('is-flipped');
      card.setAttribute('aria-pressed', String(flipped));
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      card.setAttribute('aria-label', (flipped ? back : front).textContent.trim().replace(/\s+/g, ' ') + '. Activate to flip.');
    }
    function flip() { card.classList.toggle('is-flipped'); sync(); }
    card.addEventListener('click', flip);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
    });
    // Retain the original desktop hover reveal; explicit click/keyboard toggles
    // take ownership until the pointer leaves, avoiding the old sticky focus.
    let hoverOpened = false;
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || card.classList.contains('is-flipped')) return;
      hoverOpened = true; card.classList.add('is-flipped'); sync();
    });
    card.addEventListener('pointerleave', () => {
      if (hoverOpened) { card.classList.remove('is-flipped'); hoverOpened = false; sync(); }
    });
    card.addEventListener('click', () => { hoverOpened = false; });
    sync();
  });
})();
