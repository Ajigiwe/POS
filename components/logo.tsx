"use client"

import { ShoppingCart, Store } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center`}>
          <ShoppingCart className="h-1/2 w-1/2 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
          <Store className="h-2 w-2 text-white" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            POS
          </span>
          <span className="text-xs text-gray-500 -mt-1">
            System
          </span>
        </div>
      )}
    </div>
  )
}
