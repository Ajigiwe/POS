// Database initialization and table creation
import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import bcrypt from "bcryptjs"

interface POSDB extends DBSchema {
  users: {
    key: number
    value: any
    indexes: { "by-username": string }
  }
  products: {
    key: number
    value: any
    indexes: { "by-sku": string; "by-barcode": string; "by-category": string }
  }
  customers: {
    key: number
    value: any
    indexes: { "by-phone": string; "by-email": string }
  }
  sales: {
    key: number
    value: any
    indexes: { "by-date": string; "by-status": string }
  }
  sale_items: {
    key: number
    value: any
    indexes: { "by-sale": number }
  }
  settings: {
    key: number
    value: any
  }
  auto_backups: {
    key: number
    value: any
  }
  backup_settings: {
    key: number
    value: any
  }
  categories: {
    key: number
    value: any
    indexes: { "by-name": string }
  }
  activity_logs: {
    key: number
    value: any
    indexes: { "by-user": number; "by-date": string }
  }
  user_roles: {
    key: number
    value: any
    indexes: { "by-name": string }
  }
}

let dbInstance: IDBPDatabase<POSDB> | null = null

export async function initDatabase() {
  if (dbInstance) return dbInstance

  const db = await openDB<POSDB>("pos-database", 4, {
    upgrade(db) {
      // Users table
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", {
          keyPath: "id",
          autoIncrement: true,
        })
        userStore.createIndex("by-username", "username", { unique: true })
      }

      // Products table
      if (!db.objectStoreNames.contains("products")) {
        const productStore = db.createObjectStore("products", {
          keyPath: "id",
          autoIncrement: true,
        })
        productStore.createIndex("by-sku", "sku", { unique: true })
        productStore.createIndex("by-barcode", "barcode", { unique: true })
        productStore.createIndex("by-category", "category")
      }

      // Customers table
      if (!db.objectStoreNames.contains("customers")) {
        const customerStore = db.createObjectStore("customers", {
          keyPath: "id",
          autoIncrement: true,
        })
        customerStore.createIndex("by-phone", "phone")
        customerStore.createIndex("by-email", "email")
      }

      // Sales table
      if (!db.objectStoreNames.contains("sales")) {
        const salesStore = db.createObjectStore("sales", {
          keyPath: "id",
          autoIncrement: true,
        })
        salesStore.createIndex("by-date", "created_at")
        salesStore.createIndex("by-status", "status")
      }

      // Sale items table
      if (!db.objectStoreNames.contains("sale_items")) {
        const saleItemsStore = db.createObjectStore("sale_items", {
          keyPath: "id",
          autoIncrement: true,
        })
        saleItemsStore.createIndex("by-sale", "sale_id")
      }

      // Settings table
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", {
          keyPath: "id",
          autoIncrement: true,
        })
      }

      // Auto-backups table
      if (!db.objectStoreNames.contains("auto_backups")) {
        db.createObjectStore("auto_backups", {
          keyPath: "id",
          autoIncrement: true,
        })
      }

      // Backup settings table
      if (!db.objectStoreNames.contains("backup_settings")) {
        db.createObjectStore("backup_settings", {
          keyPath: "id",
          autoIncrement: true,
        })
      }

      // Categories table
      if (!db.objectStoreNames.contains("categories")) {
        const categoryStore = db.createObjectStore("categories", {
          keyPath: "id",
          autoIncrement: true,
        })
        categoryStore.createIndex("by-name", "name", { unique: true })
      }

      // Activity logs table
      if (!db.objectStoreNames.contains("activity_logs")) {
        const activityStore = db.createObjectStore("activity_logs", {
          keyPath: "id",
          autoIncrement: true,
        })
        activityStore.createIndex("by-user", "user_id")
        activityStore.createIndex("by-date", "created_at")
      }

      // User roles table
      if (!db.objectStoreNames.contains("user_roles")) {
        const roleStore = db.createObjectStore("user_roles", {
          keyPath: "id",
          autoIncrement: true,
        })
        roleStore.createIndex("by-name", "name", { unique: true })
      }
    },
  })

  dbInstance = db
  await seedInitialData(db)
  return db
}

