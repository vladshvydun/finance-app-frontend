import React from 'react'

interface CategoryFilterProps {
  showCategoryPicker: boolean
  setShowCategoryPicker: (show: boolean) => void
  filterCategories: string[]
  setFilterCategories: (categories: string[] | ((prev: string[]) => string[])) => void
  allCategories: string[]
}

export default function CategoryFilter({
  showCategoryPicker,
  setShowCategoryPicker,
  filterCategories,
  setFilterCategories,
  allCategories
}: CategoryFilterProps) {
  return (
    <div className="category-filter-dropdown">
      <button className="category-filter-btn" onClick={() => setShowCategoryPicker(!showCategoryPicker)}>
        <i className="fa-solid fa-filter"></i>
        Категорії
        {filterCategories.length > 0 && <span className="filter-badge">{filterCategories.length}</span>}
      </button>
      
      {showCategoryPicker && (
        <div className="category-filter-menu">
          <div className="category-filter-header">
            <span>Оберіть категорії</span>
            {filterCategories.length > 0 && (
              <button 
                className="clear-all-btn" 
                onClick={() => setFilterCategories([])}
              >
                Очистити
              </button>
            )}
          </div> 
          {allCategories.map(category => {
            const isSubcategory = category.includes(':')
            const displayName = isSubcategory 
              ? category.split(':')[1].trim()
              : category
            
            return (
              <label 
                key={category} 
                className="category-checkbox-item"
                style={isSubcategory ? { paddingLeft: '30px', fontSize: '13px' } : {}}
              >
                <input
                  type="checkbox"
                  checked={filterCategories.includes(category)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilterCategories(prev => [...prev, category])
                    } else {
                      setFilterCategories(prev => prev.filter(c => c !== category))
                    }
                  }}
                />
                <span>{displayName}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
