'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/components/AuthProvider'
import { signOut } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

interface NavItem {
  href: string
  label: string
  icon: string
  permission?: string
}

const mainNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/jobs', label: 'Jobs', icon: '📋' },
  { href: '/measurements', label: 'Measure', icon: '📏' },
  { href: '/upload', label: 'Upload Spreadsheet', icon: '📤', permission: 'jobs:import' },
]

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  salesperson: 'bg-blue-100 text-blue-700',
  field_tech: 'bg-green-100 text-green-700',
}

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, effectiveRole, viewAsRole, setViewAsRole, can } = useAuthContext()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const email = user?.email || ''
  const isAdmin = profile?.role === 'admin'

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navLinkClasses = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary/10 text-primary'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  // Filter nav items by permission
  const visibleNav = mainNav.filter((item) => {
    if (!item.permission) return true
    return can(item.permission as Parameters<typeof can>[0])
  })

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            H&F
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Windows</h1>
            <p className="text-xs text-gray-500">H&F Exteriors</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={navLinkClasses(item.href)}
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Admin link */}
        {can('admin:manage_users') && (
          <Link
            href="/admin/users"
            className={navLinkClasses('/admin')}
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-base">⚙️</span>
            <span>Admin</span>
          </Link>
        )}
      </nav>

      {/* User Info & Role */}
      <div className="p-3 border-t border-gray-200">
        {/* Role badge */}
        <div className="px-3 mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[effectiveRole]}`}>
            {ROLE_LABELS[effectiveRole]}
            {viewAsRole && ' (preview)'}
          </span>
        </div>

        {/* Admin role switcher */}
        {isAdmin && (
          <div className="px-3 mb-2">
            <select
              value={viewAsRole ?? 'admin'}
              onChange={(e) => {
                const val = e.target.value
                setViewAsRole(val === 'admin' ? null : (val as Role))
              }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="admin">View as: Admin</option>
              <option value="salesperson">View as: Salesperson</option>
              <option value="field_tech">View as: Field Tech</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
            H&F
          </div>
          <span className="text-sm font-bold text-gray-900">Windows</span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
