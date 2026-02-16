// Price rounding utilities

export type RoundingRule = "none" | "nearest-5" | "nearest-10" | "up" | "down"

export function applyRounding(amount: number, rule: RoundingRule): number {
    switch (rule) {
        case "none":
            return amount

        case "nearest-5":
            return Math.round(amount / 5) * 5

        case "nearest-10":
            return Math.round(amount / 10) * 10

        case "up":
            return Math.ceil(amount)

        case "down":
            return Math.floor(amount)

        default:
            return amount
    }
}

export function roundPrice(price: number, rule: RoundingRule, decimalPlaces: number = 2): number {
    // First round to decimal places
    const rounded = Number(price.toFixed(decimalPlaces))

    // Then apply rounding rule
    return applyRounding(rounded, rule)
}

export function formatRoundedPrice(price: number, rule: RoundingRule, currency: string = "GHS"): string {
    const rounded = roundPrice(price, rule)
    return `${currency} ${rounded.toFixed(2)}`
}
