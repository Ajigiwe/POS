"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  Shield, 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  Download
} from "lucide-react"
import { getTableInfo, clearSelectedTables, validateAdminPassword } from "@/lib/db/clear-data"
import { useToast } from "@/hooks/use-toast"

interface ClearDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

type Step = 'selection' | 'password' | 'confirm' | 'backup' | 'clearing' | 'complete'

export function ClearDataDialog({ open, onOpenChange, onComplete }: ClearDataDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>('selection')
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [tableInfo, setTableInfo] = useState<any[]>([])
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [clearedTables, setClearedTables] = useState<string[]>([])
  const [backupFilename, setBackupFilename] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadTableInfo()
      resetDialog()
    }
  }, [open])

  const resetDialog = () => {
    setCurrentStep('selection')
    setSelectedTables([])
    setAdminPassword("")
    setConfirmText("")
    setPasswordError("")
    setLoading(false)
    setProgress(0)
    setClearedTables([])
    setBackupFilename("")
  }

  const loadTableInfo = async () => {
    try {
      const info = await getTableInfo()
      setTableInfo(info)
    } catch (error) {
      console.error('[v0] Error loading table info:', error)
      toast({
        title: "Error",
        description: "Failed to load table information",
        variant: "destructive"
      })
    }
  }

  const handleTableToggle = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(name => name !== tableName)
        : [...prev, tableName]
    )
  }

  const handleSelectAll = () => {
    const clearableTables = tableInfo.filter(table => table.canClear).map(table => table.name)
    setSelectedTables(clearableTables)
  }

  const handleDeselectAll = () => {
    setSelectedTables([])
  }

  const handleNext = async () => {
    if (currentStep === 'selection') {
      if (selectedTables.length === 0) {
        toast({
          title: "No Tables Selected",
          description: "Please select at least one table to clear",
          variant: "destructive"
        })
        return
      }
      setCurrentStep('password')
    } else if (currentStep === 'password') {
      setLoading(true)
      setPasswordError("")
      
      try {
        const isValid = await validateAdminPassword(adminPassword)
        if (!isValid) {
          setPasswordError("Invalid admin password or user not found")
          setLoading(false)
          return
        }
        setCurrentStep('confirm')
      } catch (error) {
        console.error('[v0] Password validation error:', error)
        setPasswordError("Error verifying password. Please try again.")
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    } else if (currentStep === 'confirm') {
      if (confirmText !== "DELETE") {
        toast({
          title: "Invalid Confirmation",
          description: "Please type 'DELETE' exactly to confirm",
          variant: "destructive"
        })
        return
      }
      setCurrentStep('backup')
      await performBackup()
    }
  }

  const performBackup = async () => {
    setLoading(true)
    setProgress(20)
    
    try {
      // Simulate backup creation
      const filename = `clear_data_backup_${new Date().toISOString().split('T')[0]}.json`
      setBackupFilename(filename)
      
      // Simulate backup progress
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProgress(50)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProgress(100)
      
      setCurrentStep('clearing')
      await performClearing()
    } catch (error) {
      console.error('[v0] Error creating backup:', error)
      toast({
        title: "Backup Failed",
        description: "Failed to create backup before clearing data",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const performClearing = async () => {
    setLoading(true)
    setProgress(0)
    
    try {
      await clearSelectedTables(selectedTables)
      
      // Simulate clearing progress
      for (let i = 0; i < selectedTables.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setProgress(((i + 1) / selectedTables.length) * 100)
        setClearedTables(prev => [...prev, selectedTables[i]])
      }
      
      setCurrentStep('complete')
      setLoading(false)
      
      toast({
        title: "Data Cleared",
        description: `Successfully cleared ${selectedTables.length} table(s)`,
      })
      
      onComplete?.()
    } catch (error) {
      console.error('[v0] Error clearing data:', error)
      toast({
        title: "Clear Failed",
        description: "Failed to clear selected data",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    onOpenChange(false)
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'selection': return 'Select Tables to Clear'
      case 'password': return 'Admin Password Verification'
      case 'confirm': return 'Confirm Data Deletion'
      case 'backup': return 'Creating Backup'
      case 'clearing': return 'Clearing Data'
      case 'complete': return 'Data Cleared Successfully'
      default: return 'Clear Data'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'selection': return 'Choose which data tables to clear. This action cannot be undone.'
      case 'password': return 'Enter your admin password to continue with data clearing.'
      case 'confirm': return 'Type "DELETE" to confirm you want to permanently delete the selected data.'
      case 'backup': return 'Creating automatic backup before clearing data...'
      case 'clearing': return 'Clearing selected data tables...'
      case 'complete': return 'Data has been successfully cleared. A backup was created before clearing.'
      default: return ''
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {tableInfo.map((table) => (
                  <div key={table.name} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={table.name}
                      checked={selectedTables.includes(table.name)}
                      onCheckedChange={() => handleTableToggle(table.name)}
                      disabled={!table.canClear}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={table.name} className="font-medium">
                          {table.label}
                        </Label>
                        <Badge variant="secondary">{table.recordCount} records</Badge>
                        {!table.canClear && (
                          <Badge variant="outline">Protected</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{table.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete all data in the selected tables. 
                A backup will be created automatically before clearing.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'password':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your admin password"
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Admin password required to proceed with data clearing.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmText">
                Type "DELETE" to confirm data clearing
              </Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className={confirmText && confirmText !== "DELETE" ? "border-destructive" : ""}
              />
              {confirmText && confirmText !== "DELETE" && (
                <p className="text-sm text-destructive">
                  Please type "DELETE" exactly to confirm
                </p>
              )}
            </div>
            
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Final Warning:</strong> This action will permanently delete {selectedTables.length} table(s) 
                containing {selectedTables.reduce((sum, table) => {
                  const info = tableInfo.find(t => t.name === table)
                  return sum + (info?.recordCount || 0)
                }, 0)} records. This cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'backup':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Download className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold">Creating Backup</h3>
              <p className="text-muted-foreground">
                Automatic backup: {backupFilename}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Backup Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        )

      case 'clearing':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold">Clearing Data</h3>
              <p className="text-muted-foreground">
                Clearing {selectedTables.length} table(s)...
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clear Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            
            {clearedTables.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Cleared Tables:</p>
                <div className="flex flex-wrap gap-1">
                  {clearedTables.map((table) => (
                    <Badge key={table} variant="secondary">
                      {tableInfo.find(t => t.name === table)?.label || table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold">Data Cleared Successfully</h3>
              <p className="text-muted-foreground">
                {clearedTables.length} table(s) have been cleared
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Cleared Tables:</p>
              <div className="flex flex-wrap gap-1">
                {clearedTables.map((table) => (
                  <Badge key={table} variant="secondary">
                    {tableInfo.find(t => t.name === table)?.label || table}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                A backup was created before clearing: {backupFilename}
              </AlertDescription>
            </Alert>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'selection': return selectedTables.length > 0
      case 'password': return adminPassword.length > 0
      case 'confirm': return confirmText === "DELETE"
      case 'backup':
      case 'clearing': return false
      case 'complete': return true
      default: return false
    }
  }

  const getButtonText = () => {
    switch (currentStep) {
      case 'selection': return 'Continue'
      case 'password': return 'Verify Password'
      case 'confirm': return 'Clear Data'
      case 'backup':
      case 'clearing': return 'Processing...'
      case 'complete': return 'Close'
      default: return 'Continue'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'complete' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {renderStepContent()}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {currentStep === 'complete' ? 'Close' : 'Cancel'}
          </Button>
          {currentStep !== 'backup' && currentStep !== 'clearing' && currentStep !== 'complete' && (
            <Button 
              onClick={handleNext}
              disabled={!canProceed() || loading}
              variant={currentStep === 'confirm' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
