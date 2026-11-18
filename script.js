(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canHover && !reduceMotion) {
    const MAX_TILT = 4;

    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        card.classList.add('is-tilting');
        card.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX_TILT}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX_TILT}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });

      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  if (!reduceMotion) {
    const PIXEL = 3;
    const TINTS = [
      [255, 40, 200],
      [40, 230, 255],
      [80, 255, 120],
      [255, 210, 40],
      [120, 80, 255],
    ];
    const tv = document.createElement('canvas');
    tv.className = 'tv-static';
    tv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tv);
    const ctx = tv.getContext('2d');
    let frame = null;

    const resize = () => {
      tv.width = Math.ceil(window.innerWidth / PIXEL);
      tv.height = Math.ceil(window.innerHeight / PIXEL);
      frame = ctx.createImageData(tv.width, tv.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (colorAmount, tint, bandTop, bandHeight) => {
      const { data, width, height } = frame;
      for (let y = 0; y < height; y++) {
        const inBand = tint && y >= bandTop && y < bandTop + bandHeight;
        const rowGain = Math.random() < 0.04 ? 1.6 : 1;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const v = Math.random() * 255 * rowGain;
          let r = v;
          let g = v;
          let b = v;
          if (Math.random() < colorAmount) {
            r = Math.random() * 255;
            g = Math.random() * 255;
            b = Math.random() * 255;
          }
          if (inBand) {
            r = (r + tint[0]) / 2;
            g = (g + tint[1]) / 2;
            b = (b + tint[2]) / 2;
          }
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(frame, 0, 0);
    };

    const schedule = (min = 3500, spread = 8000) => {
      setTimeout(burst, min + Math.random() * spread);
    };

    const burst = () => {
      if (document.hidden) return schedule();

      const colored = Math.random() < 0.55;
      const colorAmount = colored ? 0.25 + Math.random() * 0.6 : 0;
      const tint = colored && Math.random() < 0.7 ? TINTS[Math.floor(Math.random() * TINTS.length)] : null;
      const duration = 120 + Math.random() * 420;
      const peak = 0.14 + Math.random() * 0.22;
      const bandHeight = Math.ceil(tv.height * (0.15 + Math.random() * 0.4));
      let bandTop = Math.random() * tv.height;
      const start = performance.now();

      const tick = (now) => {
        const t = (now - start) / duration;
        if (t >= 1) {
          tv.style.opacity = '0';
          if (Math.random() < 0.3) schedule(80, 300);
          else schedule();
          return;
        }
        bandTop = (bandTop + tv.height * 0.07) % tv.height;
        draw(colorAmount, tint, bandTop - bandHeight / 2, bandHeight);
        tv.style.opacity = String(peak * Math.sin(Math.PI * t) * (0.6 + Math.random() * 0.4));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    schedule(1500, 3000);
  }

  const popup = document.getElementById('slack-popup');
  if (!popup) return;

  const STORAGE_KEY = 'tec-slack-popup';
  const DELAY_MS = 30000;
  const popupWindow = popup.querySelector('.popup-window');
  const steps = {
    ask: popup.querySelector('[data-step="ask"]'),
    confirm: popup.querySelector('[data-step="confirm"]'),
  };
  let currentStep = 'ask';
  let lastFocused = null;

  const readState = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const writeState = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable */
    }
  };

  const showStep = (name) => {
    currentStep = name;
    Object.entries(steps).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
    popup.setAttribute('aria-labelledby', `popup-title-${name}`);
    popupWindow.classList.remove('is-swapping');
    void popupWindow.offsetWidth;
    popupWindow.classList.add('is-swapping');
    steps[name].querySelector('.cta').focus();
  };

  const open = () => {
    if (readState()) return;
    lastFocused = document.activeElement;
    popup.hidden = false;
    document.body.classList.add('popup-open');
    showStep('ask');
  };

  const close = () => {
    popup.hidden = true;
    document.body.classList.remove('popup-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  };

  const decline = () => {
    if (currentStep === 'ask') {
      showStep('confirm');
    } else {
      writeState('dismissed');
      close();
    }
  };

  popup.addEventListener('click', (event) => {
    const action = event.target.closest('[data-popup]')?.dataset.popup;

    if (action === 'apply') {
      writeState('applied');
      close();
    } else if (action === 'decline') {
      decline();
    } else if (action === 'dismiss') {
      writeState('dismissed');
      close();
    } else if (event.target === popup) {
      decline();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (popup.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      decline();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = [...popupWindow.querySelectorAll('a[href], button')].filter(
        (el) => !el.closest('[hidden]')
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (!readState()) setTimeout(open, DELAY_MS);
})();
