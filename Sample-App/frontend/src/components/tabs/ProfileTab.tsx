// src/components/tabs/ProfileTab.tsx
import React, { useState, useEffect } from 'react'
import { UserProfile } from '../UserProfile'
import { Button } from '../ui/button'
import { getPreferences } from '../../lib/api' // ADD THIS IMPORT

interface ProfileTabProps {
  user: any
  setUser: (user: any) => void
  isNewUser?: boolean
  showPreferencesForm?: boolean
  onTogglePreferences?: () => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ 
  user, 
  setUser, 
  isNewUser = false, 
  showPreferencesForm = false,
  onTogglePreferences 
}) => {
  const [currentPreferences, setCurrentPreferences] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current preferences when component mounts
  useEffect(() => {
    fetchCurrentPreferences()
  }, [])

  // Refresh preferences when they might have changed
  useEffect(() => {
    if (!showPreferencesForm) {
      fetchCurrentPreferences()
    }
  }, [showPreferencesForm])

  const fetchCurrentPreferences = async () => {
    try {
      setLoading(true)
      // Use the same API function as UserProfile
      const data = await getPreferences()
      if (data?.ok) {
        setCurrentPreferences(data)
      } else {
        setCurrentPreferences({})
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
      setCurrentPreferences({})
    } finally {
      setLoading(false)
    }
  }

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

  const hasPreferences = currentPreferences && 
    (currentPreferences.level || 
     (currentPreferences.subjects && currentPreferences.subjects.length > 0) || 
     (currentPreferences.ccas && currentPreferences.ccas.length > 0) || 
     currentPreferences.max_distance_km)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* User Information Card */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Name:</strong> {user.name || 'Not set'}</p>
                <p><strong>Email:</strong> {user.email}</p>
              </div>
              <div>
                <p><strong>Account Status:</strong> Active</p>
                <p><strong>Member since:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          {/* Edit Preferences Button - Always show except when in new user mode */}
          {!isNewUser && (
            <Button 
              onClick={onTogglePreferences}
              variant={showPreferencesForm ? "outline" : "default"}
            >
              {showPreferencesForm ? "Cancel" : "Edit Preferences"}
            </Button>
          )}
        </div>

        {/* Welcome message for new users */}
        {isNewUser && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Welcome to SchoolFit! 🎉</h3>
            <p className="text-blue-700 text-sm">
              Please set your school preferences to get personalized recommendations. 
              You can always edit these later from your profile.
            </p>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      {(isNewUser || showPreferencesForm) ? (
        <UserProfile />
      ) : loading ? (
        <div className="bg-card rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : hasPreferences ? (
        // Show current preferences when they exist
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-xl font-bold mb-4">Your Preferences</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {currentPreferences.level && (
              <div>
                <strong className="block text-sm text-muted-foreground mb-1">Level</strong>
                <span className="text-lg">{currentPreferences.level}</span>
              </div>
            )}
            {currentPreferences.max_distance_km && (
              <div>
                <strong className="block text-sm text-muted-foreground mb-1">Max Distance</strong>
                <span className="text-lg">{currentPreferences.max_distance_km} km</span>
              </div>
            )}
            {currentPreferences.subjects && currentPreferences.subjects.length > 0 && (
              <div className="md:col-span-2">
                <strong className="block text-sm text-muted-foreground mb-1">Subjects</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentPreferences.subjects.map((subject: string, index: number) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {currentPreferences.ccas && currentPreferences.ccas.length > 0 && (
              <div className="md:col-span-2">
                <strong className="block text-sm text-muted-foreground mb-1">CCAs</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentPreferences.ccas.map((cca: string, index: number) => (
                    <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {cca}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Your preferences are used to personalize school recommendations. 
            Click "Edit Preferences" above to make changes.
          </div>
        </div>
      ) : (
        // Show set preferences message when no preferences exist
        <div className="bg-card rounded-lg border p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Your Preferences</h3>
          <p className="text-muted-foreground mb-4">
            No preferences set yet. Set your preferences to get personalized school recommendations.
          </p>
          <Button onClick={onTogglePreferences}>
            Set Preferences
          </Button>
        </div>
      )}
    </div>
  )
}