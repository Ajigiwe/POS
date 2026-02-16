"use client"

import { useState } from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { handleLogoUpload } from "@/lib/utils/image-handler"

interface LogoUploadProps {
    currentLogo?: string
    onLogoChange: (logoUrl: string | undefined) => void
}

export function LogoUpload({ currentLogo, onLogoChange }: LogoUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string>()

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(undefined)

        const result = await handleLogoUpload(file)

        if (result.success && result.data) {
            onLogoChange(result.data)
        } else {
            setError(result.error || "Failed to upload logo")
        }

        setUploading(false)
    }

    const handleRemove = () => {
        onLogoChange(undefined)
        setError(undefined)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                {currentLogo ? (
                    <Card className="relative w-32 h-32 overflow-hidden border-2">
                        <img
                            src={currentLogo}
                            alt="Store logo"
                            className="w-full h-full object-contain p-2"
                        />
                        <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={handleRemove}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Card>
                ) : (
                    <Card className="w-32 h-32 flex items-center justify-center border-2 border-dashed">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </Card>
                )}

                <div className="flex-1 space-y-2">
                    <label htmlFor="logo-upload">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => document.getElementById("logo-upload")?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {uploading ? "Uploading..." : currentLogo ? "Change Logo" : "Upload Logo"}
                        </Button>
                    </label>
                    <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <p className="text-xs text-muted-foreground">
                        Recommended: 400x400px, max 2MB (JPEG, PNG, GIF, WebP)
                    </p>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            </div>
        </div>
    )
}
