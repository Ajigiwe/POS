// Client-side session management
import type { User } from "../db/schema"

const SESSION_KEY = "pos_session"

export interface Session {
  user: Omit<User, "password">
  token: string
  expiresAt: string
}

export function saveSession(session: Session): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null

  const data = localStorage.getItem(SESSION_KEY)
  if (!data) return null

  try {
    const session: Session = JSON.parse(data)
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      clearSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function hasRole(role: User["role"] | User["role"][]): boolean {
  const session = getSession()
  if (!session) return false

  const roles = Array.isArray(role) ? role : [role]
  return roles.includes(session.user.role)
}