export async function seedInitialData(db: IDBPDatabase<POSDB>, force: boolean = false) {
  // Check if data already exists (skip check if forcing)
  if (!force) {
    const userCount = await db.count("users")
    if (userCount > 0) return
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10)
  await db.add("users", {
    username: "admin",
    password: hashedPassword,
    role: "admin",
    full_name: "System Administrator",
    email: "admin@pos.local",
    created_at: new Date().toISOString(),
  })

  // Create default settings with all new fields
  await db.add("settings", {
    // Basic settings
    store_name: "My Store",
    currency: "GHS",
    tax_rate: 10,
    low_stock_alert: 10,
    theme: "dark",
    receipt_footer: "Thank you for your business!",
    updated_at: new Date().toISOString(),

    // Receipt Customization
    receipt_template: "standard",
    enable_qr_code: false,
    print_paper_size: "thermal-80mm",
    print_font_size: "medium",

    // Payment & Financial
    enabled_payment_methods: ["cash", "card", "mobile_money"],
    rounding_rule: "none",

    // User Management
    session_timeout_minutes: 60,
    password_min_length: 8,
    require_special_char: false,
    require_uppercase: false,
    require_number: true,
    enable_activity_log: true,

    // Inventory Management
    enable_reorder_alerts: true,
    default_reorder_point: 10,
    barcode_format: "ean13",
    enable_batch_tracking: false,

    // Advanced Customization
    language: "en",
    date_format: "MM/DD/YYYY",
    time_format: "12h",

    // Security & Privacy
    enable_2fa: false,
    encrypt_sensitive_data: false,
    audit_trail_retention_days: 90,
    auto_backup_frequency: "daily",
    data_retention_days: 365,

    // Performance & Limits
    enable_cache: true,
    max_records_display: 50,
    search_min_chars: 2,
    auto_save_interval_seconds: 30,
  })

  // Create default categories
  const defaultCategories = [
    {
      name: "Electronics",
      description: "Electronic devices and accessories",
      color: "#3B82F6",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Clothing",
      description: "Apparel and fashion items",
      color: "#8B5CF6",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Food",
      description: "Food and beverage items",
      color: "#10B981",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Home Goods",
      description: "Home and household items",
      color: "#06B6D4",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Books",
      description: "Books and educational materials",
      color: "#F59E0B",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  for (const category of defaultCategories) {
    await db.add("categories", category)
  }

  // Add sample products - 50 diverse items
  const sampleProducts = [
    // Electronics (10 items)
    {
      name: "Wireless Mouse",
      sku: "ELEC-001",
      barcode: "1234567890001",
      category: "Electronics",
      cost_price: 15.0,
      selling_price: 29.99,
      quantity: 50,
      low_stock_threshold: 10,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "USB-C Cable",
      sku: "ELEC-002",
      barcode: "1234567890002",
      category: "Electronics",
      cost_price: 5.0,
      selling_price: 12.99,
      quantity: 100,
      low_stock_threshold: 20,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Bluetooth Headphones",
      sku: "ELEC-003",
      barcode: "1234567890003",
      category: "Electronics",
      cost_price: 35.0,
      selling_price: 69.99,
      quantity: 30,
      low_stock_threshold: 8,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Phone Charger",
      sku: "ELEC-004",
      barcode: "1234567890004",
      category: "Electronics",
      cost_price: 8.0,
      selling_price: 19.99,
      quantity: 75,
      low_stock_threshold: 15,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Laptop Stand",
      sku: "ELEC-005",
      barcode: "1234567890005",
      category: "Electronics",
      cost_price: 20.0,
      selling_price: 45.99,
      quantity: 25,
      low_stock_threshold: 5,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Webcam HD",
      sku: "ELEC-006",
      barcode: "1234567890006",
      category: "Electronics",
      cost_price: 40.0,
      selling_price: 89.99,
      quantity: 20,
      low_stock_threshold: 5,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Keyboard Mechanical",
      sku: "ELEC-007",
      barcode: "1234567890007",
      category: "Electronics",
      cost_price: 50.0,
      selling_price: 99.99,
      quantity: 15,
      low_stock_threshold: 5,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Power Bank 10000mAh",
      sku: "ELEC-008",
      barcode: "1234567890008",
      category: "Electronics",
      cost_price: 18.0,
      selling_price: 39.99,
      quantity: 40,
      low_stock_threshold: 10,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "HDMI Cable 2m",
      sku: "ELEC-009",
      barcode: "1234567890009",
      category: "Electronics",
      cost_price: 6.0,
      selling_price: 14.99,
      quantity: 60,
      low_stock_threshold: 12,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Screen Protector",
      sku: "ELEC-010",
      barcode: "1234567890010",
      category: "Electronics",
      cost_price: 3.0,
      selling_price: 9.99,
      quantity: 80,
      low_stock_threshold: 15,
      supplier: "Tech Supplies Inc",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Clothing (10 items)
    {
      name: "Cotton T-Shirt",
      sku: "CLTH-001",
      barcode: "1234567890011",
      category: "Clothing",
      cost_price: 8.0,
      selling_price: 19.99,
      quantity: 45,
      low_stock_threshold: 10,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Denim Jeans",
      sku: "CLTH-002",
      barcode: "1234567890012",
      category: "Clothing",
      cost_price: 25.0,
      selling_price: 59.99,
      quantity: 30,
      low_stock_threshold: 8,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Hoodie",
      sku: "CLTH-003",
      barcode: "1234567890013",
      category: "Clothing",
      cost_price: 20.0,
      selling_price: 49.99,
      quantity: 35,
      low_stock_threshold: 8,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Baseball Cap",
      sku: "CLTH-004",
      barcode: "1234567890014",
      category: "Clothing",
      cost_price: 7.0,
      selling_price: 16.99,
      quantity: 50,
      low_stock_threshold: 10,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Sneakers",
      sku: "CLTH-005",
      barcode: "1234567890015",
      category: "Clothing",
      cost_price: 35.0,
      selling_price: 79.99,
      quantity: 25,
      low_stock_threshold: 6,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Socks (3-Pack)",
      sku: "CLTH-006",
      barcode: "1234567890016",
      category: "Clothing",
      cost_price: 5.0,
      selling_price: 12.99,
      quantity: 60,
      low_stock_threshold: 12,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Leather Belt",
      sku: "CLTH-007",
      barcode: "1234567890017",
      category: "Clothing",
      cost_price: 12.0,
      selling_price: 29.99,
      quantity: 40,
      low_stock_threshold: 8,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Sunglasses",
      sku: "CLTH-008",
      barcode: "1234567890018",
      category: "Clothing",
      cost_price: 10.0,
      selling_price: 24.99,
      quantity: 35,
      low_stock_threshold: 8,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Backpack",
      sku: "CLTH-009",
      barcode: "1234567890019",
      category: "Clothing",
      cost_price: 22.0,
      selling_price: 49.99,
      quantity: 28,
      low_stock_threshold: 6,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Winter Scarf",
      sku: "CLTH-010",
      barcode: "1234567890020",
      category: "Clothing",
      cost_price: 8.0,
      selling_price: 19.99,
      quantity: 42,
      low_stock_threshold: 10,
      supplier: "Fashion Wholesale",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Food (10 items)
    {
      name: "Organic Coffee Beans 500g",
      sku: "FOOD-001",
      barcode: "1234567890021",
      category: "Food",
      cost_price: 8.0,
      selling_price: 18.99,
      quantity: 55,
      low_stock_threshold: 12,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Green Tea (20 bags)",
      sku: "FOOD-002",
      barcode: "1234567890022",
      category: "Food",
      cost_price: 3.0,
      selling_price: 7.99,
      quantity: 70,
      low_stock_threshold: 15,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Dark Chocolate Bar",
      sku: "FOOD-003",
      barcode: "1234567890023",
      category: "Food",
      cost_price: 2.5,
      selling_price: 5.99,
      quantity: 90,
      low_stock_threshold: 20,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Honey Jar 500ml",
      sku: "FOOD-004",
      barcode: "1234567890024",
      category: "Food",
      cost_price: 6.0,
      selling_price: 14.99,
      quantity: 40,
      low_stock_threshold: 10,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Pasta 500g",
      sku: "FOOD-005",
      barcode: "1234567890025",
      category: "Food",
      cost_price: 1.5,
      selling_price: 3.99,
      quantity: 100,
      low_stock_threshold: 20,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Olive Oil 750ml",
      sku: "FOOD-006",
      barcode: "1234567890026",
      category: "Food",
      cost_price: 9.0,
      selling_price: 21.99,
      quantity: 35,
      low_stock_threshold: 8,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Granola Bar (6-Pack)",
      sku: "FOOD-007",
      barcode: "1234567890027",
      category: "Food",
      cost_price: 4.0,
      selling_price: 9.99,
      quantity: 65,
      low_stock_threshold: 15,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Peanut Butter 400g",
      sku: "FOOD-008",
      barcode: "1234567890028",
      category: "Food",
      cost_price: 4.5,
      selling_price: 10.99,
      quantity: 50,
      low_stock_threshold: 12,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Potato Chips",
      sku: "FOOD-009",
      barcode: "1234567890029",
      category: "Food",
      cost_price: 1.8,
      selling_price: 4.49,
      quantity: 85,
      low_stock_threshold: 18,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Sparkling Water (6-Pack)",
      sku: "FOOD-010",
      barcode: "1234567890030",
      category: "Food",
      cost_price: 3.5,
      selling_price: 8.99,
      quantity: 60,
      low_stock_threshold: 12,
      supplier: "Fresh Foods Ltd",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Home Goods (10 items)
    {
      name: "Coffee Mug",
      sku: "HOME-001",
      barcode: "1234567890031",
      category: "Home Goods",
      cost_price: 4.0,
      selling_price: 9.99,
      quantity: 40,
      low_stock_threshold: 8,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Dinner Plate Set (4pc)",
      sku: "HOME-002",
      barcode: "1234567890032",
      category: "Home Goods",
      cost_price: 18.0,
      selling_price: 39.99,
      quantity: 25,
      low_stock_threshold: 6,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Throw Pillow",
      sku: "HOME-003",
      barcode: "1234567890033",
      category: "Home Goods",
      cost_price: 10.0,
      selling_price: 24.99,
      quantity: 35,
      low_stock_threshold: 8,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Scented Candle",
      sku: "HOME-004",
      barcode: "1234567890034",
      category: "Home Goods",
      cost_price: 6.0,
      selling_price: 14.99,
      quantity: 50,
      low_stock_threshold: 10,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Bath Towel",
      sku: "HOME-005",
      barcode: "1234567890035",
      category: "Home Goods",
      cost_price: 8.0,
      selling_price: 19.99,
      quantity: 45,
      low_stock_threshold: 10,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Picture Frame 8x10",
      sku: "HOME-006",
      barcode: "1234567890036",
      category: "Home Goods",
      cost_price: 5.0,
      selling_price: 12.99,
      quantity: 38,
      low_stock_threshold: 8,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Storage Basket",
      sku: "HOME-007",
      barcode: "1234567890037",
      category: "Home Goods",
      cost_price: 12.0,
      selling_price: 27.99,
      quantity: 30,
      low_stock_threshold: 6,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Wall Clock",
      sku: "HOME-008",
      barcode: "1234567890038",
      category: "Home Goods",
      cost_price: 15.0,
      selling_price: 34.99,
      quantity: 22,
      low_stock_threshold: 5,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Desk Lamp",
      sku: "HOME-009",
      barcode: "1234567890039",
      category: "Home Goods",
      cost_price: 20.0,
      selling_price: 44.99,
      quantity: 28,
      low_stock_threshold: 6,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Doormat",
      sku: "HOME-010",
      barcode: "1234567890040",
      category: "Home Goods",
      cost_price: 9.0,
      selling_price: 21.99,
      quantity: 32,
      low_stock_threshold: 8,
      supplier: "Home Goods Co",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Books (10 items)
    {
      name: "The Great Novel",
      sku: "BOOK-001",
      barcode: "1234567890041",
      category: "Books",
      cost_price: 10.0,
      selling_price: 24.99,
      quantity: 30,
      low_stock_threshold: 6,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Cookbook: Easy Meals",
      sku: "BOOK-002",
      barcode: "1234567890042",
      category: "Books",
      cost_price: 12.0,
      selling_price: 29.99,
      quantity: 25,
      low_stock_threshold: 5,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Self-Help Guide",
      sku: "BOOK-003",
      barcode: "1234567890043",
      category: "Books",
      cost_price: 8.0,
      selling_price: 19.99,
      quantity: 35,
      low_stock_threshold: 8,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Mystery Thriller",
      sku: "BOOK-004",
      barcode: "1234567890044",
      category: "Books",
      cost_price: 9.0,
      selling_price: 22.99,
      quantity: 28,
      low_stock_threshold: 6,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Children's Picture Book",
      sku: "BOOK-005",
      barcode: "1234567890045",
      category: "Books",
      cost_price: 6.0,
      selling_price: 14.99,
      quantity: 40,
      low_stock_threshold: 10,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Science Fiction Epic",
      sku: "BOOK-006",
      barcode: "1234567890046",
      category: "Books",
      cost_price: 11.0,
      selling_price: 27.99,
      quantity: 22,
      low_stock_threshold: 5,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Biography: Legends",
      sku: "BOOK-007",
      barcode: "1234567890047",
      category: "Books",
      cost_price: 13.0,
      selling_price: 32.99,
      quantity: 20,
      low_stock_threshold: 5,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Travel Guide: Europe",
      sku: "BOOK-008",
      barcode: "1234567890048",
      category: "Books",
      cost_price: 14.0,
      selling_price: 34.99,
      quantity: 18,
      low_stock_threshold: 4,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Poetry Collection",
      sku: "BOOK-009",
      barcode: "1234567890049",
      category: "Books",
      cost_price: 7.0,
      selling_price: 16.99,
      quantity: 32,
      low_stock_threshold: 8,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      name: "Graphic Novel",
      sku: "BOOK-010",
      barcode: "1234567890050",
      category: "Books",
      cost_price: 15.0,
      selling_price: 36.99,
      quantity: 24,
      low_stock_threshold: 5,
      supplier: "Book Distributors",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  for (const product of sampleProducts) {
    await db.add("products", product)
  }

  // Add sample customers
  const sampleCustomers = [
    {
      name: "John Smith",
      phone: "+1234567890",
      email: "john.smith@email.com",
      loyalty_points: 150,
      total_purchases: 450.0,
      last_purchase_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      name: "Sarah Johnson",
      phone: "+1234567891",
      email: "sarah.j@email.com",
      loyalty_points: 200,
      total_purchases: 680.0,
      last_purchase_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      name: "Mike Davis",
      phone: "+1234567892",
      loyalty_points: 50,
      total_purchases: 120.0,
      created_at: new Date().toISOString(),
    },
  ]

  for (const customer of sampleCustomers) {
    await db.add("customers", customer)
  }

  // Add sample sales with sale items - Generate diverse sales across all products
  const now = new Date()

  // Helper function to generate random sales
  const generateSales = () => {
    const sales = []
    const paymentMethods = ["cash", "card", "mobile_money"]
    const customerIds = [1, 2, 3, null] // null for walk-in customers

    // Generate 30 sales over the past 30 days
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      // 1-3 sales per day
      const salesPerDay = Math.floor(Math.random() * 3) + 1

      for (let saleNum = 0; saleNum < salesPerDay; saleNum++) {
        // Random number of items (1-5) per sale
        const itemCount = Math.floor(Math.random() * 5) + 1
        const items = []
        let subtotal = 0

        // Select random products for this sale
        const usedProductIds = new Set()
        for (let i = 0; i < itemCount; i++) {
          let productId
          do {
            productId = Math.floor(Math.random() * 50) + 1 // Random product from 1-50
          } while (usedProductIds.has(productId))
          usedProductIds.add(productId)

          const quantity = Math.floor(Math.random() * 3) + 1 // 1-3 items
          const product = sampleProducts[productId - 1]
          const itemSubtotal = product.selling_price * quantity
          subtotal += itemSubtotal

          items.push({
            product_id: productId,
            product_name: product.name,
            quantity,
            unit_price: product.selling_price,
            subtotal: itemSubtotal,
          })
        }

        // Calculate totals
        const discountAmount = Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 2 : 0
        const taxAmount = parseFloat(((subtotal - discountAmount) * 0.1).toFixed(2))
        const total = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2))

        // Create sale
        const hoursOffset = dayOffset * 24 + Math.floor(Math.random() * 24)
        sales.push({
          customer_id: customerIds[Math.floor(Math.random() * customerIds.length)],
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total,
          payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          status: "completed",
          created_at: new Date(now.getTime() - 1000 * 60 * 60 * hoursOffset).toISOString(),
          items,
        })
      }
    }

    return sales
  }

  const generatedSales = generateSales()

  // Add sales and their items to database
  for (const sale of generatedSales) {
    const { items, ...saleData } = sale
    const saleId = await db.add("sales", saleData)

    // Add all sale items for this sale
    for (const item of items) {
      await db.add("sale_items", {
        sale_id: saleId,
        ...item,
      })
    }
  }
}

export async function getDatabase() {
  if (!dbInstance) {
    return await initDatabase()
  }
  return dbInstance
}

export async function closeDatabase() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
