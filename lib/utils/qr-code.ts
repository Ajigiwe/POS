// QR Code generation utility using qrcode library
// Install with: npm install qrcode @types/qrcode

import QRCode from 'qrcode'

export interface QRCodeOptions {
    width?: number
    margin?: number
    color?: {
        dark?: string
        light?: string
    }
}

export async function generateQRCode(
    data: string,
    options: QRCodeOptions = {}
): Promise<string> {
    const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
        ...options,
    }

    try {
        const qrCodeDataURL = await QRCode.toDataURL(data, defaultOptions)
        return qrCodeDataURL
    } catch (error) {
        console.error('[QR Code] Generation failed:', error)
        throw new Error('Failed to generate QR code')
    }
}

export async function generateReceiptQR(saleId: number, total: number): Promise<string> {
    const data = JSON.stringify({
        saleId,
        total,
        timestamp: new Date().toISOString(),
    })

    return generateQRCode(data, {
        width: 150,
        margin: 1,
    })
}

export function parseReceiptQR(qrData: string): { saleId: number; total: number; timestamp: string } | null {
    try {
        return JSON.parse(qrData)
    } catch {
        return null
    }
}
