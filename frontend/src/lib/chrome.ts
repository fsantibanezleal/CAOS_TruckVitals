// Size the App workbench from the chrome that is actually on screen.
//
// The layout used a hardcoded `calc(100dvh - 150px)`. The real chrome at 1600x900 is a 57px header, a
// 128px footer, page padding and the gaps between them, and the guess was short by about 130px. The
// workbench overflowed, and because an ancestor clips, `documentElement.scrollHeight` stayed pinned to
// the viewport: the page could not be scrolled and the footer simply could not be REACHED. A visual gate
// that only asked "does the document scroll" reported that as a pass.
//
// Guessing a second constant would repeat the mistake with a different number. Instead this measures the
// result and corrects it: set an estimate, look at where the footer actually landed, and fold the
// overshoot back in. It converges in one pass and stays correct if the footer's height ever changes,
// which it does, because the footer wraps differently at different widths and in different languages.

import { useEffect } from 'react';

const FALLBACK = 320;

export function useChromeHeight() {
  useEffect(() => {
    let raf = 0;
    // Marks the workbench route so CSS can reclaim chrome that only makes sense on a prose page. The
    // shell gives its footer a 48px top margin, which is right for reading and is dead space under a
    // fixed-height instrument. Scoped to this route and removed on unmount, so no other page changes.
    document.documentElement.classList.add('tv-workbench');

    // Applying a value that is already set would restyle the layout, which resizes the charts, which
    // resizes the layout again. Only write a real change, and only one big enough to matter.
    const apply = (px: number) => {
      const want = Math.round(px);
      const have = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--tv-chrome'));
      if (Number.isFinite(have) && Math.abs(have - want) <= 2) return;
      document.documentElement.style.setProperty('--tv-chrome', `${want}px`);
    };

    const measure = () => {
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      if (!footer) { apply(FALLBACK); return; }

      // First pass: the parts we can name. Skipped once a corrected value is already in place, so a
      // later resize does not throw away the correction and start the oscillation again.
      const settled = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--tv-chrome'));
      if (!Number.isFinite(settled)) {
        const named = (header?.getBoundingClientRect().height || 0)
          + footer.getBoundingClientRect().height;
        apply(named + 48);
      }

      // Second pass: whatever the first pass failed to account for (page padding, margins, the gap the
      // shell puts above its footer) shows up as the footer overshooting the viewport bottom.
      raf = requestAnimationFrame(() => {
        const bottom = footer.getBoundingClientRect().bottom;
        const overshoot = bottom - window.innerHeight;
        if (Math.abs(overshoot) > 2) {
          const current = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--tv-chrome')) || FALLBACK;
          apply(Math.max(0, current + overshoot));
        }
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    if (header) ro.observe(header);
    if (footer) ro.observe(footer);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      document.documentElement.classList.remove('tv-workbench');
      document.documentElement.style.removeProperty('--tv-chrome');
    };
  }, []);
}
