import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-24 px-4 max-w-2xl mx-auto w-full pt-6">
        <Outlet />
      </main>
      <Navbar />
    </div>
  )
}
