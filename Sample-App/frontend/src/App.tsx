import React, { useState, useEffect } from "react";
import { Menu, User } from "lucide-react";
import { SchoolFitLogo } from "./components/SchoolFitLogo";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { AuthModal } from "./components/AuthModal";
import { SchoolSearch } from "./components/SchoolSearch";
import { SavedSchools } from "./components/SavedSchools";
import { SchoolRecommendations } from "./components/SchoolRecommendations";
import { UserProfile } from "./components/UserProfile";
import { SchoolDetails } from "./components/SchoolDetails";
import { getMe, logout } from "./lib/api";

// Make sure your App.tsx imports look like this:
import { Header } from "./components/layout/Header";
import { ExploreTab } from "./components/tabs/ExploreTab";
import { SavedTab } from "./components/tabs/SavedTab";
import { ProfileTab } from "./components/tabs/ProfileTab";
// You'll also need these:
type TabType = 'explore' | 'saved' | 'foryou' | 'profile';


export default function App() {
  const [currentView, setCurrentView] = useState<
    "explore" | "saved" | "recommendations" | "profile" | "schoolDetails"
  >("explore");

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<any>(null);

  // ✅ CHANGED: now store schoolName (string), not ID
  const [selectedSchoolName, setSelectedSchoolName] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setUser(me.user || null);
      } catch (e) {}
    })();
  }, []);

  const handleAuth = async (u: any) => {
    setUser(u || null);
    try {
      const me = await getMe();
      if (me.user) setUser(me.user);
    } catch (e) {}
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentView("explore");
    setSelectedSchoolName(null);
  };

  // ✅ CHANGED: takes a school name (string)
  const handleViewSchoolDetails = (schoolName: string) => {
    setSelectedSchoolName(schoolName);
    setCurrentView("schoolDetails");
  };

  const handleBackFromDetails = () => {
    setSelectedSchoolName(null);
    setCurrentView("explore");
  };

  const nav = (v: typeof currentView) => {
    setCurrentView(v);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95">
        <div className="flex items-center justify-between p-4">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => nav("explore")}
          >
            <div className="bg-primary rounded-lg p-2">
              <SchoolFitLogo className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-primary">SchoolFit</h1>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            {[
              { id: "explore", label: "Explore" },
              { id: "saved", label: "Saved"  },
              { id: "recommendations", label: "For You" },
              { id: "profile", label: "Profile" },
            ].map((tab) => ( 
              <button
                key={tab.id}
                onClick={() => nav(tab.id as any)} 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition ${
                  currentView === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="rounded-full px-4"
                onClick={() => {
                  setAuthMode("login");
                  setIsAuthModalOpen(true);
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
        <div className="md:hidden border-t border-border">
        <div className="flex justify-around">
          {[
            { id: "explore", label: "Explore" },
            { id: "saved", label: "Saved" },
            { id: "recommendations", label: "For You" },
            { id: "profile", label: "Profile" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => nav(tab.id as any)} // Remove "as any" - fix the type properly
              className={`flex flex-col items-center py-3 flex-1 transition ${
                currentView === tab.id
                  ? "text-primary border-t-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-8">
        <div className="p-4 space-y-4">
          {currentView === "explore" && (
            <SchoolSearch user={user} onViewDetails={handleViewSchoolDetails} />
          )}

          {currentView === "saved" && user && (
            <SavedSchools user={user} onViewDetails={handleViewSchoolDetails} />
          )}

          {currentView === "recommendations" && user && (
            <SchoolRecommendations
              user={user}
              onViewDetails={handleViewSchoolDetails}
            />
          )}

          {currentView === "profile" && user && (
            <UserProfile user={user} setUser={setUser} />
          )}

          {/* ✅ CHANGED: now uses selectedSchoolName */}
          {currentView === "schoolDetails" && selectedSchoolName && (
            <SchoolDetails
              schoolName={selectedSchoolName}
              onBack={handleBackFromDetails}
            />
          )}

          {!user && currentView !== "explore" && (
            <Card className="rounded-xl border-0 bg-gray-100 p-8 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sign In Required</h3>
                <p className="text-muted-foreground"> 
                  Please Sign in to access {currentView === "saved"? "your saved schools":
                  currentView === "recommendations" ? "personalized recommendations" : "your profile"} </p>
                <Button
                  onClick={() => {
                    setAuthMode("login");
                    setIsAuthModalOpen(true);
                  }}
                  >Sign In</Button>
                </div>
            </Card>
          )}
        </div>
      </main>

      {/* Auth modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onAuth={handleAuth}
      />
    </div>
  );
}
