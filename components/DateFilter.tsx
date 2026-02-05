import React from 'react'

interface DateFilterProps {
  dateFilterType: string
  setDateFilterType: (type: string) => void
  showDatePicker: boolean
  setShowDatePicker: (show: boolean) => void
  customDateFrom: string
  setCustomDateFrom: (date: string) => void
  customDateTo: string
  setCustomDateTo: (date: string) => void
}

export default function DateFilter({
  dateFilterType,
  setDateFilterType,
  showDatePicker,
  setShowDatePicker,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo
}: DateFilterProps) {
  return (
    <div className="date-filter-dropdown">
      <button className="date-filter-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
        {dateFilterType === 'all' && 'За весь час'}
        {dateFilterType === 'today' && 'За сьогодні'}
        {dateFilterType === 'yesterday' && 'За вчора'}
        {dateFilterType === 'current_week' && 'За поточний тиждень'}
        {dateFilterType === 'last_week' && 'За минулий тиждень'}
        {dateFilterType === 'current_year' && 'За поточний рік'}
        {dateFilterType === 'last_year' && 'За минулий рік'}
        {dateFilterType === 'custom' && `${customDateFrom} - ${customDateTo}`}
        <i className="fa-solid fa-chevron-down"></i>
      </button>
      
      {showDatePicker && (
        <div className="date-filter-menu">
          <button onClick={() => { setDateFilterType('all'); setShowDatePicker(false); }}>За весь час</button>
          <button onClick={() => { setDateFilterType('today'); setShowDatePicker(false); }}>За сьогодні</button>
          <button onClick={() => { setDateFilterType('yesterday'); setShowDatePicker(false); }}>За вчора</button>
          <button onClick={() => { setDateFilterType('current_week'); setShowDatePicker(false); }}>За поточний тиждень</button>
          <button onClick={() => { setDateFilterType('last_week'); setShowDatePicker(false); }}>За минулий тиждень</button>
          <button onClick={() => { setDateFilterType('current_year'); setShowDatePicker(false); }}>За поточний рік</button>
          <button onClick={() => { setDateFilterType('last_year'); setShowDatePicker(false); }}>За минулий рік</button>
          <div className="custom-date-range">
            <label>Обрати дати:</label>
            <input 
              type="date" 
              value={customDateFrom} 
              onChange={(e) => setCustomDateFrom(e.target.value)}
              placeholder="Від"
            />
            <input 
              type="date" 
              value={customDateTo} 
              onChange={(e) => setCustomDateTo(e.target.value)}
              placeholder="До"
            />
            <button 
              onClick={() => { 
                if (customDateFrom && customDateTo) {
                  setDateFilterType('custom'); 
                  setShowDatePicker(false); 
                }
              }}
              disabled={!customDateFrom || !customDateTo}
            >
              Застосувати
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
