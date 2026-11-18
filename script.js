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
