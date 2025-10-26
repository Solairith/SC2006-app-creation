// src/components/tabs/SavedTab.tsx
import React, { useState, useEffect } from 'react'

interface SavedTabProps {
  user: any
  onViewDetails: (schoolName: string) => void
}

export const SavedTab: React.FC<SavedTabProps> = ({ user, onViewDetails }) => {
  const [savedSchools, setSavedSchools] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedSchools()
  }, [])

  const fetchSavedSchools = async () => {
    try {
      // TODO: Implement API call to get user's saved schools
      // const response = await fetch('/api/auth/favorites')
      // const data = await response.json()
      
      // Mock data for now
      setSavedSchools([])
    } catch (error) {
      console.error('Failed to fetch saved schools:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading saved schools...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Saved Schools</h2>
      
      {savedSchools.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <p className="text-muted-foreground text-lg">No saved schools yet</p>
          <p className="text-muted-foreground mt-2">
            Explore schools and save them to see them here
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedSchools.map((school: any, index: number) => (
            <div 
              key={index} 
              className="bg-card border rounded-lg p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50"
              onClick={() => onViewDetails(school.school_name)}
            >
              <h3 className="font-semibold text-lg">{school.school_name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{school.address}</p>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  {school.mainlevel_code && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {school.mainlevel_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}