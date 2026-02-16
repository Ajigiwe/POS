"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt
} from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils/currency"
import { getPaymentColor, getStatusColor } from "@/lib/utils/colors"
import { SaleDetailsDialog } from "@/components/sale-details-dialog"
import type { Sale, Customer } from "@/lib/db/schema"

interface SaleWithCustomer extends Sale {
  customer?: Customer
  items_count: number
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleWithCustomer[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "customer">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    loadSales()
    loadCustomers()
  }, [])

  const loadSales = async () => {
    setLoading(true)
    try {
      const { getAllSales } = await import("@/lib/db/operations")
      const salesData = await getAllSales()

      // Get customers for lookup
      const customersData = await import("@/lib/db/operations").then(ops => ops.getAllCustomers())
      const customerMap = new Map(customersData.map(c => [c.id, c]))

      // Add customer info and items count to each sale
      setSales(
        salesData.map((sale) => ({
          ...sale,
          customer: sale.customerId ? customerMap.get(sale.customerId) : undefined,
          items_count: sale.items?.length || 0,
        }))
      )
    } catch (error) {
      console.error("Error loading sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const { getAllCustomers } = await import("@/lib/db/operations")
      const customersData = await getAllCustomers()
      setCustomers(customersData)
    } catch (error) {
      console.error("Error loading customers:", error)
    }
  }

  const filteredSales = sales.filter((sale) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesReceipt = sale.id.toString().includes(query)
      const matchesCustomer = sale.customer?.name.toLowerCase().includes(query)
      if (!matchesReceipt && !matchesCustomer) return false
    }

    // Date filter
    if (dateFilter !== "all") {
      const saleDate = new Date(sale.createdAt)
      const now = new Date()

      switch (dateFilter) {
        case "today":
          if (saleDate.toDateString() !== now.toDateString()) return false
          break
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (saleDate < weekAgo) return false
          break
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (saleDate < monthAgo) return false
          break
      }
    }

    // Payment filter
    if (paymentFilter !== "all" && sale.paymentMethod !== paymentFilter) {
      return false
    }

    return true
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "date":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "amount":
        comparison = a.total - b.total
        break
      case "customer":
        const aName = a.customer?.name || ""
        const bName = b.customer?.name || ""
        comparison = aName.localeCompare(bName)
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const totalPages = Math.ceil(sortedSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSales = sortedSales.slice(startIndex, startIndex + itemsPerPage)

  const handleViewDetails = (saleId: number) => {
    setSelectedSaleId(saleId)
    setShowDetailsDialog(true)
  }

  const handlePrintReceipt = async (saleId: number) => {
    try {
      const { printReceipt } = await import("@/lib/utils/invoice-printer")
      const {
        getSaleById,
        getSaleItems,
        getAllProducts,
        getCustomerById,
        getSettings
      } = await import("@/lib/db/operations")

      const [sale, saleItems, products, settings] = await Promise.all([
        getSaleById(saleId),
        getSaleItems(saleId),
        getAllProducts(),
        getSettings(),
      ])

      if (!sale || !saleItems.length || !products.length) {
        console.error("Missing data for receipt printing")
        return
      }

      let customer = null
      if (sale.customerId) {
        customer = await getCustomerById(sale.customerId)
      }

      const printData = {
        sale,
        saleItems,
        products,
        customer: customer || undefined,
        settings: settings || undefined,
        cashierName: "System Administrator"
      }

      printReceipt(printData)
    } catch (error) {
      console.error("Error printing receipt:", error)
    }
  }

  const getDateRangeText = () => {
    switch (dateFilter) {
      case "today": return "Today"
      case "week": return "Last 7 days"
      case "month": return "Last 30 days"
      default: return "All time"
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Sales History" description="View and manage all sales transactions" />

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Receipt # or customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v: "date" | "amount" | "customer") => setSortBy(v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedSales.length} of {filteredSales.length} sales
            {dateFilter !== "all" && ` • ${getDateRangeText()}`}
          </div>
          <div className="text-sm font-medium">
            Total: {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.total, 0))}
          </div>
        </div>

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => {
                  const paymentColor = getPaymentColor(sale.paymentMethod)
                  const statusColor = getStatusColor(sale.status)

                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">#{sale.id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(sale.createdAt), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(sale.createdAt), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <div>
                            <div className="font-medium">{sale.customer.name}</div>
                            <div className="text-xs text-muted-foreground">{sale.customer.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.items_count} items</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${paymentColor.bg} ${paymentColor.text} border-0`}
                        >
                          {(sale.paymentMethod || "cash").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColor.bg} ${statusColor.text} border-0`}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sale.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintReceipt(sale.id)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredSales.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery || dateFilter !== "all" || paymentFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No sales have been recorded yet. Start by making a sale in the POS system."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        saleId={selectedSaleId}
        onPrintReceipt={handlePrintReceipt}
      />
    </div>
  )
}