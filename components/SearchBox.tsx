import React from 'react'

interface SearchBoxProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export default function SearchBox({ searchQuery, setSearchQuery }: SearchBoxProps) {
  return (
    <div className="search-box">
      <i className="fa-solid fa-magnifying-glass"></i>
      <input 
        type="text" 
        placeholder="Пошук по сумі або коментарю..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button 
          className="clear-search-btn" 
          onClick={() => setSearchQuery('')}
          title="Очистити"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      )}
    </div>
  )
}
