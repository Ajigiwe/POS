
"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Users, Shield, ShieldAlert } from "lucide-react"
import { getAllUsers, deleteUser } from "@/lib/db/operations"
import type { User } from "@/lib/db/schema"
import { UserDialog } from "@/components/user-dialog"
import { useToast } from "@/hooks/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { getSession } from "@/lib/auth/session"
import { useRouter } from "next/navigation"

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<User | null>(null)
    const { toast } = useToast()
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        // Check if user is admin
        const session = getSession()
        if (!session || session.user.role !== 'admin') {
            toast({
                title: "Access Denied",
                description: "Only administrators can manage users.",
                variant: "destructive"
            })
            router.push('/dashboard')
            return
        }
        setCurrentUser(session.user)
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            const data = await getAllUsers()
            setUsers(data)
        } catch (error) {
            console.error("Error loading users:", error)
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = () => {
        setEditingUser(null)
        setDialogOpen(true)
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setDialogOpen(true)
    }

    const handleDeleteUser = (user: User) => {
        if (user.id === currentUser?.id) {
            toast({
                title: "Cannot Delete Self",
                description: "You cannot delete your own account.",
                variant: "destructive"
            })
            return
        }
        setUserToDelete(user)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!userToDelete) return

        try {
            await deleteUser(userToDelete.id)
            toast({
                title: "User Deleted",
                description: `${userToDelete.username} has been deleted successfully`,
            })
            loadUsers()
        } catch (error) {
            console.error("Error deleting user:", error)
            toast({
                title: "Error",
                description: "Failed to delete user",
                variant: "destructive",
            })
        } finally {
            setDeleteDialogOpen(false)
            setUserToDelete(null)
        }
    }

    const handleUserSaved = () => {
        loadUsers()
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
            <Header title="User Management" description="Manage system users and access roles" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                        <Card className="w-48">
                            <CardContent className="pt-6 flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold">{users.length}</div>
                                    <p className="text-xs text-muted-foreground">Total Users</p>
                                </div>
                                <Users className="h-8 w-8 text-primary/20" />
                            </CardContent>
                        </Card>
                    </div>
                    <Button onClick={handleCreateUser}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {user.username}
                                        {currentUser?.id === user.id && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                                        {user.isActive === false && <Badge variant="destructive" className="text-[10px]">Disabled</Badge>}
                                    </TableCell>
                                    <TableCell>{user.fullName}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                            {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.createdAt ? format(new Date(user.createdAt), "MMM dd, yyyy") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditUser(user)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteUser(user)}
                                                disabled={currentUser?.id === user.id}
                                                className={currentUser?.id === user.id ? "opacity-50 cursor-not-allowed" : ""}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={editingUser}
                onSave={handleUserSaved}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
