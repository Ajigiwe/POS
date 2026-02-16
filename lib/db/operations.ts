// Database CRUD operations — Direct IndexedDB access via idb
import type { Product, Customer, Sale, SaleItem, Settings, Category, User } from "./schema"
import { getDatabase } from "./init"
import bcrypt from "bcryptjs"

// ─── User operations ─────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const db = await getDatabase()
  const users = await db.getAll("users")
  return users.map((u: any) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    fullName: u.fullName || u.full_name || "",
    email: u.email || "",
    role: u.role,
    isActive: u.isActive ?? u.is_active ?? true,
    createdAt: u.createdAt || u.created_at,
    lastLogin: u.lastLogin || u.last_login,
  })) as User[]
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDatabase()
  return db.getFromIndex("users", "by-username", username)
}

export async function createUser(user: Omit<User, "id" | "createdAt" | "lastLogin">): Promise<User> {
  const db = await getDatabase()
  const hashedPassword = await bcrypt.hash(user.password, 10)
  const newUser = {
    ...user,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    lastLogin: undefined,
  }
  const id = await db.add("users", newUser as any)
  return { ...newUser, id } as unknown as User
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const db = await getDatabase()
  const existing = await db.get("users", id)
  if (!existing) throw new Error("User not found")

  // If password is being updated, hash it
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10)
  }

  const updated = { ...existing, ...data, id }
  await db.put("users", updated)
  return updated as User
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDatabase()
  await db.delete("users", id)
}

// ─── Auth operations ─────────────────────────────────────────────

export async function loginUser(username: string, password: string): Promise<Omit<User, "password"> | null> {
  const db = await getDatabase()
  const user = await db.getFromIndex("users", "by-username", username)

  if (!user) return null

  // Check active status (handle both camelCase and snake_case)
  const isActive = user.isActive ?? (user as any).is_active
  if (isActive === false) return null

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  // Update last login
  user.lastLogin = new Date().toISOString()
    ; (user as any).last_login = new Date().toISOString()
  await db.put("users", user)

  // Normalize field names to camelCase for the session
  const { password: _, ...rest } = user as any
  return {
    id: rest.id,
    username: rest.username,
    fullName: rest.fullName || rest.full_name || "",
    email: rest.email || "",
    role: rest.role,
    isActive: rest.isActive ?? rest.is_active ?? true,
    createdAt: rest.createdAt || rest.created_at,
    lastLogin: rest.lastLogin || rest.last_login,
  } as Omit<User, "password">
}

export async function verifyPassword(userId: number, password: string): Promise<boolean> {
  const db = await getDatabase()
  const user = await db.get("users", userId)
  if (!user) return false
  return bcrypt.compare(password, user.password)
}

// ─── Product operations ──────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDatabase()
  const products = await db.getAll("products")
  // Attach category info if available
  const categories = await db.getAll("categories")
  const categoryMap = new Map(categories.map(c => [c.id, c]))

  return products
    .map((p: any) => {
      const catId = p.categoryId ?? p.category_id
      const cat = categoryMap.get(catId)
      return {
        id: p.id,
        name: p.name || "",
        sku: p.sku || "",
        barcode: p.barcode || "",
        categoryId: catId,
        costPrice: Number(p.costPrice || p.cost_price || 0),
        sellingPrice: Number(p.sellingPrice || p.selling_price || 0),
        quantity: Number(p.quantity ?? 0),
        lowStockThreshold: Number(p.lowStockThreshold ?? p.low_stock_threshold ?? 10),
        supplier: p.supplier || "",
        description: p.description || "",
        imageUrl: p.imageUrl || p.image_url || "",
        createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
        category: cat ? { id: cat.id, name: cat.name, description: cat.description, color: cat.color, createdAt: cat.createdAt || cat.created_at, updatedAt: cat.updatedAt || cat.updated_at } : undefined,
      }
    })
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")) as Product[]
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const products = await getAllProducts()
  return products.find(p => p.id === id)
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  const db = await getDatabase()
  const product = await db.getFromIndex("products", "by-barcode", barcode)
  if (!product) return undefined

  const categories = await db.getAll("categories")
  const cat = categories.find((c: any) => c.id === product.categoryId)
  return {
    ...product,
    costPrice: Number(product.costPrice || product.cost_price || 0),
    sellingPrice: Number(product.sellingPrice || product.selling_price || 0),
    category: cat ? { id: cat.id, name: cat.name, description: cat.description, color: cat.color } : undefined,
  } as Product
}

