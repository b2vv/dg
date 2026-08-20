export function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

export function showError(container: HTMLElement, message: string): void {
  container.innerHTML = `<div class="error-banner" role="alert">${escapeHtml(message)}</div>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function setThemeAttribute(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
}

export function getThemeFromDocument(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
