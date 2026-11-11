export type Payment = {
  id: string
  email: string
  amount: number
  status: string
}
export function getPaymentRows(
  payments: Payment[],
  query: string,
  descending: boolean,
  requestedPage: number,
  size: number
) {
  const filtered = payments
    .filter((payment) =>
      payment.email.toLowerCase().includes(query.trim().toLowerCase())
    )
    .sort((a, b) => (descending ? b.amount - a.amount : a.amount - b.amount))
  const pages = Math.ceil(filtered.length / size)
  const page = Math.max(0, Math.min(requestedPage, pages - 1))
  return {
    rows: filtered.slice(page * size, (page + 1) * size),
    total: filtered.length,
    page,
    pages,
  }
}
