/**
 * What "Learn JavaScript" did to a 1997 homepage: sparkles following the cursor,
 * and a scolding when someone tries to right-click your precious GIFs.
 */

const TRAIL_INTERVAL_MS = 40;
const MAX_SPARKLES = 14;
const SPARKLE_LIFETIME_MS = 700;
const SCOLD_DURATION_MS = 2_200;
const SPARKLES: readonly string[] = ['✦', '✧', '★', '·'];
const SPARKLE_COLORS: readonly string[] = ['#FFFF66', '#FF66FF', '#66FFFF', '#FFFFFF'];
const SCOLD_TEXT = 'Right click is disabled!! Don’t steal my graphics!!';

function pick<T>(values: readonly T[], index: number, fallback: T): T {
  return values[index % values.length] ?? fallback;
}

export function installJavaScriptEffects(site: HTMLElement, overlayLayer: HTMLElement, isEnabled: () => boolean): void {
  let lastSparkleAt = 0;
  let sparkleCount = 0;

  site.addEventListener('pointermove', (event) => {
    const now = performance.now();
    if (!isEnabled() || now - lastSparkleAt < TRAIL_INTERVAL_MS) return;
    lastSparkleAt = now;
    if (site.querySelectorAll('.js-sparkle').length >= MAX_SPARKLES) return;
    const bounds = site.getBoundingClientRect();
    const sparkle = document.createElement('span');
    sparkleCount += 1;
    sparkle.className = 'js-sparkle';
    sparkle.textContent = pick(SPARKLES, sparkleCount, '✦');
    sparkle.style.color = pick(SPARKLE_COLORS, sparkleCount, '#FFFFFF');
    sparkle.style.left = `${event.clientX - bounds.left}px`;
    sparkle.style.top = `${event.clientY - bounds.top + site.scrollTop}px`;
    site.append(sparkle);
    window.setTimeout(() => sparkle.remove(), SPARKLE_LIFETIME_MS);
  });

  site.addEventListener('contextmenu', (event) => {
    if (!isEnabled()) return;
    event.preventDefault();
    overlayLayer.querySelector('.js-scold')?.remove();
    const scold = document.createElement('div');
    scold.className = 'js-scold';
    scold.setAttribute('role', 'alert');
    scold.innerHTML = `<div class="js-scold-title">JavaScript Application</div><p>${SCOLD_TEXT}</p>`;
    overlayLayer.append(scold);
    window.setTimeout(() => scold.remove(), SCOLD_DURATION_MS);
  });
}
