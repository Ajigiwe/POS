export interface User {
  id: number
  username: string
  password: string // bcrypt hashed
  role: "admin" | "manager" | "cashier"
  fullName: string
  email?: string
  isActive?: boolean
  createdAt: string
  lastLogin?: string
}

export interface Category {
  id: number
  name: string
  description?: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  name: string
  sku: string
  barcode?: string
  categoryId: number // Updated from category string
  costPrice: number
  sellingPrice: number
  quantity: number
  lowStockThreshold: number
  supplier?: string
  description?: string
  category?: Category // Added relation for frontend convenience
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  loyaltyPoints: number
  totalPurchases: number // Derived or separate?
  lastPurchaseDate?: string
  createdAt: string
  notes?: string
}

export interface Sale {
  id: number
  customerId?: number
  userId: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  paymentMethod: string
  paymentReceived: number
  changeGiven: number
  status: "completed" | "parked" | "cancelled"
  notes?: string
  createdAt: string
  items?: SaleItem[] // Added relation
}

export interface SaleItem {
  id: number
  saleId: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface TaxRate {
  category: string
  rate: number
}

export interface Settings {
  id: number
  storeName: string
  storeAddress?: string
  storePhone?: string
  storeEmail?: string
  currency: string
  taxRate: number
  receiptFooter?: string

  // Appearance & Print
  logoUrl?: string
  receiptTemplate: string
  enableQrCode: boolean
  printPaperSize: string
  printFontSize: string

  // Payments
  enabledPaymentMethods: string[]
  roundingRule: string

  // Inventory
  enableReorderAlerts: boolean
  defaultReorderPoint: number
  barcodeFormat: string
  enableBatchTracking: boolean

  // Backup
  autoBackupFrequency: string

  // Features
  enableStockAlerts: boolean
  // Branding
  primaryColor?: string
  secondaryColor?: string

  // Localization
  language: string
  dateFormat: string
  timeFormat: string

  updatedAt: string
}

export interface ActivityLog {
  id: number
  userId: number
  action: string
  details?: string
  ipAddress?: string
  createdAt: string
}
