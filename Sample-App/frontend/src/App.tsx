import React, { useEffect, useState } from "react";
import { SchoolFitLogo } from "./components/SchoolFitLogo";
import { Button } from "./components/ui/button";
import { SchoolSearch } from "./components/SchoolSearch";
import { SchoolRecommendations } from "./components/SchoolRecommendations";
import { UserProfile } from "./components/UserProfile";
import { SchoolDetails } from "./components/SchoolDetails";
import { getMe, logout } from "./lib/api";
import { AuthModal } from "./components/AuthModal";

export default function App() {
  const [currentView, setCurrentView] = useState<"explore"|"recommendations"|"profile"|"schoolDetails">("explore");
  const [user, setUser] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const refresh = async () => {
    try {
      const r = await getMe();
      setUser(r.user || null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onRequireAuth = () => setShowAuth(true);

  const onViewDetails = (name: string) => {
    setSelectedSchool(name);
    setCurrentView("schoolDetails");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SchoolFitLogo />
            <div className="font-semibold text-lg">SchoolFit</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={currentView==="explore"?"default":"outline"} onClick={() => setCurrentView("explore")}>Explore</Button>
            <Button variant={currentView==="recommendations"?"default":"outline"} onClick={() => { if (!user) { onRequireAuth(); return; } setCurrentView("recommendations"); }}>For you</Button>
            <Button variant={currentView==="profile"?"default":"outline"} onClick={() => { if (!user) { onRequireAuth(); return; } setCurrentView("profile"); }}>Profile</Button>
            {user ? (
              <>
                <div className="text-sm">Hi, {user.name}</div>
                <Button variant="outline" onClick={async ()=>{await logout(); setUser(null);}}>Logout</Button>
              </>
            ) : (
              <Button onClick={onRequireAuth}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {currentView==="explore" && (
          <SchoolSearch
            user={user}
            onViewDetails={onViewDetails}
            onGoRecommendations={()=> setCurrentView("recommendations")}
            onRequireAuth={onRequireAuth}
          />
        )}
        {currentView==="recommendations" && (
          <SchoolRecommendations onViewDetails={onViewDetails} />
        )}
        {currentView==="profile" && (
          <UserProfile />
        )}
        {currentView==="schoolDetails" && selectedSchool && (
          <SchoolDetails schoolName={selectedSchool} onBack={() => setCurrentView("explore")} />
        )}
      </main>

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuthed={(u)=>{ setUser(u); setCurrentView("profile"); setShowAuth(false); }} />}

      <footer className="text-center text-xs text-muted py-4 border-t">© SchoolFit</footer>
    </div>
  );
}
