"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TaxRate } from "@/lib/db/schema"

interface TaxRateManagerProps {
    taxRates: TaxRate[]
    onTaxRatesChange: (rates: TaxRate[]) => void
    categories: string[]
}

export function TaxRateManager({ taxRates, onTaxRatesChange, categories }: TaxRateManagerProps) {
    const [newCategory, setNewCategory] = useState("")
    const [newRate, setNewRate] = useState("")

    const handleAdd = () => {
        if (!newCategory || !newRate) return

        const rate = parseFloat(newRate)
        if (isNaN(rate) || rate < 0 || rate > 100) return

        // Check if category already has a tax rate
        if (taxRates.some((tr) => tr.category === newCategory)) {
            return
        }

        onTaxRatesChange([...taxRates, { category: newCategory, rate }])
        setNewCategory("")
        setNewRate("")
    }

    const handleRemove = (category: string) => {
        onTaxRatesChange(taxRates.filter((tr) => tr.category !== category))
    }

    const handleUpdate = (category: string, newRate: number) => {
        onTaxRatesChange(
            taxRates.map((tr) => (tr.category === category ? { ...tr, rate: newRate } : tr))
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Category Tax Rates</CardTitle>
                <CardDescription>Set different tax rates for each product category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Existing tax rates */}
                {taxRates.length > 0 && (
                    <div className="space-y-2">
                        {taxRates.map((taxRate) => (
                            <div key={taxRate.category} className="flex items-center gap-2">
                                <div className="flex-1 font-medium">{taxRate.category}</div>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={taxRate.rate}
                                    onChange={(e) => handleUpdate(taxRate.category, parseFloat(e.target.value) || 0)}
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRemove(taxRate.category)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add new tax rate */}
                <div className="border-t pt-4 space-y-2">
                    <Label>Add Category Tax Rate</Label>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select category...</option>
                                {categories
                                    .filter((cat) => !taxRates.some((tr) => tr.category === cat))
                                    .map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="w-24">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="Rate"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={!newCategory || !newRate}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
