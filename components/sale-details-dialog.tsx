"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Printer, User, Calendar, CreditCard, Receipt } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils/currency"
import { getPaymentColor } from "@/lib/utils/colors"
import { printReceipt } from "@/lib/utils/invoice-printer"
import type { Sale, SaleItem, Product, Customer, Settings } from "@/lib/db/schema"

interface SaleDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: number | null
  onPrintReceipt?: (saleId: number) => void
}

export function SaleDetailsDialog({
  open,
  onOpenChange,
  saleId,
  onPrintReceipt
}: SaleDetailsDialogProps) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && saleId) {
      loadSaleDetails()
    }
  }, [open, saleId])

  const loadSaleDetails = async () => {
    if (!saleId) return

    setLoading(true)
    try {
      // Import the operations dynamically to avoid circular dependencies
      const {
        getSaleById,
        getSaleItems,
        getAllProducts,
        getCustomerById,
        getSettings
      } = await import("@/lib/db/operations")

      const [saleData, itemsData, productsData, settingsData] = await Promise.all([
        getSaleById(saleId),
        getSaleItems(saleId),
        getAllProducts(),
        getSettings(),
      ])

      setSale(saleData || null)
      setSaleItems(itemsData)
      setProducts(productsData)
      setSettings(settingsData || null)

      // Load customer if exists
      if (saleData?.customerId) {
        const customerData = await getCustomerById(saleData.customerId)
        setCustomer(customerData || null)
      }
    } catch (error) {
      console.error("Error loading sale details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!sale || !saleItems.length || !products.length) return

    const printData = {
      sale,
      saleItems,
      products,
      customer: customer || undefined,
      settings: settings || undefined,
      cashierName: "System Administrator" // This should come from the sale's user data
    }

    printReceipt(printData)

    if (onPrintReceipt) {
      onPrintReceipt(sale.id)
    }
  }

  const paymentColor = getPaymentColor(sale?.paymentMethod || "cash")

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Loading Sale Details</DialogTitle>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!sale) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Sale Detail Error</DialogTitle>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Sale not found</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5" />
          Sale Details - Receipt #{sale.id}
        </DialogTitle>

        <div className="space-y-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sale Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{format(new Date(sale.createdAt), "MMM dd, yyyy 'at' HH:mm")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {sale.status}
                    </Badge>
                  </div>
                </div>
                {customer && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer</label>
                    <p className="text-sm">{customer.name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <div className="mt-1">
                    <Badge
                      className={`${paymentColor.bg} ${paymentColor.text} border-0`}
                    >
                      {sale.paymentMethod.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-600">Subtotal:</span>
                <span className="text-blue-800 font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({settings?.taxRate || 0}%):</span>
                <span className="text-gray-800 font-medium">{formatCurrency(sale.taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-green-600">Total:</span>
                <span className="text-green-800">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Payment Received:</span>
                <span className="text-purple-800 font-medium">{formatCurrency(sale.paymentReceived || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Change Given:</span>
                <span className="text-amber-800 font-medium">{formatCurrency(sale.changeGiven || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handlePrintReceipt}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
