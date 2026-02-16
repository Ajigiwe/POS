"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Loader2 } from "lucide-react"
import { saveSession } from "@/lib/auth/session"
import { useToast } from "@/hooks/use-toast"
import { initDatabase } from "@/lib/db/init"
import { loginUser } from "@/lib/db/operations"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Ensure database is initialized (creates admin user on first run)
      await initDatabase()

      const user = await loginUser(username, password)

      if (!user) {
        toast({
          title: "Login Failed",
          description: "Invalid username or password",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create session
      const session = {
        user: user,
        token: Math.random().toString(36).substring(2), // In future, use real JWT from server
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }

      saveSession(session)

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.fullName}!`,
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">POS System</CardTitle>
            <CardDescription>Sign in to access your point of sale</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">Demo Credentials:</p>
            <p className="mt-1 text-sm">
              <span className="font-medium">Username:</span> admin
            </p>
            <p className="text-sm">
              <span className="font-medium">Password:</span> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
