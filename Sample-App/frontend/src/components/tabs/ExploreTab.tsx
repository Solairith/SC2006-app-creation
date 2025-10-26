// src/components/tabs/ExploreTab.tsx
import React, { useState, useEffect } from 'react'

interface ExploreTabProps {
  user: any
  onViewDetails: (schoolName: string) => void
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ user, onViewDetails }) => {
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    q: '',
    level: '',
    zone: '',
    limit: 50,
    offset: 0
  })

  // Load all schools on component mount and when filters change
  useEffect(() => {
    handleSearch()
  }, [filters.level, filters.zone])

  const handleSearch = async () => {
    try {
      setLoading(true)
      
      // Remove empty filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
      
      const response = await fetch(`/api/schools?${new URLSearchParams(cleanFilters as any)}`)
      const data = await response.json()
      setSearchResults(data.items || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFilters({
      q: '',
      level: '',
      zone: '',
      limit: 50,
      offset: 0
    })
  }

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Explore Schools</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : searchResults.length > 0 ? `${searchResults.length} schools found` : 'No schools found'}
        </div>
      </div>

      {/* One-line Filter Bar */}
     <div className="bg-card p-4 rounded-lg border">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="School name or location..."
            value={filters.q}
            onChange={(e) => setFilters({...filters, q: e.target.value})}
            onKeyPress={handleKeyPress}
            className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Level Filter */}
        <div className="w-32">
          <label className="block text-sm font-medium mb-1">Level</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters({...filters, level: e.target.value})}
            className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
          >
            <option value="">All Levels</option>
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
            <option value="MIXED LEVELS">Mixed</option>
          </select>
        </div>

        {/* Zone Filter */}
        <div className="w-32">
          <label className="block text-sm font-medium mb-1">Zone</label>
          <select
            value={filters.zone}
            onChange={(e) => setFilters({...filters, zone: e.target.value})}
            className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
          >
            <option value="">All Zones</option>
            <option value="NORTH">North</option>
            <option value="SOUTH">South</option>
            <option value="EAST">East</option>
            <option value="WEST">West</option>
            <option value="CENTRAL">Central</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

      {/* Search Results */}
      <div>
        {loading ? (
          <div className="text-center py-8">Loading schools...</div>
        ) : searchResults.length > 0 ? (
          <div className="grid gap-4">
            {searchResults.map((school: any, index: number) => (
              <div 
                key={index} 
                className="bg-card border rounded-lg p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50 hover:bg-gray-50"
                onClick={() => onViewDetails(school.school_name)}
              >
                <h3 className="font-semibold text-lg">{school.school_name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{school.address}</p>
                
                <div className="flex gap-2 mt-3">
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
  )
}