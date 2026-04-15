import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import { useProfile } from '@/hooks/useProfile'

export default function Layout() {
  const { data: profile, isLoading } = useProfile()
  const location = useLocation()

  // If profile is loaded but incomplete (missing weight), force redirect to profile for onboarding
  const isIncomplete = !isLoading && profile && !profile.weight
  if (isIncomplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-24 px-4 max-w-2xl mx-auto w-full pt-6">
        <Outlet />
      </main>
      <Navbar />
    </div>
  )
}
