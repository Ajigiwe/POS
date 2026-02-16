// Currency utility functions for Ghana Cedis (GHS)

export function formatCurrency(amount: number | string, currency: string = "GHS"): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount)

  if (isNaN(numericAmount)) {
    return currency === "GHS" ? `\u20B50.00` : `$0.00`
  }

  if (currency === "GHS") {
    return `\u20B5${numericAmount.toFixed(2)}`
  }
  return `$${numericAmount.toFixed(2)}`
}

export function getCurrencySymbol(currency: string = "GHS"): string {
  switch (currency.toUpperCase()) {
    case "GHS":
      return "\u20B5"
    case "USD":
      return "$"
    case "EUR":
      return "\u20AC"
    case "GBP":
      return "\u00A3"
    default:
      return currency
  }
}

export function parseCurrencyAmount(value: string): number {
  // Remove currency symbols and parse as number
  const cleanValue = value.replace(/[\u20B5$\u20AC\u00A3,]/g, '')
  return parseFloat(cleanValue) || 0
}

export function formatCurrencyInput(value: string, currency: string = "GHS"): string {
  const amount = parseCurrencyAmount(value)
  return formatCurrency(amount, currency)
}
