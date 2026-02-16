"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import type { BackupMetadata } from "@/lib/db/backup"

interface BackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'backup' | 'restore'
  onBackup?: (selectedTables: string[], format: 'json' | 'encrypted', password?: string) => Promise<void>
  onRestore?: (file: File, password?: string) => Promise<void>
  backupMetadata?: BackupMetadata
  loading?: boolean
}

export function BackupDialog({
  open,
  onOpenChange,
  mode,
  onBackup,
  onRestore,
  backupMetadata,
  loading = false
}: BackupDialogProps) {
  const [selectedTables, setSelectedTables] = useState<string[]>(['products', 'customers', 'sales', 'settings'])
  const [backupFormat, setBackupFormat] = useState<'json' | 'encrypted'>('json')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const availableTables = [
    { id: 'users', label: 'Users', description: 'User accounts and permissions' },
    { id: 'products', label: 'Products', description: 'Product catalog and inventory' },
    { id: 'customers', label: 'Customers', description: 'Customer information and loyalty' },
    { id: 'sales', label: 'Sales', description: 'Sales transactions and history' },
    { id: 'sale_items', label: 'Sale Items', description: 'Individual items in sales' },
    { id: 'settings', label: 'Settings', description: 'System configuration' }
  ]

  const handleTableToggle = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    )
  }

  const handleSelectAll = () => {
    setSelectedTables(availableTables.map(table => table.id))
  }

  const handleDeselectAll = () => {
    setSelectedTables([])
  }

  const handleBackup = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table to backup')
      return
    }

    if (backupFormat === 'encrypted') {
      if (!password) {
        setError('Password is required for encrypted backups')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setError(null)
    try {
      await onBackup?.(selectedTables, backupFormat, backupFormat === 'encrypted' ? password : undefined)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed')
    }
  }

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('Please select a backup file')
      return
    }

    setError(null)
    try {
      await onRestore?.(selectedFile, restorePassword || undefined)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'backup' ? (
              <>
                <Download className="h-5 w-5" />
                Create Backup
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Restore from Backup
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'backup' 
              ? 'Select the data you want to backup and choose your preferred format.'
              : 'Upload a backup file to restore your data. This will overwrite existing data.'
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'backup' ? (
          <div className="space-y-4">
            {/* Table Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Data to Backup</CardTitle>
                <CardDescription>Choose which tables to include in your backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
                
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {availableTables.map((table) => (
                    <div key={table.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        id={table.id}
                        checked={selectedTables.includes(table.id)}
                        onCheckedChange={() => handleTableToggle(table.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={table.id} className="font-medium text-sm">
                          {table.label}
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">{table.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Backup Format */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Backup Format</CardTitle>
                <CardDescription>Choose how to secure your backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="json"
                      name="format"
                      value="json"
                      checked={backupFormat === 'json'}
                      onChange={(e) => setBackupFormat(e.target.value as 'json')}
                    />
                    <Label htmlFor="json" className="flex-1">
                      <div className="font-medium">JSON Format</div>
                      <div className="text-sm text-muted-foreground">Human-readable, no encryption</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="encrypted"
                      name="format"
                      value="encrypted"
                      checked={backupFormat === 'encrypted'}
                      onChange={(e) => setBackupFormat(e.target.value as 'encrypted')}
                    />
                    <Label htmlFor="encrypted" className="flex-1">
                      <div className="font-medium">Encrypted Format</div>
                      <div className="text-sm text-muted-foreground">AES-256 encrypted, password protected</div>
                    </Label>
                  </div>
                </div>

                {backupFormat === 'encrypted' && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password for encryption"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Backup File</CardTitle>
                <CardDescription>Choose a backup file to restore from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupFile">Backup File</Label>
                    <Input
                      id="backupFile"
                      type="file"
                      accept=".json,.bak"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported formats: .json (JSON backup), .bak (Encrypted backup)
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="space-y-2">
                      <Label htmlFor="restorePassword">Password (if encrypted)</Label>
                      <Input
                        id="restorePassword"
                        type="password"
                        placeholder="Enter password for encrypted backup"
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Backup Preview */}
            {backupMetadata && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Backup Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Version</Label>
                      <p className="text-sm text-muted-foreground">{backupMetadata.version}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(backupMetadata.timestamp), 'PPP p')}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium">Data Included</Label>
                    <div className="mt-2 space-y-1">
                      {Object.entries(backupMetadata.recordCounts).map(([table, count]) => (
                        <div key={table} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{table.replace('_', ' ')}</span>
                          <Badge variant="secondary">{count} records</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will overwrite all existing data. Make sure you have a current backup before proceeding.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {mode === 'backup' ? 'Creating backup...' : 'Restoring data...'}
              </span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={mode === 'backup' ? handleBackup : handleRestore}
            disabled={loading || (mode === 'backup' && selectedTables.length === 0) || (mode === 'restore' && !selectedFile)}
          >
            {mode === 'backup' ? 'Create Backup' : 'Restore Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
