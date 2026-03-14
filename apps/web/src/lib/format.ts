export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es");
}

export function formatCurrency(amount: number | string): string {
  return `$${Number(amount).toFixed(2)}`;
}
