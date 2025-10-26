// src/components/layout/Header.tsx
import React from 'react'

interface HeaderProps {
  currentView: string
  onTabChange: (view: any) => void
  user: any
  onLoginClick: () => void
  onLogout: () => void
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onTabChange, 
  user, 
  onLoginClick, 
  onLogout 
}) => {
  const tabs = [
    { id: "explore", label: "Explore", icon: "🔍" },
    { id: "saved", label: "Saved", icon: "💾" },
    { id: "recommendations", label: "For You", icon: "⭐" },
    { id: "profile", label: "Profile", icon: "👤" },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95">
      <div className="flex items-center justify-between p-4">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onTabChange("explore")}
        >
          <div className="bg-primary rounded-lg p-2">
            {/* Replace with your actual logo component */}
            <div className="h-5 w-5 text-primary-foreground">🏫</div>
          </div>
          <h1 className="text-lg font-bold text-primary">SchoolFit</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition ${
                currentView === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {/* Replace with your User icon */}
                <div className="h-4 w-4 text-primary">👤</div>
              </div>
              <button 
                onClick={onLogout}
                className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md text-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-3 flex-1 transition ${
                currentView === tab.id
                  ? "text-primary border-t-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}