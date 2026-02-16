
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createUser, updateUser } from "@/lib/db/operations"
import type { User } from "@/lib/db/schema"

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: User | null
    onSave: () => void
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        username: "",
        fullName: "",
        password: "",
        role: "cashier",
        email: "",
        isActive: true,
    })
    const { toast } = useToast()

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                fullName: user.fullName || "",
                password: "", // Don't show existing password
                role: user.role,
                email: user.email || "",
                isActive: user.isActive ?? true,
            })
        } else {
            setFormData({
                username: "",
                fullName: "",
                password: "",
                role: "cashier",
                email: "",
                isActive: true,
            })
        }
    }, [user, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (user) {
                // Update user
                const updateData: any = {
                    fullName: formData.fullName,
                    role: formData.role,
                    email: formData.email,
                    isActive: formData.isActive,
                }
                if (formData.password) {
                    updateData.password = formData.password
                }

                await updateUser(user.id, updateData)
                toast({ title: "Success", description: "User updated successfully" })
            } else {
                // Create user
                if (!formData.username || !formData.password) {
                    toast({ title: "Error", description: "Username and password are required", variant: "destructive" })
                    setLoading(false)
                    return
                }

                await createUser({
                    username: formData.username,
                    fullName: formData.fullName,
                    password: formData.password,
                    role: formData.role,
                    email: formData.email,
                } as any) // Type assertion because createUser in ops expects types that might not match exactly 1:1 if schema types differ slightly
                toast({ title: "Success", description: "User created successfully" })
            }
            onSave()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving user:", error)
            toast({
                title: "Error",
                description: "Failed to save user. Username might already exist.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
                    <DialogDescription>
                        {user ? "Modify user details and access rights." : "Create a new user to access the POS system."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={!!user} // Cannot change username
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">
                            {user ? "Password (leave blank to keep current)" : "Password"}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!user}
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cashier">Cashier</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Admins have full access. Cashiers are restricted from settings and user management.
                        </p>
                    </div>
                    {user && (
                        <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="isActive">Active Account</Label>
                                <div className="text-xs text-muted-foreground">
                                    Disable to prevent user from logging in
                                </div>
                            </div>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save User"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
