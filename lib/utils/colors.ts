// Color utility functions for consistent theming across the POS system

// Category-based color scheme (Professional Business)
export const COLORS = {
  // Sales/Revenue - Green (Success, money)
  sales: {
    primary: '#10b981', // emerald-500
    light: '#d1fae5', // emerald-100
    dark: '#047857', // emerald-700
    gradient: 'from-emerald-500 to-green-600',
    text: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },

  // Products/Inventory - Blue (Trust, reliability)
  products: {
    primary: '#3b82f6', // blue-500
    light: '#dbeafe', // blue-100
    dark: '#1d4ed8', // blue-700
    gradient: 'from-blue-500 to-blue-600',
    text: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },

  // Customers - Purple (Loyalty, premium)
  customers: {
    primary: '#8b5cf6', // violet-500
    light: '#ede9fe', // violet-100
    dark: '#7c3aed', // violet-600
    gradient: 'from-violet-500 to-purple-600',
    text: 'text-violet-800',
    bg: 'bg-violet-50',
    border: 'border-violet-200'
  },

  // Reports/Analytics - Orange (Insights, data)
  reports: {
    primary: '#f59e0b', // amber-500
    light: '#fef3c7', // amber-100
    dark: '#d97706', // amber-600
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },

  // Alerts/Low Stock - Red (Warnings, attention)
  alerts: {
    primary: '#ef4444', // red-500
    light: '#fee2e2', // red-100
    dark: '#dc2626', // red-600
    gradient: 'from-red-500 to-red-600',
    text: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },

  // Neutral - Gray (Secondary info)
  neutral: {
    primary: '#6b7280', // gray-500
    light: '#f3f4f6', // gray-100
    dark: '#374151', // gray-700
    gradient: 'from-gray-500 to-gray-600',
    text: 'text-gray-800',
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  }
} as const

// Stock level colors
export const STOCK_COLORS = {
  good: {
    primary: '#10b981', // green-500
    light: '#d1fae5', // green-100
    text: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  low: {
    primary: '#f59e0b', // amber-500
    light: '#fef3c7', // amber-100
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  out: {
    primary: '#ef4444', // red-500
    light: '#fee2e2', // red-100
    text: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-200'
  }
} as const

// Payment method colors - ENHANCED FOR VISIBILITY
export const PAYMENT_COLORS = {
  cash: {
    primary: '#10b981', // green
    text: 'text-green-900',
    bg: 'bg-green-100',
    border: 'border-green-300',
    icon: 'text-green-600'
  },
  card: {
    primary: '#3b82f6', // blue
    text: 'text-blue-900',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    icon: 'text-blue-600'
  },
  other: {
    primary: '#8b5cf6', // purple for mobile money
    text: 'text-purple-900',
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    icon: 'text-purple-600'
  }
} as const

// Loyalty tier colors
export const LOYALTY_COLORS = {
  bronze: {
    primary: '#cd7f32', // bronze
    light: '#fef3c7',
    text: 'text-amber-800',
    bg: 'bg-amber-50'
  },
  silver: {
    primary: '#c0c0c0', // silver
    light: '#f3f4f6',
    text: 'text-gray-800',
    bg: 'bg-gray-50'
  },
  gold: {
    primary: '#ffd700', // gold
    light: '#fef3c7',
    text: 'text-amber-800',
    bg: 'bg-amber-50'
  },
  platinum: {
    primary: '#8b5cf6', // violet
    light: '#ede9fe',
    text: 'text-violet-800',
    bg: 'bg-violet-50'
  }
} as const

// Status colors
export const STATUS_COLORS = {
  completed: {
    primary: '#10b981', // green
    text: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  pending: {
    primary: '#f59e0b', // amber
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  cancelled: {
    primary: '#ef4444', // red
    text: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-200'
  }
} as const

// Helper functions
export function getCategoryColor(category: string) {
  const categoryMap: { [key: string]: keyof typeof COLORS } = {
    'electronics': 'products',
    'clothing': 'customers',
    'food': 'sales',
    'books': 'reports',
    'toys': 'products',
    'home': 'customers',
    'sports': 'sales',
    'beauty': 'reports',
    'automotive': 'products',
    'health': 'customers'
  }

  return COLORS[categoryMap[category.toLowerCase()] || 'neutral']
}

export function getStockColor(quantity: number, threshold: number) {
  if (quantity === 0) return STOCK_COLORS.out
  if (quantity <= threshold) return STOCK_COLORS.low
  return STOCK_COLORS.good
}

export function getPaymentColor(method: string) {
  return PAYMENT_COLORS[method as keyof typeof PAYMENT_COLORS] || PAYMENT_COLORS.other
}

export function getLoyaltyTierColor(points: number) {
  if (points >= 10000) return LOYALTY_COLORS.platinum
  if (points >= 5000) return LOYALTY_COLORS.gold
  if (points >= 1000) return LOYALTY_COLORS.silver
  return LOYALTY_COLORS.bronze
}

export function getStatusColor(status: string) {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
}

// Chart color arrays for Recharts
export const CHART_COLORS = {
  primary: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
  sales: ['#10b981', '#059669', '#047857'],
  products: ['#3b82f6', '#2563eb', '#1d4ed8'],
  customers: ['#8b5cf6', '#7c3aed', '#6d28d9'],
  reports: ['#f59e0b', '#d97706', '#b45309']
} as const

// Gradient background classes
export const GRADIENT_BGS = {
  sales: 'bg-gradient-to-br from-emerald-500 to-green-600',
  products: 'bg-gradient-to-br from-blue-500 to-blue-600',
  customers: 'bg-gradient-to-br from-violet-500 to-purple-600',
  reports: 'bg-gradient-to-br from-amber-500 to-orange-500',
  alerts: 'bg-gradient-to-br from-red-500 to-red-600',
  neutral: 'bg-gradient-to-br from-gray-500 to-gray-600'
} as const