export async function createProduct(product: Omit<Product, "id">): Promise<number> {
  const db = await getDatabase()
  const newProduct = {
    ...product,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const id = await db.add("products", newProduct as any)
  return id as number
}

export async function updateProduct(id: number, product: Partial<Product>): Promise<void> {
  const db = await getDatabase()
  const existing = await db.get("products", id)
  if (!existing) throw new Error("Product not found")

  const updated = {
    ...existing,
    ...product,
    id,
    updatedAt: new Date().toISOString(),
  }
  await db.put("products", updated)
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDatabase()
  await db.delete("products", id)
}

export async function getLowStockProducts(): Promise<Product[]> {
  const products = await getAllProducts()
  return products.filter(p => p.quantity <= (p.lowStockThreshold || 10))
}

// ─── Customer operations ─────────────────────────────────────────

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDatabase()
  const customers = await db.getAll("customers")
  return customers
    .map((c: any) => ({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      loyaltyPoints: c.loyaltyPoints ?? c.loyalty_points ?? 0,
      totalPurchases: c.totalPurchases ?? c.total_purchases ?? 0,
      lastPurchaseDate: c.lastPurchaseDate || c.last_purchase_date,
      createdAt: c.createdAt || c.created_at,
      notes: c.notes || "",
    }))
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")) as Customer[]
}

export async function createCustomer(customer: Omit<Customer, "id">): Promise<number> {
  const db = await getDatabase()
  const newCustomer = {
    ...customer,
    createdAt: customer.createdAt || new Date().toISOString(),
    loyaltyPoints: customer.loyaltyPoints || 0,
    totalPurchases: customer.totalPurchases || 0,
  }
  const id = await db.add("customers", newCustomer as any)
  return id as number
}

export async function updateCustomer(id: number, data: Partial<Customer>): Promise<void> {
  const db = await getDatabase()
  const existing = await db.get("customers", id)
  if (!existing) throw new Error("Customer not found")
  await db.put("customers", { ...existing, ...data, id })
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDatabase()
  await db.delete("customers", id)
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const db = await getDatabase()
  const customer = await db.get("customers", id)
  return customer as Customer | undefined
}

