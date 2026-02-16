"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, X, Scan, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import {
  getAllProducts,
  getAllCustomers,
  createSale,
  getSettings,
  getProductByBarcode,
  getAllCategories,
} from "@/lib/db/operations"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import type { Product, Customer, Settings, Category } from "@/lib/db/schema"
import { getSession } from "@/lib/auth/session"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { getCategoryColor, getStockColor } from "@/lib/utils/colors"
import { formatCurrency } from "@/lib/utils/currency"
import { printReceipt as printReceiptUtil } from "@/lib/utils/invoice-printer"

interface CartItem {
  product: Product
  quantity: number
  discount: number
}

const ITEMS_PER_PAGE = 12

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash")
  const [paymentReceived, setPaymentReceived] = useState("")
  const [loading, setLoading] = useState(true)
  const [isScanningMode, setIsScanningMode] = useState(false)
  const { toast } = useToast()

  // Barcode scan handler
  const handleBarcodeScan = async (barcode: string) => {
    try {
      const product = await getProductByBarcode(barcode)
      if (product) {
        addToCart(product)
        toast({
          title: "Product Added",
          description: `${product.name} added to cart`,
        })
        setSearchQuery("") // Clear search field
      } else {
        toast({
          title: "Product Not Found",
          description: `No product found with barcode: ${barcode}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error scanning barcode:", error)
      toast({
        title: "Scan Error",
        description: "Failed to process barcode",
        variant: "destructive",
      })
    }
  }

  // Barcode scanner hook
  const { isScanning, lastScannedBarcode, startScanning, stopScanning } = useBarcodeScanner({
    timeout: 100,
    minLength: 3,
    onScan: handleBarcodeScan
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, customersData, settingsData, categoriesData] = await Promise.all([
          getAllProducts(),
          getAllCustomers(),
          getSettings(),
          getAllCategories(),
        ])
        setProducts(productsData)
        setCustomers(customersData)
        setSettings(settingsData || null)
        setCategories(categoriesData)
      } catch (error) {
        console.error("[v0] Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Derived state for categories - Removed as we now fetch categories directly
  // const categories = useMemo(() => {
  //   const cats = new Set(products.map(p => p.category))
  //   return ["all", ...Array.from(cats)].sort()
  // }, [products])

  // Filter and paginate products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === "all" || (p.categoryId ? p.categoryId.toString() : "") === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)

  const displayedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  const clearCart = () => {
    setCart([])
    setSelectedCustomer("")
    setDiscountValue("")
    setPaymentReceived("")
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (filteredProducts.length > 0) {
        addToCart(filteredProducts[0])
        setSearchQuery("")
      }
    }
  }

  const toggleScanningMode = () => {
    if (isScanningMode) {
      stopScanning()
      setIsScanningMode(false)
    } else {
      startScanning()
      setIsScanningMode(true)
    }
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0)
  }

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal()
    const discount = Number.parseFloat(discountValue) || 0
    if (discountType === "percentage") {
      return (subtotal * discount) / 100
    }
    return discount
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const taxRate = settings?.taxRate || 0
    return ((subtotal - discount) * taxRate) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateTax()
  }

  const calculateChange = () => {
    const total = calculateTotal()
    const received = Number.parseFloat(paymentReceived) || 0
    return Math.max(0, received - total)
  }

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart",
        variant: "destructive",
      })
      return
    }

    const total = calculateTotal()
    const received = Number.parseFloat(paymentReceived) || 0

    if (paymentMethod === "cash" && received < total) {
      toast({
        title: "Insufficient Payment",
        description: "Payment received is less than total amount",
        variant: "destructive",
      })
      return
    }

    try {
      const session = getSession()
      if (!session) {
        toast({
          title: "Error",
          description: "User session not found",
          variant: "destructive",
        })
        return
      }

      // Create sale with items
      // The API expects items array with { productId, name, quantity, price }
      const saleId = await createSale({
        customerId: selectedCustomer ? Number.parseInt(selectedCustomer) : undefined,
        userId: session.user.id,
        subtotal: calculateSubtotal(),
        discountAmount: calculateDiscount(),
        // discountType: discountType,
        taxAmount: calculateTax(),
        // taxRate: settings?.taxRate || 0,
        total: total,
        paymentMethod: paymentMethod,
        paymentReceived: paymentMethod === "cash" ? received : total,
        changeGiven: paymentMethod === "cash" ? calculateChange() : 0,
        status: "completed",
        createdAt: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.sellingPrice
        }))
      })

      // The sales API handles creating sale items and updating product inventory
      // so we don't need to do it manually here.

      toast({
        title: "Sale Completed",
        description: `Sale completed successfully`,
      })

      // We don't get the saleId back easily because we aren't awaiting res.json() properly in the simplified call above? 
      // check operations.ts: createSale returns res.id.
      // So let's capture it.


      // Print receipt
      await printReceiptFromSale(saleId)

      // Clear cart and reload products
      clearCart()
      const updatedProducts = await getAllProducts()
      setProducts(updatedProducts)
    } catch (error) {
      console.error("[v0] Error completing sale:", error)
      toast({
        title: "Error",
        description: "Failed to complete sale",
        variant: "destructive",
      })
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9') {
        event.preventDefault()
        handleCompleteSale()
      }
      else if (event.key === 'F8') {
        event.preventDefault()
        clearCart()
      }
      else if (event.key === 'Escape') {
        event.preventDefault()
        setSearchQuery("")
        if (isScanningMode) {
          stopScanning()
          setIsScanningMode(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isScanningMode, handleCompleteSale, clearCart, stopScanning])

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is out of stock`,
        variant: "destructive",
      })
      return
    }

    const existingItem = cart.find((item) => item.product.id === product.id)
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.quantity} units available`,
          variant: "destructive",
        })
        return
      }
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }])
    }
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    const item = cart.find((i) => i.product.id === productId)
    if (!item) return

    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    if (newQuantity > item.product.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${item.product.quantity} units available`,
        variant: "destructive",
      })
      return
    }

    setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)))
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const printReceiptFromSale = async (saleId: number) => {
    try {
      const { getSaleById, getSaleItems, getAllProducts, getCustomerById } = await import("@/lib/db/operations")

      const [sale, saleItems, products] = await Promise.all([
        getSaleById(saleId),
        getSaleItems(saleId),
        getAllProducts(),
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
        cashierName: getSession()?.user.fullName || "System Administrator"
      }

      console.log("Printing receipt with settings:", settings)
      console.log("Logo URL:", settings?.logoUrl)

      printReceiptUtil(printData)
    } catch (error) {
      console.error("Error printing receipt:", error)
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
    <div className="flex flex-col h-screen bg-background">
      <Header title="Point of Sale" description="Create and process sales transactions" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Products */}
        <div className="flex-1 flex flex-col border-r border-border bg-muted/10">
          {/* Top Bar: Search & Filters */}
          <div className="p-4 space-y-4 bg-background border-b border-border">
            <div className="flex gap-3">
              <div className="relative flex-1">
                {isScanning ? (
                  <Scan className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-pulse" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder={isScanning ? "Scan barcode..." : "Search products..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className={`pl-9 h-10 ${isScanning ? 'ring-2 ring-primary' : ''}`}
                  autoFocus={isScanning}
                />
              </div>
              <Button
                variant={isScanning ? "default" : "outline"}
                size="icon"
                onClick={toggleScanningMode}
                className="h-10 w-10"
                title="Toggle Barcode Scanner"
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>

            {/* Category Pills */}
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className="capitalize rounded-full"
                  >
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id.toString())}
                      className="capitalize rounded-full"
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayedProducts.map((product) => {
                const categoryName = categories.find(c => c.id === product.categoryId)?.name || "Uncategorized"
                const categoryColor = getCategoryColor(categoryName)
                const stockColor = getStockColor(product.quantity, product.lowStockThreshold)

                return (
                  <Card
                    key={product.id}
                    className={`group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 ${categoryColor.border}`}
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`${categoryColor.bg} ${categoryColor.text} border-0 text-[10px] px-1 h-5`}>
                          {categoryName}
                        </Badge>
                        <Badge className={`${stockColor.bg} ${stockColor.text} text-[10px] px-1.5 h-5`}>
                          {product.quantity}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-xs line-clamp-2 min-h-[2rem] mb-1 leading-tight" title={product.name}>
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mb-2 truncate">{product.sku}</p>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-sm text-primary">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        <Button
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground shadow-sm"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {displayedProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <p>No products found</p>
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border bg-background flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
          <p className="text-sm mt-1 p-4 pt-0 text-muted-foreground text-center">Select products from the left to start a sale</p>
        </div>
        {/* Right Panel: Cart & Checkout */}
        {cart.length > 0 && (
          <div className="w-[400px] flex flex-col h-full bg-background border-l border-border shadow-xl z-10 transition-all duration-300">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Current Sale
                </h2>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* Customer Select */}
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Customer (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in Customer</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 min-h-0 bg-muted/10">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                  <div className="bg-muted rounded-full p-4 mb-4">
                    <ShoppingCart className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="font-medium">Cart is empty</p>
                  <p className="text-sm mt-1">Select products from the left to start a sale</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cart.map((item) => (
                    <div key={item.product.id} className="p-2 bg-background hover:bg-muted/20 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className="font-medium text-xs truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(item.product.sellingPrice)} x {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold text-xs">
                          {formatCurrency(item.product.sellingPrice * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border rounded-md bg-background scale-90 origin-left">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-none"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-none"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Checkout Section */}
            <div className="border-t border-border bg-background p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {/* Discount & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount</Label>
                  <div className="flex rounded-md shadow-sm">
                    <Select value={discountType} onValueChange={(v: "percentage" | "fixed") => setDiscountType(v)}>
                      <SelectTrigger className="w-[60px] rounded-r-none border-r-0 h-8 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">₵</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="rounded-l-none h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v: "cash" | "card" | "other") => setPaymentMethod(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settings?.enabledPaymentMethods?.includes("cash") && (
                        <SelectItem value="cash">Cash</SelectItem>
                      )}
                      {settings?.enabledPaymentMethods?.includes("card") && (
                        <SelectItem value="card">Card</SelectItem>
                      )}
                      {settings?.enabledPaymentMethods?.includes("mobile_money") && (
                        <SelectItem value="other">Mobile Money</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Received */}
              {paymentMethod === "cash" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Cash Received</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.value)}
                    className="h-9"
                  />
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                {calculateDiscount() > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(calculateDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({settings?.taxRate || 0}%)</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>

                <div className="flex justify-between items-end pt-2">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(calculateTotal())}</span>
                </div>

                {paymentMethod === "cash" && paymentReceived && (
                  <div className="flex justify-between text-amber-600 font-medium pt-1">
                    <span>Change</span>
                    <span>{formatCurrency(calculateChange())}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-12 text-lg font-semibold shadow-md"
                size="lg"
                onClick={handleCompleteSale}
                disabled={cart.length === 0}
              >
                <Printer className="mr-2 h-5 w-5" />
                Pay {formatCurrency(calculateTotal())}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>

  )
}
