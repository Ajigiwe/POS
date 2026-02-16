"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Award, ShoppingBag, Calendar, Mail, Phone } from "lucide-react"
import { getAllSales } from "@/lib/db/operations"
import type { Customer, Sale } from "@/lib/db/schema"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils/currency"

interface CustomerDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export function CustomerDetailsDialog({ open, onOpenChange, customer }: CustomerDetailsDialogProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (customer && open) {
      loadCustomerSales()
    }
  }, [customer, open])

  const loadCustomerSales = async () => {
    if (!customer) return

    setLoading(true)
    try {
      const allSales = await getAllSales()
      const customerSales = allSales
        .filter((s) => s.customerId === customer.id && s.status === "completed")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setSales(customerSales)
    } catch (error) {
      console.error("[v0] Error loading customer sales:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>Customer details and purchase history</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.notes && (
                <div className="text-sm">
                  <p className="font-medium">Notes:</p>
                  <p className="text-muted-foreground">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{customer.loyaltyPoints}</div>
                    <p className="text-xs text-muted-foreground">Loyalty Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(customer.totalPurchases)}</div>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{sales.length}</div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : sales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No purchases yet</p>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale) => (
                    <div key={sale.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Sale #{sale.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sale.createdAt), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(sale.total)}</p>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {sale.paymentMethod}
                          </Badge>
                        </div>
                      </div>
                      {sale !== sales[sales.length - 1] && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
