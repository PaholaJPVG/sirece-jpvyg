import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer institucional */}
        <footer className="bg-white border-t border-gray-100 px-6 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            SIRECE © {new Date().getFullYear()} — I.E. Juan Pablo Viscardo y Guzmán
          </span>
          <span className="text-[11px] text-gray-300">v1.0.0 — Etapa 1</span>
        </footer>
      </div>
    </div>
  )
}
