"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, AlertCircle, Package, DollarSign, TrendingUp, AlertTriangle, Tag } from "lucide-react"
import { getAllProducts, deleteProduct, getAllCategories } from "@/lib/db/operations"
import type { Product, Category } from "@/lib/db/schema"
import { ProductDialog } from "@/components/product-dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getCategoryColor, getStockColor, GRADIENT_BGS } from "@/lib/utils/colors"
import { formatCurrency } from "@/lib/utils/currency"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const loadProducts = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getAllCategories()
      ])
      setProducts(productsData)
      setFilteredProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("[v0] Error loading products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    let filtered = products

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category?.name === categoryFilter)
    }

    setFilteredProducts(filtered)
  }, [searchQuery, categoryFilter, products])

  // Get unique categories from products for filtering
  const productCategories = Array.from(new Set(products.map((p) => p.category?.name).filter((n): n is string => !!n)))

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      await deleteProduct(productToDelete.id)
      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      loadProducts()
    } catch (error) {
      console.error("[v0] Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleDialogClose = (refresh: boolean) => {
    setDialogOpen(false)
    setEditingProduct(null)
    if (refresh) {
      loadProducts()
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
      <Header title="Products" description="Manage your inventory and product catalog" />
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={`${GRADIENT_BGS.products} text-white border-0`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{products.length}</div>
                  <p className="text-xs text-white/80">Total Products</p>
                </div>
                <Package className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>
          <Card className={`${GRADIENT_BGS.alerts} text-white border-0`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {products.filter((p) => p.quantity <= p.lowStockThreshold).length}
                  </div>
                  <p className="text-xs text-white/80">Low Stock Items</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>
          <Card className={`${GRADIENT_BGS.customers} text-white border-0`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{categories.length}</div>
                  <p className="text-xs text-white/80">Categories</p>
                </div>
                <TrendingUp className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/categories')}
            >
              <Tag className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
            {/* Cashiers cannot add products */}
            {(() => {
              // Client-Side Role Check inline or use a state loaded in useEffect
              // Since this component uses 'use client', we can use the same logic
              // But let's use a simpler check:
              const session = require("@/lib/auth/session").getSession();
              return session?.user.role === 'admin' ? (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              ) : null
            })()}
          </div>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const categoryColor = getCategoryColor(product.category?.name || 'Uncategorized')
                    const stockColor = getStockColor(product.quantity, product.lowStockThreshold)
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            {product.barcode && <div className="text-xs text-gray-500">{product.barcode}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{product.sku}</code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${categoryColor.bg} ${categoryColor.text} border-0`}
                          >
                            {product.category?.name || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {product.quantity <= product.lowStockThreshold && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <Badge
                              className={`${stockColor.bg} ${stockColor.text} text-xs`}
                            >
                              {product.quantity}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const session = require("@/lib/auth/session").getSession();
                            if (session?.user.role === 'admin') {
                              return (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(product)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setProductToDelete(product)
                                      setDeleteDialogOpen(true)
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            }
                            return <span className="text-muted-foreground text-xs">Read Only</span>;
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ProductDialog open={dialogOpen} onOpenChange={handleDialogClose} product={editingProduct} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {productToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
