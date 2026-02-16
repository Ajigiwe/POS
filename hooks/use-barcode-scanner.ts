import { useState, useEffect, useCallback, useRef } from 'react'

interface UseBarcodeScannerOptions {
  timeout?: number // Time in ms to wait between characters (default: 100)
  minLength?: number // Minimum barcode length (default: 3)
  onScan?: (barcode: string) => void // Callback when barcode is scanned
}

interface UseBarcodeScannerReturn {
  isScanning: boolean
  lastScannedBarcode: string | null
  startScanning: () => void
  stopScanning: () => void
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}): UseBarcodeScannerReturn {
  const {
    timeout = 100,
    minLength = 3,
    onScan
  } = options

  const [isScanning, setIsScanning] = useState(false)
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)
  const bufferRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTimeRef = useRef<number>(0)

  const processBarcode = useCallback((barcode: string) => {
    if (barcode.length >= minLength) {
      setLastScannedBarcode(barcode)
      onScan?.(barcode)
      bufferRef.current = ''
    }
  }, [minLength, onScan])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isScanning) return

    const now = Date.now()
    const timeSinceLastKey = now - lastKeyTimeRef.current

    // If too much time has passed, reset buffer (manual typing)
    if (timeSinceLastKey > timeout * 2) {
      bufferRef.current = ''
    }

    lastKeyTimeRef.current = now

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Handle special keys
    if (event.key === 'Enter') {
      event.preventDefault()
      processBarcode(bufferRef.current)
      return
    }

    // Add character to buffer
    if (event.key.length === 1) {
      bufferRef.current += event.key
    }

    // Set timeout to process barcode if no more input
    timeoutRef.current = setTimeout(() => {
      if (bufferRef.current.length >= minLength) {
        processBarcode(bufferRef.current)
      }
    }, timeout)
  }, [isScanning, timeout, minLength, processBarcode])

  const startScanning = useCallback(() => {
    setIsScanning(true)
    bufferRef.current = ''
  }, [])

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    bufferRef.current = ''
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (isScanning) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
  }, [isScanning, handleKeyDown])

  return {
    isScanning,
    lastScannedBarcode,
    startScanning,
    stopScanning
  }
}
