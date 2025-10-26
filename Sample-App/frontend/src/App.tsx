import React, { useEffect, useState } from "react";
import { SchoolFitLogo } from "./components/SchoolFitLogo";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card"; // ADD THIS
import { User } from "lucide-react"; // ADD THIS
import { getMe, logout } from "./lib/api";
// In App.tsx - update checkUserPreferences to use getPreferences API
import { getPreferences } from "./lib/api"; // ADD THIS IMPORT

import { Header } from "./components/layout/Header";
import { ExploreTab } from "./components/tabs/ExploreTab";
import { SavedTab } from "./components/tabs/SavedTab";
import { ProfileTab } from "./components/tabs/ProfileTab";
import { SchoolDetails } from "./components/SchoolDetails";
import { AuthModal } from "./components/AuthModal";
import { SchoolRecommendations } from "./components/SchoolRecommendations";

import { UserProfile } from "./components/UserProfile";

export default function App() {
  const [currentView, setCurrentView] = useState<"explore" | "saved" | "recommendations" | "profile" | "schoolDetails">("explore");
  const [user, setUser] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [userHasPreferences, setUserHasPreferences] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false); 
  const [showPreferencesForm, setShowPreferencesForm] = useState(false);
  // ADD nav function
  const nav = (view: typeof currentView) => {
    setCurrentView(view);
  };

  // ADD handleLogout function
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentView("explore");
    setSelectedSchool(null);
  };

  // ADD handleViewSchoolDetails function
  const handleViewSchoolDetails = (schoolName: string) => {
    setSelectedSchool(schoolName);
    setCurrentView("schoolDetails");
  };

  // ADD handleBackFromDetails function
  const handleBackFromDetails = () => {
    setSelectedSchool(null);
    setCurrentView("explore");
  };

  const refresh = async () => {
    try {
      const r = await getMe();
      setUser(r.user || null);
    } catch {
      setUser(null);
    }
  }; 
  

 
const onAuth = async (user: any) => {
  setUser(user);
  setShowAuth(false);
  
  // Immediately redirect new users to profile to set preferences
  const hasPrefs = await checkUserPreferences();
  
  if (!hasPrefs) {
    setIsNewUser(true);
    setShowPreferencesForm(true);
    setCurrentView("profile");
  }
};

useEffect(() => {
  if (user) {
    checkUserPreferences();
  }
}, [user]);

    const checkUserPreferences = async (): Promise<boolean> => {
      try {
        console.log('Checking user preferences...');
        // Use the same API function as everywhere else
        const data = await getPreferences();
        
        console.log('Preferences data:', data);
        
        const hasPrefs = !!(data?.level || 
                          (data?.subjects && data.subjects.length > 0) || 
                          (data?.ccas && data.ccas.length > 0) || 
                          data?.max_distance_km);
        
        console.log('Has preferences:', hasPrefs);
        setUserHasPreferences(hasPrefs);
        return hasPrefs;
      } catch (error) {
        console.error('Error checking user preferences:', error);
        return false;
      }
    };
    
   useEffect(() => { refresh(); }, []);

 useEffect(() => {
    const handlePreferencesSaved = () => {
      setUserHasPreferences(true);
      setIsNewUser(false); // No longer a new user
      setShowPreferencesForm(false); // Hide preferences form after saving
    };

    window.addEventListener('preferences-saved', handlePreferencesSaved);
    
    return () => {
      window.removeEventListener('preferences-saved', handlePreferencesSaved);
    };
  }, []);

  // Add function to toggle preferences form
  const togglePreferencesForm = () => {
    setShowPreferencesForm(!showPreferencesForm);
  };

  const onRequireAuth = () => setShowAuth(true);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => nav("explore")}>
            <SchoolFitLogo />
            <div className="font-semibold text-lg">SchoolFit</div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            {[
              { id: "explore", label: "Explore" },
              { id: "saved", label: "Saved" },
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
                  setShowAuth(true); 
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
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
                onClick={() => nav(tab.id as any)}
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
          {/* USE THE NEW TAB COMPONENTS */}
          {currentView === "explore" && (
            <ExploreTab user={user} onViewDetails={handleViewSchoolDetails} />
          )}

          {currentView === "saved" && user && (
            <SavedTab user={user} onViewDetails={handleViewSchoolDetails} />
          )}

      
          {currentView === "recommendations" && user && (
            userHasPreferences ? (
              <SchoolRecommendations onViewDetails={handleViewSchoolDetails} />
            ) : (
              <div className="max-w-2xl mx-auto">
                <Card className="p-6 text-center">
                  <h2 className="text-2xl font-bold mb-4">Set Your Preferences First</h2>
                  <p className="text-muted-foreground mb-6">
                    Please set your school preferences to get personalized recommendations.
                  </p>
                  <Button 
                    onClick={() => setCurrentView("profile")}
                    className="bg-primary text-primary-foreground"
                  >
                    Set Preferences
                  </Button>
                </Card>
              </div>
            )
          )}

          {currentView === "profile" && user && (
            <ProfileTab 
              user={user} 
              setUser={setUser}
              isNewUser={isNewUser}
              showPreferencesForm={showPreferencesForm}
              onTogglePreferences={togglePreferencesForm}
            />
          )}

          {}
          {currentView === "schoolDetails" && selectedSchool && (
            <SchoolDetails
              schoolName={selectedSchool}
              onBack={handleBackFromDetails}
            />
          )}

          {!user && currentView !== "explore" && (
            <Card className="rounded-xl border-0 bg-gray-100 p-8 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sign In Required</h3>
                <p className="text-muted-foreground"> 
                  Please Sign in to access {currentView === "saved"? "your saved schools" :
                  currentView === "recommendations" ? "personalized recommendations" : "your profile"} 
                </p>
                <Button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuth(true); 
                  }}
                >
                  Sign In
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {}
      {showAuth && (
        <AuthModal
        onClose={() => setShowAuth(false)}
        onAuthed = {onAuth}
        />
      )}

      <footer className="text-center text-xs text-muted py-4 border-t">© SchoolFit</footer>
    </div>
  );
}