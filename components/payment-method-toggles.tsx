"use client"

import { CreditCard, Wallet, Smartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface PaymentMethodTogglesProps {
    enabledMethods: string[]
    onMethodsChange: (methods: string[]) => void
}

const paymentMethods = [
    { id: "cash", label: "Cash", icon: Wallet, description: "Accept cash payments" },
    { id: "card", label: "Card", icon: CreditCard, description: "Credit/Debit cards" },
    { id: "mobile_money", label: "Mobile Money", icon: Smartphone, description: "Mobile payment services" },
]

export function PaymentMethodToggles({ enabledMethods, onMethodsChange }: PaymentMethodTogglesProps) {
    const toggleMethod = (methodId: string) => {
        if (enabledMethods.includes(methodId)) {
            // Don't allow disabling all methods
            if (enabledMethods.length === 1) return
            onMethodsChange(enabledMethods.filter((m) => m !== methodId))
        } else {
            onMethodsChange([...enabledMethods, methodId])
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Enable or disable payment options at checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const isEnabled = enabledMethods.includes(method.id)

                    return (
                        <div
                            key={method.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                    <Label className="font-medium">{method.label}</Label>
                                    <p className="text-sm text-muted-foreground">{method.description}</p>
                                </div>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={() => toggleMethod(method.id)}
                                disabled={enabledMethods.length === 1 && isEnabled}
                            />
                        </div>
                    )
                })}

                {enabledMethods.length === 1 && (
                    <p className="text-xs text-muted-foreground">
                        At least one payment method must be enabled
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