// ─── Sale operations ─────────────────────────────────────────────

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDatabase()
  const sales = await db.getAll("sales")
  const saleItems = await db.getAll("sale_items")
  const users = await db.getAll("users")
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  return sales
    .map((s: any) => {
      const items = saleItems.filter((si: any) => si.saleId === s.id || si.sale_id === s.id)
      const user = userMap.get(s.userId || s.user_id)
      return {
        ...s,
        userId: s.userId || s.user_id,
        customerId: s.customerId ?? s.customer_id ?? null,
        subtotal: Number(s.subtotal || 0),
        discountAmount: Number(s.discountAmount || s.discount_amount || 0),
        taxAmount: Number(s.taxAmount || s.tax_amount || 0),
        total: Number(s.total || 0),
        paymentReceived: Number(s.paymentReceived || s.payment_received || 0),
        changeGiven: Number(s.changeGiven || s.change_given || 0),
        paymentMethod: s.paymentMethod || s.payment_method || "cash",
        status: s.status || "completed",
        notes: s.notes || null,
        createdAt: s.createdAt || s.created_at,
        items: items.map((i: any) => ({
          ...i,
          saleId: i.saleId || i.sale_id,
          productId: i.productId || i.product_id,
          productName: i.productName || i.product_name,
          unitPrice: Number(i.unitPrice || i.unit_price || 0),
          subtotal: Number(i.subtotal || 0),
        })),
        user: user ? { fullName: user.fullName || user.full_name, username: user.username } : undefined,
      }
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getAllSaleItems(): Promise<SaleItem[]> {
  const sales = await getAllSales()
  return sales.flatMap(sale => sale.items || [])
}

export async function createSaleItem(item: any): Promise<void> {
  // Consumed by createSale internally
  console.warn("createSaleItem is handled by createSale.")
}

export async function createSale(sale: any): Promise<number> {
  const db = await getDatabase()

  // Create the sale record
  const saleRecord = {
    userId: sale.userId || sale.user_id,
    customerId: sale.customerId || sale.customer_id || null,
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount || sale.discount_amount || 0,
    taxAmount: sale.taxAmount || sale.tax_amount || 0,
    total: sale.total,
    paymentReceived: sale.paymentReceived || sale.payment_received || 0,
    changeGiven: sale.changeGiven || sale.change_given || 0,
    paymentMethod: sale.paymentMethod || sale.payment_method,
    status: sale.status || "completed",
    notes: sale.notes || null,
    createdAt: sale.createdAt || new Date().toISOString(),
  }

  const saleId = await db.add("sales", saleRecord as any) as number

  // Create sale items
  if (sale.items && Array.isArray(sale.items)) {
    for (const item of sale.items) {
      await db.add("sale_items", {
        saleId,
        productId: item.productId || item.product_id,
        productName: item.productName || item.name || item.product_name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price || item.unit_price,
        subtotal: (item.unitPrice || item.price || item.unit_price) * item.quantity,
      } as any)

      // Decrement product stock
      const productId = item.productId || item.product_id
      const product = await db.get("products", productId)
      if (product) {
        product.quantity = Math.max(0, (product.quantity || 0) - item.quantity)
        await db.put("products", product)
      }
    }
  }

  return saleId
}

export async function getSaleById(id: number): Promise<Sale | undefined> {
  const sales = await getAllSales()
  return sales.find(s => s.id === id)
}

export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  const sale = await getSaleById(saleId)
  return sale?.items || []
}

// ─── Settings operations ─────────────────────────────────────────

export async function getSettings(): Promise<Settings | undefined> {
  const db = await getDatabase()
  const allSettings = await db.getAll("settings")
  if (allSettings.length === 0) return undefined
  const settings = allSettings[0]
  return {
    ...settings,
    taxRate: Number(settings.taxRate || settings.tax_rate || 0),
    // Normalize field names
    storeName: settings.storeName || settings.store_name,
    storeAddress: settings.storeAddress || settings.store_address,
    storePhone: settings.storePhone || settings.store_phone,
    storeEmail: settings.storeEmail || settings.store_email,
    receiptFooter: settings.receiptFooter || settings.receipt_footer,
    receiptTemplate: settings.receiptTemplate || settings.receipt_template,
    enableQrCode: settings.enableQrCode ?? settings.enable_qr_code,
    printPaperSize: settings.printPaperSize || settings.print_paper_size,
    printFontSize: settings.printFontSize || settings.print_font_size,
    enabledPaymentMethods: settings.enabledPaymentMethods || settings.enabled_payment_methods || ["cash", "card", "mobile_money"],
    roundingRule: settings.roundingRule || settings.rounding_rule,
    enableReorderAlerts: settings.enableReorderAlerts ?? settings.enable_reorder_alerts,
    defaultReorderPoint: settings.defaultReorderPoint || settings.default_reorder_point || 10,
    barcodeFormat: settings.barcodeFormat || settings.barcode_format,
    enableBatchTracking: settings.enableBatchTracking ?? settings.enable_batch_tracking,
    autoBackupFrequency: settings.autoBackupFrequency || settings.auto_backup_frequency,
    enableStockAlerts: settings.enableStockAlerts ?? settings.enable_stock_alerts,
    primaryColor: settings.primaryColor || settings.primary_color,
    secondaryColor: settings.secondaryColor || settings.secondary_color,
    language: settings.language || "en",
    dateFormat: settings.dateFormat || settings.date_format || "MM/DD/YYYY",
    timeFormat: settings.timeFormat || settings.time_format || "12h",
    updatedAt: settings.updatedAt || settings.updated_at,
  } as Settings
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const db = await getDatabase()
  const allSettings = await db.getAll("settings")
  if (allSettings.length === 0) {
    // Create default settings
    await db.add("settings", {
      ...settings,
      updatedAt: new Date().toISOString(),
    } as any)
  } else {
    const existing = allSettings[0]
    await db.put("settings", {
      ...existing,
      ...settings,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    })
  }
}

// ─── Category operations ─────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase()
  const categories = await db.getAll("categories")
  return categories
    .map((c: any) => ({
      id: c.id,
      name: c.name || "",
      description: c.description || "",
      color: c.color || "",
      createdAt: c.createdAt || c.created_at || new Date().toISOString(),
      updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
    }))
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")) as Category[]
}

export async function createCategory(category: Omit<Category, "id">): Promise<number> {
  const db = await getDatabase()
  const newCategory = {
    ...category,
    createdAt: category.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const id = await db.add("categories", newCategory as any)
  return id as number
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<void> {
  const db = await getDatabase()
  const existing = await db.get("categories", id)
  if (!existing) throw new Error("Category not found")
  await db.put("categories", {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase()
  await db.delete("categories", id)
}
