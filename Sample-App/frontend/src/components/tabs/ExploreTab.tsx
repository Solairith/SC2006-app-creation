// src/components/tabs/ExploreTab.tsx
import React, { useState } from 'react'

interface ExploreTabProps {
  user: any
  onViewDetails: (schoolName: string) => void
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ user, onViewDetails }) => {
  const [searchResults, setSearchResults] = useState([])
  const [filters, setFilters] = useState({
    q: '',
    level: '',
    zone: '',
    limit: 10,
    offset: 0
  })

  const handleSearch = async () => {
    try {
      // Remove empty filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      const response = await fetch(`/api/schools?${new URLSearchParams(cleanFilters as any)}`)
      const data = await response.json()
      setSearchResults(data.items || [])
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleClear = () => {
    setFilters({
      q: '',
      level: '',
      zone: '',
      limit: 10,
      offset: 0
    })
    setSearchResults([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Explore Schools</h2>
        <div className="text-sm text-muted-foreground">
          {searchResults.length > 0 ? `${searchResults.length} schools found` : 'Use filters to find schools'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card p-4 rounded-lg border space-y-4">
            <h3 className="font-semibold text-lg">Filter Schools</h3>
            
            <div className="space-y-4">
              {/* Text Search */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search by Name or Address
                </label>
                <input
                  type="text"
                  placeholder="Enter school name or location..."
                  value={filters.q}
                  onChange={(e) => setFilters({...filters, q: e.target.value})}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                />
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  School Level
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({...filters, level: e.target.value})}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                >
                  <option value="">All Levels</option>
                  <option value="PRIMARY">Primary</option>
                  <option value="SECONDARY">Secondary</option>
                  <option value="MIXED LEVELS">Mixed Levels</option>
                </select>
              </div>

              {/* Zone Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Zone
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => setFilters({...filters, zone: e.target.value})}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                >
                  <option value="">All Zones</option>
                  <option value="NORTH">North</option>
                  <option value="SOUTH">South</option>
                  <option value="EAST">East</option>
                  <option value="WEST">West</option>
                  <option value="CENTRAL">Central</option>
                </select>
              </div>

              {/* TYPE FILTER REMOVED */}

              <div className="space-y-2">
                <button
                  onClick={handleSearch}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm"
                >
                  Search Schools
                </button>
                
                <button
                  onClick={handleClear}
                  className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-md text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((school: any, index: number) => (
                <div key={index} className="bg-card border rounded-lg p-4 hover:shadow-md transition">
                  <h3 className="font-semibold text-lg">{school.school_name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{school.address}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      {school.mainlevel_code && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {school.mainlevel_code}
                        </span>
                      )}
                      {school.zone_code && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {school.zone_code}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => onViewDetails(school.school_name)}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border">
              <div className="text-muted-foreground space-y-2">
                <p>No schools found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}