"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, Users, TrendingUp, AlertTriangle, ShoppingCart, BarChart3, UserPlus, Plus } from "lucide-react"
import { getAllProducts, getAllCustomers, getAllSales, getLowStockProducts } from "@/lib/db/operations"
import type { Product, Sale } from "@/lib/db/schema"
import { format } from "date-fns"
import { COLORS, GRADIENT_BGS, CHART_COLORS, getStatusColor, getPaymentColor } from "@/lib/utils/colors"
import { formatCurrency } from "@/lib/utils/currency"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalCustomers: 0,
  })
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [products, customers, sales, lowStock] = await Promise.all([
          getAllProducts(),
          getAllCustomers(),
          getAllSales(),
          getLowStockProducts(),
        ])

        // Calculate today's sales
        const today = new Date().toISOString().split("T")[0]
        const todaySales = sales
          .filter((s) => s.createdAt.startsWith(today) && s.status === "completed")
          .reduce((sum, s) => sum + s.total, 0)

        // Calculate total sales
        const totalSales = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.total, 0)

        setStats({
          totalSales,
          todaySales,
          totalProducts: products.length,
          lowStockCount: lowStock.length,
          totalCustomers: customers.length,
        })

        setLowStockProducts(lowStock.slice(0, 5))
        setRecentSales(
          sales
            .filter((s) => s.status === "completed")
            .slice(-5)
            .reverse(),
        )
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'sales':
        router.push('/pos')
        break
      case 'products':
        router.push('/products')
        break
      case 'customers':
        router.push('/customers')
        break
      case 'reports':
        router.push('/reports')
        break
      default:
        break
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
      <Header title="Dashboard" description="Welcome back! Here's your store overview." />
      <div className="space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={`${GRADIENT_BGS.sales} text-white border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Today's Sales</CardTitle>
              <DollarSign className="h-5 w-5 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.todaySales)}</div>
              <p className="text-xs text-white/80">Total revenue today</p>
            </CardContent>
          </Card>

          <Card className={`${GRADIENT_BGS.sales} text-white border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Sales</CardTitle>
              <TrendingUp className="h-5 w-5 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-white/80">All time revenue</p>
            </CardContent>
          </Card>

          <Card className={`${GRADIENT_BGS.products} text-white border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Products</CardTitle>
              <Package className="h-5 w-5 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
              <p className="text-xs text-white/80">{stats.lowStockCount} low stock items</p>
            </CardContent>
          </Card>

          <Card className={`${GRADIENT_BGS.customers} text-white border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Customers</CardTitle>
              <Users className="h-5 w-5 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalCustomers}</div>
              <p className="text-xs text-white/80">Total registered</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                onClick={() => handleQuickAction('sales')}
                className="h-20 flex-col gap-2 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm font-medium">New Sale</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('products')}
                variant="outline"
                className="h-20 flex-col gap-2 border-blue-200 hover:bg-blue-50"
              >
                <Package className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Add Product</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('customers')}
                variant="outline"
                className="h-20 flex-col gap-2 border-violet-200 hover:bg-violet-50"
              >
                <UserPlus className="h-6 w-6 text-violet-600" />
                <span className="text-sm font-medium">Add Customer</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('reports')}
                variant="outline"
                className="h-20 flex-col gap-2 border-amber-200 hover:bg-amber-50"
              >
                <BarChart3 className="h-6 w-6 text-amber-600" />
                <span className="text-sm font-medium">View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Low Stock Alert */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">Low Stock Alert</span>
              </CardTitle>
              <CardDescription>Products that need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-sm">All products are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-red-100 rounded-lg bg-red-50">
                      <div>
                        <p className="text-sm font-medium text-red-900">{product.name}</p>
                        <p className="text-xs text-red-600">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          {product.quantity} left
                        </Badge>
                        <p className="text-xs text-red-600 mt-1">Min: {product.lowStockThreshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-green-800">Recent Sales</span>
              </CardTitle>
              <CardDescription>Latest completed transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales yet</p>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => {
                    const statusColor = getStatusColor(sale.status)
                    const paymentColor = getPaymentColor(sale.paymentMethod)
                    return (
                      <div key={sale.id} className="flex items-center justify-between p-3 border border-green-100 rounded-lg bg-green-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-green-900">Sale #{sale.id}</p>
                            <Badge className={`${statusColor.bg} ${statusColor.text} text-xs`}>
                              {sale.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-green-600">
                            {format(new Date(sale.createdAt), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-800">{formatCurrency(sale.total)}</p>
                          <div className="flex items-center gap-1">
                            <div className={`h-2 w-2 rounded-full ${paymentColor.icon.replace('text-', 'bg-')}`}></div>
                            <p className={`text-xs capitalize ${paymentColor.icon}`}>{sale.paymentMethod}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
