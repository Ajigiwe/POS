"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, TrendingUp, DollarSign, Package, Users, ShoppingCart, CreditCard, ArrowUpRight, ArrowDownRight, ChevronDown, FileSpreadsheet, FileText, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getAllSales, getAllProducts, getAllCustomers, getAllSaleItems, getSettings } from "@/lib/db/operations"
import type { Sale, Product, Customer, SaleItem } from "@/lib/db/schema"
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { exportToPDF, exportToExcel } from "@/lib/utils/export-utils"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type DateRange = "today" | "week" | "month" | "all"

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dateRange, setDateRange] = useState<DateRange>("month")
  const [loading, setLoading] = useState(true)
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [currency, setCurrency] = useState("GHS")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [salesData, productsData, customersData, saleItemsData, settingsData] = await Promise.all([
        getAllSales(),
        getAllProducts(),
        getAllCustomers(),
        getAllSaleItems(),
        getSettings(),
      ])
      setSales(salesData.filter((s: Sale) => s.status === "completed"))
      setProducts(productsData)
      setCustomers(customersData)
      setSaleItems(saleItemsData)
      if (settingsData) {
        setCurrency(settingsData.currency)
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredSales = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case "today":
        startDate = startOfDay(now)
        break
      case "week":
        startDate = startOfWeek(now)
        break
      case "month":
        startDate = startOfMonth(now)
        break
      default:
        return sales
    }

    return sales.filter((s) => new Date(s.createdAt) >= startDate)
  }

  const filteredSales = getFilteredSales()

  // Calculate stats
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0)
  const totalTransactions = filteredSales.length
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discountAmount, 0)
  const totalTax = filteredSales.reduce((sum, s) => sum + s.taxAmount, 0)

  // Calculate growth (compare with previous period)
  const getPreviousPeriodSales = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (dateRange) {
      case "today":
        startDate = startOfDay(subDays(now, 1))
        endDate = startOfDay(now)
        break
      case "week":
        startDate = startOfWeek(subDays(now, 7))
        endDate = startOfWeek(now)
        break
      case "month":
        startDate = startOfMonth(subDays(now, 30))
        endDate = startOfMonth(now)
        break
      default:
        return []
    }

    return sales.filter((s) => {
      const date = new Date(s.createdAt)
      return date >= startDate && date < endDate
    })
  }

  const previousSales = getPreviousPeriodSales()
  const previousRevenue = previousSales.reduce((sum, s) => sum + s.total, 0)
  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

  // Sales by day with gradient area chart
  const salesByDay = filteredSales.reduce(
    (acc, sale) => {
      const date = format(new Date(sale.createdAt), "MMM dd")
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, transactions: 0, profit: 0 }
      }

      // Calculate profit for this sale
      // Profit = Revenue (Total - Tax) - Cost of Goods Sold
      const currentSaleItems = saleItems.filter(item => item.saleId === sale.id)
      const costOfGoods = currentSaleItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId)
        return sum + (product ? product.costPrice * item.quantity : 0)
      }, 0)

      const netRevenue = sale.total - sale.taxAmount
      const profit = netRevenue - costOfGoods

      acc[date].revenue += sale.total
      acc[date].transactions += 1
      acc[date].profit += profit
      return acc
    },
    {} as Record<string, { date: string; revenue: number; transactions: number; profit: number }>,
  )

  const salesChartData = Object.values(salesByDay).slice(-30)

  // Product Trend Data
  const getProductTrendData = () => {
    const data: Record<string, { date: string; revenue: number; quantity: number }> = {}

    // Initialize dates based on filtered sales to ensure continuity
    filteredSales.forEach(sale => {
      const date = format(new Date(sale.createdAt), "MMM dd")
      if (!data[date]) {
        data[date] = { date, revenue: 0, quantity: 0 }
      }
    })

    if (selectedProduct === "all") {
      // Using salesByDay which is already calculated for all sales
      Object.values(salesByDay).forEach(day => {
        if (data[day.date]) {
          data[day.date].revenue = day.revenue
          // We don't have quantity in salesByDay, so we'd need to aggregate it if we want it for "all"
          // For simplicity, let's recalculate or just stick to specific product logic
        }
      })
      // Re-aggregating for "all" to get quantity
      filteredSales.forEach(sale => {
        const date = format(new Date(sale.createdAt), "MMM dd")
        if (!data[date]) data[date] = { date, revenue: 0, quantity: 0 }

        const items = saleItems.filter(item => item.saleId === sale.id)
        items.forEach(item => {
          data[date].quantity += item.quantity
        })
        data[date].revenue += sale.total // Use sale total for revenue
      })

    } else {
      const productId = parseInt(selectedProduct)
      // Filter items for this product that belong to the filtered sales
      const relevantItems = saleItems.filter(item =>
        item.productId === productId &&
        filteredSales.some(s => s.id === item.saleId)
      )

      relevantItems.forEach(item => {
        const sale = filteredSales.find(s => s.id === item.saleId)
        if (sale) {
          const date = format(new Date(sale.createdAt), "MMM dd")
          if (!data[date]) {
            data[date] = { date, revenue: 0, quantity: 0 }
          }
          data[date].revenue += item.subtotal
          data[date].quantity += item.quantity
        }
      })
    }

    return Object.values(data).sort((a, b) => {
      // Sort by date roughly - relying on the order of filteredSales might be enough but safer to sort if keys were random
      // Since we build from filteredSales traversing, it should be chronological if filteredSales is.
      // Let's assume chronological for now for simplicity or add a proper date object for sorting if needed.
      return 0
    })
  }

  const productTrendData = getProductTrendData()

  // Calculate trend insights
  const totalSelectedRevenue = productTrendData.reduce((sum, item) => sum + item.revenue, 0)
  const totalSelectedQuantity = productTrendData.reduce((sum, item) => sum + item.quantity, 0)
  const peakDate = productTrendData.reduce((max, item) => (item.revenue > max.revenue ? item : max), { revenue: 0, date: "" }).date

  // Sales by payment method with vibrant colors
  const paymentMethodData = filteredSales.reduce(
    (acc, sale) => {
      const method = sale.paymentMethod
      if (!acc[method]) {
        acc[method] = { name: method, value: 0, count: 0 }
      }
      acc[method].value += sale.total
      acc[method].count += 1
      return acc
    },
    {} as Record<string, { name: string; value: number; count: number }>,
  )

  const paymentChartData = Object.values(paymentMethodData)


  // Top products - Memoized to prevent unnecessary recalculations
  useEffect(() => {
    const getTopProducts = () => {
      // Filter sale items to only include those from filtered sales
      const filteredSaleIds = new Set(filteredSales.map(s => s.id))
      const relevantItems = saleItems.filter(item => filteredSaleIds.has(item.saleId))

      const productSales = relevantItems.reduce(
        (acc, item) => {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            }
          }
          acc[item.productId].quantity += item.quantity
          acc[item.productId].revenue += item.subtotal
          return acc
        },
        {} as Record<number, { name: string; quantity: number; revenue: number }>,
      )

      return Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    }

    // Only recalculate when sales count or date range changes
    if (filteredSales.length > 0) {
      setTopProducts(getTopProducts())
    } else {
      setTopProducts([])
    }
  }, [filteredSales.length, dateRange, saleItems])

  const exportToCSV = () => {
    const headers = ["Date", "Sale ID", "Customer", "Items", "Subtotal", "Discount", "Tax", "Total", "Payment Method"]
    const rows = filteredSales.map((sale) => [
      format(new Date(sale.createdAt), "yyyy-MM-dd HH:mm:ss"),
      sale.id,
      sale.customerId || "Walk-in",
      "",
      Number(sale.subtotal).toFixed(2),
      Number(sale.discountAmount).toFixed(2),
      Number(sale.taxAmount).toFixed(2),
      Number(sale.total).toFixed(2),
      sale.paymentMethod,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  const handleExportPDF = () => {
    exportToPDF({
      filteredSales,
      dateRange: dateRange === "today" ? "Today" : dateRange === "week" ? "This Week" : dateRange === "month" ? "This Month" : "All Time",
      totalRevenue,
      totalTransactions,
      averageTransaction,
      totalDiscount,
      totalTax,
      topProducts,
      paymentMethodData: Object.values(paymentMethodData),
    })
  }

  const handleExportExcel = () => {
    exportToExcel({
      filteredSales,
      dateRange: dateRange === "today" ? "Today" : dateRange === "week" ? "This Week" : dateRange === "month" ? "This Month" : "All Time",
      totalRevenue,
      totalTransactions,
      averageTransaction,
      totalDiscount,
      totalTax,
      topProducts,
      paymentMethodData: Object.values(paymentMethodData),
    })
  }

  // Vibrant color palette
  const COLORS = {
    primary: "#8B5CF6",    // Purple
    secondary: "#EC4899",  // Pink
    success: "#10B981",    // Green
    warning: "#F59E0B",    // Orange
    info: "#3B82F6",       // Blue
    danger: "#EF4444",     // Red
    teal: "#14B8A6",       // Teal
    indigo: "#6366F1",     // Indigo
  }

  const CHART_COLORS = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.info,
    COLORS.warning,
    COLORS.teal,
    COLORS.indigo,
    COLORS.danger,
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header title="Analytics Dashboard" description="Comprehensive sales performance and insights" />
      <div className="space-y-6 p-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[180px] border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Download className="mr-2 h-4 w-4" />
                Export Report
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Overview with Gradient Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Total Revenue</CardTitle>
              <div className="rounded-full bg-purple-500 p-2">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {formatCurrency(totalRevenue, currency)}
              </div>
              <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 mt-1">
                {revenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
                <span>vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Transactions</CardTitle>
              <div className="rounded-full bg-blue-500 p-2">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {totalTransactions}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Avg: {formatCurrency(averageTransaction, currency)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Products</CardTitle>
              <div className="rounded-full bg-green-500 p-2">
                <Package className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {products.length}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                In inventory
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">Customers</CardTitle>
              <div className="rounded-full bg-orange-500 p-2">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {customers.length}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Registered users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales Trend - Area Chart */}
          <Card className="border-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Sales Performance
              </CardTitle>
              <CardDescription>Revenue and transaction trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: COLORS.primary,
                  },
                  profit: {
                    label: "Profit",
                    color: COLORS.success,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #8B5CF6",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name={`Revenue (${getCurrencySymbol(currency)})`}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke={COLORS.success}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      name={`Profit (${getCurrencySymbol(currency)})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Product Performance - Area Chart */}
          <Card className="border-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Product Trend
                </CardTitle>
                <CardDescription>Sales performance over time</CardDescription>
              </div>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                  >
                    {selectedProduct === "all"
                      ? "All Products"
                      : products.find((product) => product.id.toString() === selectedProduct)?.name || "Select product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedProduct("all")
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Products
                        </CommandItem>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              setSelectedProduct(product.id.toString())
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProduct === product.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {product.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex flex-col p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Total Revenue</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                    {formatCurrency(totalSelectedRevenue, currency)}
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Total Sold</span>
                  <span className="text-lg font-bold text-teal-700 dark:text-teal-300">
                    {totalSelectedQuantity} units
                  </span>
                </div>
                <div className="flex flex-col p-2 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Peak Date</span>
                  <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {peakDate || "N/A"}
                  </span>
                </div>
              </div>
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: COLORS.indigo,
                  },
                  quantity: {
                    label: "Quantity",
                    color: COLORS.teal,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productTrendData}>
                    <defs>
                      <linearGradient id="colorProdRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorProdQuantity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis yAxisId="left" stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #6366F1",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.indigo}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorProdRevenue)"
                      name={`Revenue (${getCurrencySymbol(currency)})`}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="quantity"
                      stroke={COLORS.teal}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorProdQuantity)"
                      name="Quantity Sold"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top Products - Horizontal Bar Chart */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Top Selling Products
              </CardTitle>
              <CardDescription>Best performers by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: COLORS.success,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="name" type="category" width={120} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #10B981",
                        borderRadius: "8px",
                      }}
                    />

                    <Bar dataKey="revenue" radius={[0, 8, 8, 0]} name={`Revenue (${getCurrencySymbol(currency)})`}>
                      {topProducts.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Payment Methods - Donut Chart */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Payment Methods
              </CardTitle>
              <CardDescription>Distribution by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: {
                    label: "Amount",
                    color: COLORS.info,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      label={(props: any) => `${props.name}: ${formatCurrency(props.value, currency)}`}
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #3B82F6",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>


          {/* Product Quantity - Pie Chart */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600" />
                Top Products by Quantity
              </CardTitle>
              <CardDescription>Units sold comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  quantity: {
                    label: "Quantity",
                    color: COLORS.teal,
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 6)}
                      dataKey="quantity"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.name}: ${entry.quantity} units`}
                    >
                      {topProducts.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "2px solid #14B8A6",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
