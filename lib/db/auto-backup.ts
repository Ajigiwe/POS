// Auto-backup system for POS application
import { getDatabase } from "./init"
import { exportToJSON } from "./backup"

export interface AutoBackup {
  id: number
  backup_data: string
  created_at: string
  metadata: {
    recordCounts: Record<string, number>
    version: string
  }
}

export interface BackupSettings {
  id: number
  enabled: boolean
  last_backup_date?: string
  frequency: 'daily' | 'weekly'
  keep_backup_count: number
  updated_at: string
}

const BACKUP_SETTINGS_KEY = 'pos_backup_settings'
const LAST_BACKUP_KEY = 'pos_last_backup'

// Get backup settings from localStorage
export function getBackupSettings(): BackupSettings {
  const defaultSettings: BackupSettings = {
    id: 1,
    enabled: true,
    frequency: 'daily',
    keep_backup_count: 7,
    updated_at: new Date().toISOString()
  }

  if (typeof window === 'undefined') return defaultSettings

  const stored = localStorage.getItem(BACKUP_SETTINGS_KEY)
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) }
    } catch {
      return defaultSettings
    }
  }

  return defaultSettings
}

// Save backup settings to localStorage
export function saveBackupSettings(settings: Partial<BackupSettings>): void {
  if (typeof window === 'undefined') return

  const currentSettings = getBackupSettings()
  const updatedSettings = { ...currentSettings, ...settings, updated_at: new Date().toISOString() }
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(updatedSettings))
}

// Get last backup date
export function getLastBackupDate(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_BACKUP_KEY)
}

// Set last backup date
export function setLastBackupDate(date: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_BACKUP_KEY, date)
}

// Check if backup is needed
export function isBackupNeeded(): boolean {
  const settings = getBackupSettings()
  if (!settings.enabled) return false

  const lastBackup = getLastBackupDate()
  if (!lastBackup) return true

  const lastBackupDate = new Date(lastBackup)
  const now = new Date()
  const hoursSinceBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60)

  return settings.frequency === 'daily' ? hoursSinceBackup >= 24 : hoursSinceBackup >= 168 // 7 days
}

// Perform automatic backup
export async function performAutoBackup(): Promise<void> {
  try {
    const settings = getBackupSettings()
    if (!settings.enabled) return

    // Export all data
    const allTables = ['users', 'products', 'customers', 'sales', 'sale_items', 'settings']
    const backupData = await exportToJSON(allTables)
    
    // Save to IndexedDB
    await saveAutoBackup(backupData)
    
    // Update last backup date
    const now = new Date().toISOString()
    setLastBackupDate(now)
    
    // Clean up old backups
    await deleteOldBackups(settings.keep_backup_count)
    
    console.log('[v0] Auto-backup completed successfully')
  } catch (error) {
    console.error('[v0] Auto-backup failed:', error)
  }
}

// Save auto-backup to IndexedDB
export async function saveAutoBackup(backupData: string): Promise<number> {
  const db = await getDatabase()
  
  // Check if auto_backups table exists
  if (!db.objectStoreNames.contains('auto_backups')) {
    throw new Error('Auto-backups table not found. Please refresh the page to update the database.')
  }
  
  // Parse backup data to get metadata
  const parsedData = JSON.parse(backupData)
  
  const autoBackup: Omit<AutoBackup, 'id'> = {
    backup_data: backupData,
    created_at: new Date().toISOString(),
    metadata: {
      recordCounts: parsedData.metadata.recordCounts,
      version: parsedData.version
    }
  }
  
  return await db.add('auto_backups', autoBackup)
}

// Get all auto-backups
export async function getAutoBackups(): Promise<AutoBackup[]> {
  const db = await getDatabase()
  
  // Check if auto_backups table exists
  if (!db.objectStoreNames.contains('auto_backups')) {
    return []
  }
  
  const backups = await db.getAll('auto_backups')
  return backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// Delete old backups
export async function deleteOldBackups(keepCount: number): Promise<void> {
  const db = await getDatabase()
  const backups = await getAutoBackups()
  
  if (backups.length > keepCount) {
    const toDelete = backups.slice(keepCount)
    for (const backup of toDelete) {
      await db.delete('auto_backups', backup.id)
    }
  }
}

// Schedule auto-backup check
export function scheduleAutoBackup(): void {
  if (typeof window === 'undefined') return

  // Check immediately
  if (isBackupNeeded()) {
    performAutoBackup()
  }

  // Check every hour
  setInterval(() => {
    if (isBackupNeeded()) {
      performAutoBackup()
    }
  }, 60 * 60 * 1000) // 1 hour
}

// Manual backup trigger
export async function triggerManualBackup(): Promise<void> {
  await performAutoBackup()
}

// Get backup statistics
export async function getBackupStats(): Promise<{
  totalBackups: number
  lastBackupDate: string | null
  totalSize: number
  oldestBackup: string | null
}> {
  try {
    const backups = await getAutoBackups()
    const lastBackup = getLastBackupDate()
    
    const totalSize = backups.reduce((sum, backup) => sum + backup.backup_data.length, 0)
    const oldestBackup = backups.length > 0 ? backups[backups.length - 1].created_at : null
    
    return {
      totalBackups: backups.length,
      lastBackupDate: lastBackup,
      totalSize,
      oldestBackup
    }
  } catch (error) {
    // Return default stats if backup system isn't ready
    return {
      totalBackups: 0,
      lastBackupDate: null,
      totalSize: 0,
      oldestBackup: null
    }
  }
}
