// Backup and restore operations for POS system
import { getDatabase } from "./init"
import { encrypt, decrypt } from "../utils/encryption"
import type { User, Product, Customer, Sale, SaleItem, Settings } from "./schema"

export interface BackupData {
  version: string
  timestamp: string
  tables: {
    users?: User[]
    products?: Product[]
    customers?: Customer[]
    sales?: Sale[]
    sale_items?: SaleItem[]
    settings?: Settings[]
  }
  metadata: {
    recordCounts: Record<string, number>
    schemaVersion: string
  }
}

export interface BackupMetadata {
  version: string
  timestamp: string
  recordCounts: Record<string, number>
  schemaVersion: string
}

// Export selected data as JSON
export async function exportToJSON(selectedTables: string[]): Promise<string> {
  const db = await getDatabase()
  const backupData: BackupData = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    tables: {},
    metadata: {
      recordCounts: {},
      schemaVersion: "1.0.0"
    }
  }

  // Export selected tables
  for (const tableName of selectedTables) {
    try {
      const data = await db.getAll(tableName)
      backupData.tables[tableName as keyof typeof backupData.tables] = data
      backupData.metadata.recordCounts[tableName] = data.length
    } catch (error) {
      console.error(`[v0] Error exporting table ${tableName}:`, error)
      throw new Error(`Failed to export table: ${tableName}`)
    }
  }

  return JSON.stringify(backupData, null, 2)
}

// Export selected data as encrypted backup
export async function exportToEncrypted(selectedTables: string[], password: string): Promise<string> {
  const jsonData = await exportToJSON(selectedTables)
  return await encrypt(jsonData, password)
}

// Import from JSON backup
export async function importFromJSON(jsonData: string): Promise<void> {
  const backupData: BackupData = JSON.parse(jsonData)
  
  // Validate backup data
  validateBackupData(backupData)
  
  const db = await getDatabase()
  
  // Clear existing data in selected tables
  const tableNames = Object.keys(backupData.tables)
  for (const tableName of tableNames) {
    const store = db.transaction(tableName, 'readwrite').objectStore(tableName)
    await store.clear()
  }
  
  // Import data
  for (const [tableName, data] of Object.entries(backupData.tables)) {
    if (data && data.length > 0) {
      const store = db.transaction(tableName, 'readwrite').objectStore(tableName)
      for (const record of data) {
        await store.add(record)
      }
    }
  }
}

// Import from encrypted backup
export async function importFromEncrypted(encryptedData: string, password: string): Promise<void> {
  const jsonData = await decrypt(encryptedData, password)
  return await importFromJSON(jsonData)
}

// Validate backup data structure
export function validateBackupData(data: any): data is BackupData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup data: not an object')
  }
  
  if (!data.version || !data.timestamp) {
    throw new Error('Invalid backup data: missing version or timestamp')
  }
  
  if (!data.tables || typeof data.tables !== 'object') {
    throw new Error('Invalid backup data: missing tables')
  }
  
  if (!data.metadata || !data.metadata.recordCounts) {
    throw new Error('Invalid backup data: missing metadata')
  }
  
  return true
}

// Get backup metadata
export function getBackupMetadata(backupData: BackupData): BackupMetadata {
  return {
    version: backupData.version,
    timestamp: backupData.timestamp,
    recordCounts: backupData.metadata.recordCounts,
    schemaVersion: backupData.metadata.schemaVersion
  }
}

// Download backup file
export function downloadBackup(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Generate backup filename with timestamp
export function generateBackupFilename(format: 'json' | 'encrypted'): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const extension = format === 'json' ? 'json' : 'bak'
  return `pos-backup-${timestamp}.${extension}`
}
