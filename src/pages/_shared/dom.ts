export function $(selector: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector(selector)
}

export function setText(el: Element | null, value: string) {
  if (!el) return
  el.textContent = value
}

export function setHtml(el: Element | null, html: string) {
  if (!el) return
  ;(el as HTMLElement).innerHTML = html
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function asChips(items: string[], args?: { variant?: 'good' | 'bad' }): string {
  const variant = args?.variant ?? 'good'
  const base = variant === 'good' ? 'text-primary' : 'text-tertiary'

  return items
    .map(
      (t) =>
        `<span class="${base} text-sm font-medium inline-flex items-center gap-1">` +
        `<span class="material-symbols-outlined text-[16px]">${variant === 'good' ? 'check_circle' : 'error'}</span>` +
        `${escapeHtml(t)}` +
        `</span>`,
    )
    .join('')
}
