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
          <div className="bg-primary rounded-xl p-2.5">
            {/* logo placeholder */}
            <div className="h-6 w-6 text-primary-foreground">🏫</div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary">
            SchoolFit
          </h1>
        </div>

        <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-base lg:text-lg font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-5 w-5 text-primary">👤</div>
              </div>
              {/* was text-sm / h-9 → make larger */}
              <button
                onClick={onLogout}
                className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 rounded-md text-base"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-md text-base font-medium"
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
              {/* bigger icon + label on mobile */}
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-sm mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
