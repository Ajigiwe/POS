import { getSession } from "@/lib/auth/session"
import { getDatabase } from "./init"
import { verifyPassword } from "./operations"
import { seedInitialData } from "./init"

// Clear specific tables
export async function clearSelectedTables(tableNames: string[]): Promise<void> {
  const session = getSession()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const db = await getDatabase()
  const tx = db.transaction(tableNames as any, "readwrite")

  for (const tableName of tableNames) {
    try {
      const store = tx.objectStore(tableName as any)
      await store.clear()
    } catch (err) {
      console.warn(`Could not clear table ${tableName}:`, err)
    }
  }

  await tx.done
}

// Clear all data except users
export async function clearAllDataExceptUsers(): Promise<void> {
  const allClearableTables = [
    'products',
    'customers',
    'sales',
    'sale_items',
    'categories',
    'activity_logs',
    'auto_backups',
    'backup_settings'
  ]
  await clearSelectedTables(allClearableTables)
}

// Clear individual table
export async function clearTable(tableName: string): Promise<void> {
  await clearSelectedTables([tableName])
}

// Get record counts for all tables
export async function getTableRecordCounts(): Promise<{ [tableName: string]: number }> {
  try {
    const db = await getDatabase()
    const storeNames = ['products', 'customers', 'sales', 'sale_items', 'users', 'categories', 'activity_logs', 'settings', 'auto_backups', 'backup_settings'] as const

    const counts: Record<string, number> = {}
    for (const name of storeNames) {
      try {
        counts[name] = await db.count(name as any)
      } catch {
        counts[name] = 0
      }
    }
    return counts
  } catch (error) {
    console.error('Error fetching table stats:', error)
    return {}
  }
}

// Validate admin password
export async function validateAdminPassword(password: string): Promise<boolean> {
  try {
    const session = getSession()
    if (!session || !session.user || !session.user.id) {
      return false
    }
    return await verifyPassword(session.user.id, password)
  } catch (error) {
    console.error('Error validating admin password:', error)
    return false
  }
}

// Get table information for display
export async function getTableInfo(): Promise<Array<{
  name: string
  label: string
  description: string
  recordCount: number
  canClear: boolean
}>> {
  const counts = await getTableRecordCounts()

  const tableInfo = [
    {
      name: 'products',
      label: 'Products',
      description: 'Product catalog and inventory',
      recordCount: counts.products || 0,
      canClear: true
    },
    {
      name: 'customers',
      label: 'Customers',
      description: 'Customer information and profiles',
      recordCount: counts.customers || 0,
      canClear: true
    },
    {
      name: 'sales',
      label: 'Sales',
      description: 'Sales transactions and history',
      recordCount: counts.sales || 0,
      canClear: true
    },
    {
      name: 'sale_items',
      label: 'Sale Items',
      description: 'Individual items in sales transactions',
      recordCount: counts.sale_items || 0,
      canClear: true
    },
    {
      name: 'users',
      label: 'Users',
      description: 'User accounts and authentication',
      recordCount: counts.users || 0,
      canClear: false // Never allow clearing users
    },
    {
      name: 'settings',
      label: 'Settings',
      description: 'System configuration and preferences',
      recordCount: counts.settings || 0,
      canClear: false // Keep settings by default
    },
    {
      name: 'categories',
      label: 'Categories',
      description: 'Product categories',
      recordCount: counts.categories || 0,
      canClear: true
    },
    {
      name: 'activity_logs',
      label: 'Activity Logs',
      description: 'User activity history',
      recordCount: counts.activity_logs || 0,
      canClear: true
    },
    {
      name: 'auto_backups',
      label: 'Auto Backups',
      description: 'Automatic backup records',
      recordCount: counts.auto_backups || 0,
      canClear: true
    },
    {
      name: 'backup_settings',
      label: 'Backup Settings',
      description: 'Backup configuration',
      recordCount: counts.backup_settings || 0,
      canClear: true
    }
  ]

  return tableInfo
}

// Helper to seed data (called from UI)
export async function seedDatabase(): Promise<void> {
  const session = getSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const db = await getDatabase()
  const productCount = await db.count("products")
  if (productCount > 0) {
    throw new Error("Data already exists, skipping seed")
  }

  // Re-run the seed from init.ts
  // We need to clear the user count check by calling seedInitialData
  // But seedInitialData checks for users, so we call it with force
  await seedInitialData(db, true)
}
