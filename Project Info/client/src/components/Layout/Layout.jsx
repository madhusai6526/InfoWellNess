import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = () => {
  const { user } = useAuth()
  const { isConnected } = useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebarOverlay = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-blue-600 text-xl font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} collapsed={sidebarCollapsed} onToggle={toggleSidebarOverlay} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: sidebarCollapsed ? '5rem' : '16rem', paddingTop: 0 }}>
        {/* Header */}
        <Header onToggleSidebar={toggleSidebarOverlay} onCollapseSidebar={toggleSidebarCollapse} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-0 lg:p-0">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebarOverlay}
        />
      )}
    </div>
  )
}

export default Layout
