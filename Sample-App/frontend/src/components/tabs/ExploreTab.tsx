// src/components/tabs/ExploreTab.tsx
import React, { useState, useEffect } from 'react'
import { searchSchools, type School } from '../../lib/api'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'

interface ExploreTabProps {
  user: any
  onViewDetails: (schoolName: string) => void
}

interface SearchFilters {
  q?: string;
  level?: string;
  zone?: string;
  limit: number;
  offset: number;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ user, onViewDetails }) => {
  const [items, setItems] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    q: '',
    level: '',
    zone: '',
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Load schools only on initial mount and when pageSize changes
  useEffect(() => {
    handleSearch(1)
  }, [pageSize])

  const handleSearch = async (newPage = 1) => {
    try {
      setLoading(true)
      
      // Build clean filters object with optional properties
      const cleanFilters: SearchFilters = {
        limit: pageSize,
        offset: (newPage - 1) * pageSize
      }

      // Only add non-empty filters
      if (filters.q.trim()) cleanFilters.q = filters.q
      if (filters.level) cleanFilters.level = filters.level
      if (filters.zone) cleanFilters.zone = filters.zone
      
      const response = await searchSchools(cleanFilters)
      setItems(response.items || [])
      setTotal(response.total || 0)
      setPage(newPage) // This updates the page state AFTER the search
    } catch (error) {
      console.error('Search failed:', error)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFilters({
      q: '',
      level: '',
      zone: '',
    })
    handleSearch(1)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(1)
    }
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    // handleSearch(1) will be triggered by the useEffect
  }

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    handleSearch(newPage)
  }

  function renderPageButtons() {
    const buttons = []
    const maxVisiblePages = 5
    
    let startPage = Math.max(1, page - 2)
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    if (startPage > 1) {
      buttons.push(
        <Button key={1} variant="outline" onClick={() => handlePageChange(1)}>
          1
        </Button>
      )
      if (startPage > 2) {
        buttons.push(<span key="ellipsis1" className="px-2">...</span>)
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <Button key={p} variant={p === page ? "default" : "outline"} onClick={() => handlePageChange(p)}>
          {p}
        </Button>
      )
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis2" className="px-2">...</span>)
      }
      buttons.push(
        <Button key={totalPages} variant="outline" onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </Button>
      )
    }

    return buttons
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Explore Schools</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} schools found`}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
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

          <div className="flex gap-2">
            <Button
              onClick={() => handleSearch(1)}
            >
              Search
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        {loading ? "Loading..." : `Showing ${items.length} schools on page ${page} of ${totalPages}`}
      </div>

      <div>
        {loading ? (
          <div className="text-center py-8">Loading schools...</div>
        ) : items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((school: any, index: number) => (
              <Card 
                key={index} 
                className="p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50"
                onClick={() => onViewDetails(school.school_name)}
              >
                <h3 className="font-semibold text-lg">{school.school_name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{school.address}</p>
                
                <div className="flex gap-2 mt-3">
                  {school.mainlevel_code && (
                    <Badge variant="secondary">
                      {school.mainlevel_code}
                    </Badge>
                  )}
                  {school.zone_code && (
                    <Badge variant="outline">
                      {school.zone_code}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="text-muted-foreground space-y-2">
              <p>No schools found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          <Button 
            variant="outline" 
            disabled={page === 1} 
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          
          {renderPageButtons()}
          
          <Button 
            variant="outline" 
            disabled={page === totalPages} 
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}