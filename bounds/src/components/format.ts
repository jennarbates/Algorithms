/** A number short enough for an axis label: 1,500, 2.5·10⁶. */
export function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) {
    const e = Math.floor(Math.log10(a));
    const m = v / 10 ** e;
    return `${Number.isInteger(Math.round(m * 10) / 10) ? Math.round(m) : m.toFixed(1)}·10${String(
      e,
    )
      .split('')
      .map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])
      .join('')}`;
  }
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  return String(Math.round(v * 100) / 100);
}
