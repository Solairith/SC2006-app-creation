// src/components/tabs/ProfileTab.tsx
import React from 'react'

interface ProfileTabProps {
  user: any
  setUser: (user: any) => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, setUser }) => {
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
        <p className="text-muted-foreground mb-6">
          Please sign in to view and manage your profile
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
      
      <div className="bg-card rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Personal Information</h3>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.address && <p><strong>Address:</strong> {user.address}</p>}
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Preferences</h3>
            <p><strong>Saved Schools:</strong> 0</p>
            <p><strong>Preferred Subjects:</strong> 0</p>
          </div>
        </div>
      </div>
    </div>
  )
}