"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSettings, updateSettings } from "@/lib/db/operations"
import type { Settings } from "@/lib/db/schema"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/components/theme-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackupDialog } from "@/components/backup-dialog"
import { ClearDataDialog } from "@/components/clear-data-dialog"
import {
  exportToJSON,
  exportToEncrypted,
  importFromJSON,
  importFromEncrypted,
  downloadBackup,
  generateBackupFilename,
  getBackupMetadata,
  validateBackupData
} from "@/lib/db/backup"
import {
  getBackupSettings,
  saveBackupSettings,
  getAutoBackups,
  triggerManualBackup,
  getBackupStats,
  scheduleAutoBackup
} from "@/lib/db/auto-backup"
import { resetDatabaseWithDummyData } from "@/lib/db/reset-database"
import { LogoUpload } from "@/components/logo-upload"
import { TaxRateManager } from "@/components/tax-rate-manager"
import { ColorPicker } from "@/components/color-picker"
import { PaymentMethodToggles } from "@/components/payment-method-toggles"
import { Download, Upload, Database, Clock, Shield, AlertTriangle, Trash2, RefreshCw, Palette, Settings2, Package2 } from "lucide-react"
import { format } from "date-fns"
import type { TaxRate } from "@/lib/db/schema"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backupDialogOpen, setBackupDialogOpen] = useState(false)
  const [backupMode, setBackupMode] = useState<'backup' | 'restore'>('backup')
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMetadata, setBackupMetadata] = useState<any>(null)
  const [autoBackups, setAutoBackups] = useState<any[]>([])
  const [backupStats, setBackupStats] = useState<any>(null)
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const [formData, setFormData] = useState({
    store_name: "",
    store_address: "",
    store_phone: "",
    store_email: "",
    currency: "GHS",
    tax_rate: "10",
    receipt_footer: "",
    low_stock_alert: "10",
  })

  useEffect(() => {
    loadSettings()
    loadBackupData()
    scheduleAutoBackup() // Initialize auto-backup system
  }, [])

  const loadBackupData = async () => {
    try {
      const [backups, stats] = await Promise.all([
        getAutoBackups().catch(() => []), // Return empty array if table doesn't exist
        getBackupStats().catch(() => null) // Return null if stats can't be loaded
      ])
      setAutoBackups(backups)
      setBackupStats(stats)
    } catch (error) {
      console.error("[v0] Error loading backup data:", error)
      // Set default values if backup system isn't ready
      setAutoBackups([])
      setBackupStats(null)
    }
  }

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      if (data) {
        setSettings(data)
        setFormData({
          store_name: data.storeName,
          store_address: data.storeAddress || "",
          store_phone: data.storePhone || "",
          store_email: data.storeEmail || "",
          currency: data.currency,
          tax_rate: (data.taxRate || 0).toString(),
          receipt_footer: data.receiptFooter || "",
          low_stock_alert: "10", // Default value as not in schema
        })
      }
    } catch (error) {
      console.error("[v0] Error loading settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({
        storeName: formData.store_name,
        storeAddress: formData.store_address || undefined,
        storePhone: formData.store_phone || undefined,
        storeEmail: formData.store_email || undefined,
        currency: formData.currency,
        taxRate: Number.parseFloat(formData.tax_rate),
        receiptFooter: formData.receipt_footer || undefined,
        // low_stock_alert cannot be saved as it's not in schema
        // lowStockAlert: Number.parseInt(formData.low_stock_alert),
        // enableStockAlerts: true, // we could set this, but it's separate
      })

      // Also update the local settings state to reflect changes
      if (settings) {
        setSettings({
          ...settings,
          storeName: formData.store_name,
          storeAddress: formData.store_address,
          storePhone: formData.store_phone,
          storeEmail: formData.store_email,
          currency: formData.currency,
          taxRate: Number.parseFloat(formData.tax_rate),
          receiptFooter: formData.receipt_footer,
        })
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })

      loadSettings()
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async (selectedTables: string[], format: 'json' | 'encrypted', password?: string) => {
    setBackupLoading(true)
    try {
      let backupData: string
      if (format === 'json') {
        backupData = await exportToJSON(selectedTables)
      } else {
        backupData = await exportToEncrypted(selectedTables, password!)
      }

      const filename = generateBackupFilename(format)
      downloadBackup(backupData, filename)

      toast({
        title: "Backup Created",
        description: `Backup saved as ${filename}`,
      })
    } catch (error) {
      console.error("[v0] Error creating backup:", error)
      toast({
        title: "Backup Failed",
        description: "Failed to create backup",
        variant: "destructive",
      })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestore = async (file: File, password?: string) => {
    setBackupLoading(true)
    try {
      const fileContent = await file.text()

      // Try to parse as JSON first
      let backupData: any
      try {
        backupData = JSON.parse(fileContent)
        validateBackupData(backupData)
        setBackupMetadata(getBackupMetadata(backupData))
        await importFromJSON(fileContent)
      } catch {
        // If JSON parsing fails, try encrypted
        if (!password) {
          throw new Error('Password required for encrypted backup')
        }
        await importFromEncrypted(fileContent, password)
      }

      toast({
        title: "Data Restored",
        description: "Backup has been successfully restored",
      })

      // Reload settings and backup data
      await loadSettings()
      await loadBackupData()
    } catch (error) {
      console.error("[v0] Error restoring backup:", error)
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup",
        variant: "destructive",
      })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleManualBackup = async () => {
    try {
      await triggerManualBackup()
      await loadBackupData()
      toast({
        title: "Backup Created",
        description: "Manual backup completed successfully",
      })
    } catch (error) {
      console.error("[v0] Error creating manual backup:", error)
      toast({
        title: "Backup Failed",
        description: "Failed to create manual backup",
        variant: "destructive",
      })
    }
  }

  const handleClearDataComplete = async () => {
    // Reload backup data after clearing
    await loadBackupData()
  }

  const handleResetDatabase = async () => {
    try {
      await resetDatabaseWithDummyData()
      toast({
        title: "Database Reset",
        description: "Database has been reset with fresh dummy data. Refreshing page...",
      })
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("[v0] Error resetting database:", error)
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset database",
        variant: "destructive",
      })
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
      <Header title="Settings" description="Configure your POS system" />
      <div className="space-y-6 p-6">
        <Tabs defaultValue="store" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="store">Store Info</TabsTrigger>
            <TabsTrigger value="receipt">Receipt & Print</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>Update your store details for receipts and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Store Name *</Label>
                  <Input
                    id="store_name"
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_address">Store Address</Label>
                  <Input
                    id="store_address"
                    value={formData.store_address}
                    onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store_phone">Phone Number</Label>
                    <Input
                      id="store_phone"
                      type="tel"
                      value={formData.store_phone}
                      onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store_email">Email Address</Label>
                    <Input
                      id="store_email"
                      type="email"
                      value={formData.store_email}
                      onChange={(e) => setFormData({ ...formData, store_email: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Configuration</CardTitle>
                <CardDescription>Configure tax rates, currency, and inventory alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="low_stock_alert">Low Stock Alert Threshold</Label>
                  <Input
                    id="low_stock_alert"
                    type="number"
                    min="0"
                    value={formData.low_stock_alert}
                    onChange={(e) => setFormData({ ...formData, low_stock_alert: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_footer">Receipt Footer Message</Label>
                  <Textarea
                    id="receipt_footer"
                    value={formData.receipt_footer}
                    onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                    rows={3}
                    placeholder="Thank you for your business!"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt & Print Tab */}
          <TabsContent value="receipt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Store Logo</CardTitle>
                <CardDescription>Upload your store logo for receipts and branding</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUpload
                  currentLogo={settings?.logoUrl}
                  onLogoChange={(logoUrl) => {
                    if (settings) {
                      updateSettings({ ...settings, logoUrl: logoUrl })
                      toast({ title: "Logo updated successfully" })
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt Settings</CardTitle>
                <CardDescription>Configure receipt template and print options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="receipt_template">Receipt Template</Label>
                  <Select
                    value={settings?.receiptTemplate || "standard"}
                    onValueChange={(value: any) => {
                      if (settings) {
                        updateSettings({ ...settings, receiptTemplate: value })
                        toast({ title: "Template updated" })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable QR Code</Label>
                    <p className="text-sm text-muted-foreground">Add QR code to receipts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.enableQrCode || false}
                    onChange={(e) => {
                      if (settings) {
                        updateSettings({ ...settings, enableQrCode: e.target.checked })
                        toast({ title: e.target.checked ? "QR codes enabled" : "QR codes disabled" })
                      }
                    }}
                    className="h-4 w-4"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Paper Size</Label>
                    <Select
                      value={settings?.printPaperSize || "thermal-80mm"}
                      onValueChange={(value: any) => {
                        if (settings) {
                          updateSettings({ ...settings, printPaperSize: value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal-80mm">80mm Thermal</SelectItem>
                        <SelectItem value="thermal-58mm">58mm Thermal</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Select
                      value={settings?.printFontSize || "medium"}
                      onValueChange={(value: any) => {
                        if (settings) {
                          updateSettings({ ...settings, printFontSize: value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <PaymentMethodToggles
              enabledMethods={settings?.enabledPaymentMethods || ["cash", "card", "mobile_money"]}
              onMethodsChange={(methods) => {
                if (settings) {
                  const newSettings = { ...settings, enabledPaymentMethods: methods }
                  setSettings(newSettings)
                  updateSettings(newSettings)
                  toast({ title: "Payment methods updated" })
                }
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Price Rounding</CardTitle>
                <CardDescription>Configure how prices are rounded at checkout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Rounding Rule</Label>
                <Select
                  value={settings?.roundingRule || "none"}
                  onValueChange={(value: any) => {
                    if (settings) {
                      updateSettings({ ...settings, roundingRule: value })
                      toast({ title: "Rounding rule updated" })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Rounding</SelectItem>
                    <SelectItem value="nearest-5">Nearest 5 cents</SelectItem>
                    <SelectItem value="nearest-10">Nearest 10 cents</SelectItem>
                    <SelectItem value="up">Round Up</SelectItem>
                    <SelectItem value="down">Round Down</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Alerts</CardTitle>
                <CardDescription>Configure inventory alerts and reorder points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Reorder Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.enableReorderAlerts || false}
                    onChange={(e) => {
                      if (settings) {
                        updateSettings({ ...settings, enableReorderAlerts: e.target.checked })
                        toast({ title: e.target.checked ? "Alerts enabled" : "Alerts disabled" })
                      }
                    }}
                    className="h-4 w-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_reorder_point">Default Reorder Point</Label>
                  <Input
                    id="default_reorder_point"
                    type="number"
                    min="0"
                    value={settings?.defaultReorderPoint || 10}
                    onChange={(e) => {
                      if (settings) {
                        updateSettings({ ...settings, defaultReorderPoint: parseInt(e.target.value) || 10 })
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default minimum stock level for new products
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Barcode Format</Label>
                  <Select
                    value={settings?.barcodeFormat || "ean13"}
                    onValueChange={(value: any) => {
                      if (settings) {
                        updateSettings({ ...settings, barcodeFormat: value })
                        toast({ title: "Barcode format updated" })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ean13">EAN-13</SelectItem>
                      <SelectItem value="upc">UPC</SelectItem>
                      <SelectItem value="code128">Code 128</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Batch/Expiry Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track batch numbers and expiry dates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.enableBatchTracking || false}
                    onChange={(e) => {
                      if (settings) {
                        updateSettings({ ...settings, enableBatchTracking: e.target.checked })
                        toast({ title: e.target.checked ? "Batch tracking enabled" : "Batch tracking disabled" })
                      }
                    }}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            {/* Manual Backup Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Manual Backup
                </CardTitle>
                <CardDescription>Create a backup of your data manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setBackupMode('backup')
                      setBackupDialogOpen(true)
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBackupMode('restore')
                      setBackupDialogOpen(true)
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Restore from File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Backup Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Automatic Backup
                </CardTitle>
                <CardDescription>Configure automatic daily backups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-Backup Status</div>
                    <div className="text-sm text-muted-foreground">
                      {backupStats?.lastBackupDate
                        ? `Last backup: ${format(new Date(backupStats.lastBackupDate), 'PPP p')}`
                        : 'No backups yet'
                      }
                    </div>
                  </div>
                  <Button onClick={handleManualBackup}>
                    Backup Now
                  </Button>
                </div>

                {backupStats && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{backupStats.totalBackups}</div>
                      <div className="text-xs text-muted-foreground">Total Backups</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(backupStats.totalSize / 1024)}KB
                      </div>
                      <div className="text-xs text-muted-foreground">Total Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {backupStats.oldestBackup
                          ? format(new Date(backupStats.oldestBackup), 'MMM dd')
                          : 'N/A'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Oldest Backup</div>
                    </div>
                  </div>
                )}

                {/* Auto-Backup Frequency */}
                <div className="pt-4 border-t space-y-2">
                  <Label>Automatic Backup Frequency</Label>
                  <Select
                    value={settings?.autoBackupFrequency || "daily"}
                    onValueChange={(value: "daily" | "weekly" | "monthly") => {
                      if (settings) {
                        updateSettings({ ...settings, autoBackupFrequency: value })
                        toast({
                          title: "Backup frequency updated",
                          description: `Automatic backups will now run ${value}`
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Backups will be created automatically based on this schedule
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Backups */}
            {autoBackups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Recent Backups
                  </CardTitle>
                  <CardDescription>Your recent automatic backups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {autoBackups.slice(0, 5).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              Backup #{backup.id}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(backup.created_at), 'PPP p')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              {(Object.values(backup.metadata.recordCounts) as number[]).reduce((a, b) => a + b, 0)} records
                            </div>
                            <div className="text-muted-foreground">
                              {Math.round(backup.backup_data.length / 1024)}KB
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Backup Warning */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <div className="font-medium text-amber-800 dark:text-amber-200">
                      Important Backup Information
                    </div>
                    <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      • Backups are stored locally in your browser<br />
                      • For maximum security, download backups to external storage<br />
                      • Automatic backups run daily and keep the last 7 backups<br />
                      • Encrypted backups require a strong password for security
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions. Use with extreme caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Reset Database with Dummy Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Delete all data and reinitialize with fresh dummy sales, products, and customers for testing.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleResetDatabase}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Database
                    </Button>
                  </div>

                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      This will create 8 sample sales transactions, 5 products, and 3 customers.
                      Perfect for testing the reports and charts.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Clear Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete selected data tables. A backup will be created automatically.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setClearDataDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Data
                    </Button>
                  </div>

                  <Alert className="border-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This action cannot be undone. All selected data will be permanently deleted.
                      Make sure you have created a backup before proceeding.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Color Mode</Label>
                  <Select value={theme} onValueChange={(v: "light" | "dark" | "system") => setTheme(v)}>
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
                <CardDescription>Customize your brand colors (coming soon)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ColorPicker
                  label="Primary Color"
                  color={settings?.primaryColor || "#8B5CF6"}
                  onColorChange={(color) => {
                    if (settings) {
                      updateSettings({ ...settings, primaryColor: color })
                      toast({ title: "Primary color updated" })
                    }
                  }}
                />

                <ColorPicker
                  label="Secondary Color"
                  color={settings?.secondaryColor || "#EC4899"}
                  onColorChange={(color) => {
                    if (settings) {
                      updateSettings({ ...settings, secondaryColor: color })
                      toast({ title: "Secondary color updated" })
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language & Regional</CardTitle>
                <CardDescription>Set your preferred language and formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={settings?.language || "en"}
                    onValueChange={(value: any) => {
                      if (settings) {
                        updateSettings({ ...settings, language: value })
                        toast({ title: "Language updated" })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={settings?.dateFormat || "MM/DD/YYYY"}
                      onValueChange={(value: any) => {
                        if (settings) {
                          updateSettings({ ...settings, dateFormat: value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Format</Label>
                    <Select
                      value={settings?.timeFormat || "12h"}
                      onValueChange={(value: any) => {
                        if (settings) {
                          updateSettings({ ...settings, timeFormat: value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <BackupDialog
        open={backupDialogOpen}
        onOpenChange={setBackupDialogOpen}
        mode={backupMode}
        onBackup={handleBackup}
        onRestore={handleRestore}
        backupMetadata={backupMetadata}
        loading={backupLoading}
      />

      <ClearDataDialog
        open={clearDataDialogOpen}
        onOpenChange={setClearDataDialogOpen}
        onComplete={handleClearDataComplete}
      />
    </div>
  )
}
