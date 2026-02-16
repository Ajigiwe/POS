"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ColorPickerProps {
    label: string
    color?: string
    onColorChange: (color: string) => void
}

export function ColorPicker({ label, color = "#8B5CF6", onColorChange }: ColorPickerProps) {
    const [tempColor, setTempColor] = useState(color)

    const presetColors = [
        "#8B5CF6", // Purple
        "#EC4899", // Pink
        "#10B981", // Green
        "#3B82F6", // Blue
        "#F59E0B", // Orange
        "#EF4444", // Red
        "#14B8A6", // Teal
        "#6366F1", // Indigo
    ]

    return (
        <div className="space-y-3">
            <Label>{label}</Label>
            <div className="flex items-center gap-3">
                <div
                    className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                    style={{ backgroundColor: tempColor }}
                    onClick={() => document.getElementById(`color-input-${label}`)?.click()}
                />
                <Input
                    id={`color-input-${label}`}
                    type="color"
                    value={tempColor}
                    onChange={(e) => {
                        setTempColor(e.target.value)
                        onColorChange(e.target.value)
                    }}
                    className="w-24 h-10 cursor-pointer"
                />
                <Input
                    type="text"
                    value={tempColor}
                    onChange={(e) => {
                        setTempColor(e.target.value)
                        onColorChange(e.target.value)
                    }}
                    className="w-32"
                    placeholder="#000000"
                />
            </div>

            {/* Preset colors */}
            <div className="flex gap-2 flex-wrap">
                {presetColors.map((presetColor) => (
                    <button
                        key={presetColor}
                        type="button"
                        className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: presetColor }}
                        onClick={() => {
                            setTempColor(presetColor)
                            onColorChange(presetColor)
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
