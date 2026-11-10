const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

export function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing element: ${selector}`);
  return element;
}

export function setTextIfChanged(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export function setHtmlIfChanged(element: HTMLElement, html: string): void {
  if (element.dataset['renderedHtml'] === html) return;
  element.dataset['renderedHtml'] = html;
  element.innerHTML = html;
}

export function pickCyclic<T>(pool: readonly T[], index: number, fallback: T): T {
  return pool.length === 0 ? fallback : (pool[((index % pool.length) + pool.length) % pool.length] ?? fallback);
}
