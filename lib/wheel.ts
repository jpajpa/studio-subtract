/**
 * Desktop pages swallow the wheel, so a trackpad can't rubber-band them. When
 * the window is too small for what's on the page, a mostly vertical wheel has
 * to scroll it instead while there's somewhere to go, or the rest is out of
 * reach.
 */
export function wheelScrollsPage(e: WheelEvent) {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return e.deltaY > 0 ? window.scrollY < max - 1 : window.scrollY > 0;
}
