/** Small text helpers: 'Closes in 3 days', '13 Nov 2026'. */
export function closingLabel(daysLeft: number, isOpen: boolean): string {
  if (!isOpen) return 'Closed';
  if (daysLeft === 0) return 'Closes today';
  if (daysLeft === 1) return 'Closes tomorrow';
  return `Closes in ${daysLeft} days`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}
