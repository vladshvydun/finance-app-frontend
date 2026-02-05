import React from 'react'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transactionType: 'income' | 'expense' | 'transfer'
  
  // Form state
  amount: string
  setAmount: (value: string) => void
  date: string
  setDate: (value: string) => void
  comment: string
  setComment: (value: string) => void
  
  // For income/expense
  account: string
  setAccount: (value: string) => void
  category: string
  setCategory: (value: string) => void
  
  // For transfer
  transferFrom: string
  setTransferFrom: (value: string) => void
  transferTo: string
  setTransferTo: (value: string) => void
  
  // Data
  accounts: string[]
  categories: string[]
  
  // Actions
  onAddTransaction: () => void
  onAddTransfer: () => void
  
  // Edit mode
  isEditMode?: boolean
  transactionId?: number | null
  onDelete?: () => void
  setType?: (type: 'income' | 'expense' | 'transfer') => void
  isSaving?: boolean
  isDeleting?: boolean
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  transactionType,
  amount,
  setAmount,
  date,
  setDate,
  comment,
  setComment,
  account,
  setAccount,
  category,
  setCategory,
  transferFrom,
  setTransferFrom,
  transferTo,
  setTransferTo,
  accounts,
  categories,
  onAddTransaction,
  onAddTransfer,
  isEditMode = false,
  transactionId,
  onDelete,
  setType,
  isSaving = false,
  isDeleting = false
}: AddTransactionModalProps) {
  
  if (!isOpen) return null

  const handleSubmit = () => {
    if (transactionType === 'transfer') {
      onAddTransfer()
    } else {
      onAddTransaction()
    }
    onClose()
  }

  const getTitle = () => {
    if (isEditMode) {
      return 'Редагувати транзакцію'
    }
    switch (transactionType) {
      case 'income': return 'Додати дохід'
      case 'expense': return 'Додати витрату'
      case 'transfer': return 'Додати переказ'
    }
  }

  const getButtonClass = () => {
    switch (transactionType) {
      case 'income': return 'btn-income'
      case 'expense': return 'btn-expense'
      case 'transfer': return 'btn-transfer'
    }
  }

  const getButtonText = () => {
    if (isEditMode) {
      return isSaving ? 'Збереження...' : 'Зберегти'
    }
    switch (transactionType) {
      case 'income': return 'Додати дохід'
      case 'expense': return 'Додати витрату'
      case 'transfer': return 'Додати переказ'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-transaction-modal" onClick={e => e.stopPropagation()}>
        <div className="add-transaction-modal-header">
          <h3>{getTitle()}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {isEditMode && setType && (
          <div className="transaction-type-tabs">
            <button 
              className={transactionType === 'expense' ? 'active' : ''}
              onClick={() => setType('expense')}
            >
              Витрати
            </button>
            <button 
              className={transactionType === 'income' ? 'active' : ''}
              onClick={() => setType('income')}
            >
              Дохід
            </button>
            <button 
              className={transactionType === 'transfer' ? 'active' : ''}
              onClick={() => setType('transfer')}
            >
              Переказ
            </button>
          </div>
        )}

        <div className="add-transaction-modal-content">
          {transactionType !== 'transfer' ? (
            <>
              <div className="form-group">
                <label>Рахунок:</label>
                <select value={account} onChange={e => setAccount(e.target.value)}>
                  {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Категорія:</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Сума:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  inputMode="decimal" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Дата:</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Коментар:</label>
                <input 
                  type="text" 
                  value={comment} 
                  onChange={e => setComment(e.target.value)} 
                  placeholder="Необов'язкове поле"
                />
              </div>

              {isEditMode && onDelete ? (
                <div className="add-transaction-modal-footer">
                  <button 
                    className="delete-transaction-btn"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Видалення...' : 'Видалити'}
                  </button>
                  <button 
                    className={`add-transaction-submit-btn ${getButtonClass()}`} 
                    onClick={handleSubmit}
                    disabled={isSaving}
                  >
                    {getButtonText()}
                  </button>
                </div>
              ) : (
                <button 
                  className={`add-transaction-submit-btn ${getButtonClass()}`} 
                  onClick={handleSubmit}
                >
                  {getButtonText()}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label>З рахунку:</label>
                <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)}>
                  {accounts.map(a => <option key={"from-" + a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>На рахунок:</label>
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                  {accounts.map(a => <option key={"to-" + a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Сума:</label>
                <input 
                  type="number" 
                  step="0.01" 
                  inputMode="decimal" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Дата:</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Коментар:</label>
                <input 
                  type="text" 
                  value={comment} 
                  onChange={e => setComment(e.target.value)} 
                  placeholder="Необов'язкове поле"
                />
              </div>

              {isEditMode && onDelete ? (
                <div className="add-transaction-modal-footer">
                  <button 
                    className="delete-transaction-btn"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Видалення...' : 'Видалити'}
                  </button>
                  <button 
                    className={`add-transaction-submit-btn ${getButtonClass()}`} 
                    onClick={handleSubmit}
                    disabled={isSaving}
                  >
                    {getButtonText()}
                  </button>
                </div>
              ) : (
                <button 
                  className={`add-transaction-submit-btn ${getButtonClass()}`} 
                  onClick={handleSubmit}
                >
                  {getButtonText()}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
