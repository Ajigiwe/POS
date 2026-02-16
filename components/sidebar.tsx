"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Store, Tag, Receipt, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { clearSession } from "@/lib/auth/session"
import { useRouter } from "next/navigation"
import { Logo } from "./logo"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Sales History", href: "/sales", icon: Receipt },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Users", href: "/users", icon: Shield },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Check session to determine role
    // This is a client-side check for UI experience. 
    // Actual security should be enforced by the backend/pages themselves.
    const session = sessionStorage.getItem("pos_session") // Original code used localStorage in getSession, let's stick to getSession
    // But getSession isn't reactive.
    // Let's just use getSession for initial state.

    // Wait, I should import getSession.
    const currentSession = require("@/lib/auth/session").getSession()
    if (currentSession) {
      setRole(currentSession.user.role)
    }
  }, [])

  const filteredNavigation = navigation.filter(item => {
    if (role === 'cashier') {
      // Cashiers cannot see Users, Settings, Reports
      return !["Users", "Settings", "Reports"].includes(item.name)
    }
    return true
  })

  const handleLogout = () => {
    require("@/lib/auth/session").clearSession()
    router.push("/login")
  }

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo/Brand */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-6", isCollapsed ? "justify-center px-4" : "gap-3")}>
        <div onClick={() => setIsCollapsed(!isCollapsed)} className="cursor-pointer">
          <Logo size="sm" showText={false} />
        </div>

        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">POS</span>
            <span className="text-xs text-sidebar-muted-foreground -mt-1">System</span>
          </div>
        )}
      </div>

      {/* Toggle Button (Hamburger) */}
      <div className="flex justify-end p-2 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
          <span className="sr-only">Toggle Sidebar</span>
          {/* Hamburger Icon */}
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-2" : "px-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
}
