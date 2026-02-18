'use client'

import Navigation from '@/components/Navigation'
import OfflineIndicator from '@/components/OfflineIndicator'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Main content area — offset for sidebar on desktop, top bar on mobile */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-16">
          {children}
        </div>
      </main>
      <OfflineIndicator />
    </div>
  )
}
