'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

const mainNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/measurements', label: 'Measure', icon: '📏' },
  { href: '/upload', label: 'Upload Spreadsheet', icon: '📤' },
]

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
        {mainNav.map((item) => (
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
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="px-3 py-2 text-xs text-gray-400">
          Window Measurement App
        </div>
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
