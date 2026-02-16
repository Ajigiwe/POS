// Image handling utilities for logo upload and storage

export function convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' }
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum size is 2MB.' }
    }

    return { valid: true }
}

export function resizeImage(base64: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height
                    height = maxHeight
                }
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, width, height)

            resolve(canvas.toDataURL('image/jpeg', 0.9))
        }
        img.src = base64
    })
}

export async function handleLogoUpload(file: File): Promise<{ success: boolean; data?: string; error?: string }> {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    try {
        // Convert to base64
        const base64 = await convertImageToBase64(file)

        // Resize if needed (max 400x400 for logo)
        const resized = await resizeImage(base64, 400, 400)

        return { success: true, data: resized }
    } catch (error) {
        return { success: false, error: 'Failed to process image' }
    }
}
