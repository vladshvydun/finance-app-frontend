import { useState, useEffect } from 'react'
import './BankIntegration.css'
import type { MonobankAccount } from './api/monobank'
import {
  getMonobankAccounts,
  saveBankIntegration,
  getBankIntegration,
  importMonobankTransactions
} from './api/monobank'

interface BankIntegrationProps {
  onClose: () => void
  accountsList: string[]
  lastMonobankSync: string | null
}

function BankIntegration({ onClose, accountsList, lastMonobankSync }: BankIntegrationProps) {
  const [step, setStep] = useState<'token' | 'mapping'>('token')
  const [token, setToken] = useState('')
  const [monobankAccounts, setMonobankAccounts] = useState<MonobankAccount[]>([])
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({})
  const [selectedLocalAccount, setSelectedLocalAccount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Завантажуємо збережену інтеграцію
  useEffect(() => {
    getBankIntegration()
      .then(data => {
        if (data && data.token) {
          setToken(data.token)
          setAccountMapping(data.account_mapping)
          setStep('mapping')
          loadMonobankAccounts(data.token)
        }
      })
      .catch(() => {})
  }, [])

  const loadMonobankAccounts = async (tokenValue: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await getMonobankAccounts(tokenValue)
      setMonobankAccounts(data.accounts || [])
      setStep('mapping')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTokenSubmit = () => {
    if (!token.trim()) {
      setError('Введіть токен')
      return
    }
    loadMonobankAccounts(token)
  }

  const addMapping = () => {
    if (!selectedLocalAccount || !selectedBankAccount) {
      setError('Оберіть обидва рахунки')
      return
    }
    setAccountMapping(prev => ({
      ...prev,
      [selectedLocalAccount]: selectedBankAccount
    }))
    setSelectedLocalAccount('')
    setSelectedBankAccount('')
    setError('')
  }

  const removeMapping = (localAccount: string) => {
    setAccountMapping(prev => {
      const copy = { ...prev }
      delete copy[localAccount]
      return copy
    })
  }

  const handleImport = async () => {
    if (!selectedLocalAccount || !selectedBankAccount) {
      setError('Оберіть обидва рахунки')
      return
    }
    if (!dateFrom) {
      setError('Оберіть початкову дату для імпорту')
      return
    }

    // Якщо кінцева дата не вказана, використовуємо сьогоднішню
    const finalDateTo = dateTo || new Date().toISOString().split('T')[0]

    setLoading(true)
    setError('')
    try {
      // Спочатку зберігаємо підключення
      const newMapping = {
        ...accountMapping,
        [selectedLocalAccount]: selectedBankAccount
      }
      await saveBankIntegration(token, newMapping)
      setAccountMapping(newMapping)

      // Розбиваємо період на частини по 31 день (обмеження API Monobank)
      const startDate = new Date(dateFrom)
      const endDate = new Date(finalDateTo)
      const periods: Array<{ from: string; to: string }> = []
      
      let currentStart = new Date(startDate)
      while (currentStart < endDate) {
        const currentEnd = new Date(currentStart)
        currentEnd.setDate(currentEnd.getDate() + 30) // 31 день включно
        
        if (currentEnd > endDate) {
          currentEnd.setTime(endDate.getTime())
        }
        
        periods.push({
          from: currentStart.toISOString().split('T')[0],
          to: currentEnd.toISOString().split('T')[0]
        })
        
        currentStart.setDate(currentEnd.getDate() + 1)
      }

      // Імпортуємо транзакції для кожного періоду
      let totalImported = 0
      let totalSkipped = 0
      
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i]
        
        // Додаємо затримку 60 секунд між запитами (обмеження API Monobank)
        if (i > 0) {
          setError(`Очікування 60 секунд перед наступним запитом (${i}/${periods.length})...`)
          await new Promise(resolve => setTimeout(resolve, 60000))
        }
        
        setError(`Імпорт періоду ${i + 1}/${periods.length}: ${period.from} - ${period.to}`)
        const result = await importMonobankTransactions(token, selectedBankAccount, period.from, period.to)
        totalImported += result.imported
        totalSkipped += result.skipped
      }
      
      setError('')
      
      alert(`Рахунок підключено!\nІмпортовано: ${totalImported}, Пропущено (дублікати): ${totalSkipped}`)
      
      // Скидаємо поля форми
      setSelectedLocalAccount('')
      setSelectedBankAccount('')
      setDateFrom('')
      setDateTo('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteIntegration = async () => {
    const shouldConfirm = Object.keys(accountMapping).length > 0
    
    if (shouldConfirm && !confirm('Ви впевнені, що хочете видалити інтеграцію з Monobank?')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3000/bank-integrations', {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        throw new Error('Не вдалося видалити інтеграцію')
      }

      // Скидаємо стан до початкового
      setToken('')
      setMonobankAccounts([])
      setAccountMapping({})
      setStep('token')
      
      if (shouldConfirm) {
        alert('Інтеграцію успішно видалено')
      }
    } catch (err: any) {
      setError(err.message || 'Помилка при видаленні інтеграції')
    } finally {
      setLoading(false)
    }
  }

  const getCurrencySymbol = (code: number) => {
    if (code === 980) return '₴'
    if (code === 840) return '$'
    if (code === 978) return '€'
    return ''
  }

  const formatBalance = (balance: number, currencyCode: number) => {
    return `${(balance / 100).toFixed(2)} ${getCurrencySymbol(currencyCode)}`
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-bank" onClick={(e) => e.stopPropagation()}>
        <div className="bank-header">
          <h2>Інтеграція з Monobank</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {lastMonobankSync && (
          <div className="monobank-sync-info">
            <i className="fa-solid fa-clock"></i>
            <span>Останнє оновлення:</span>
            <span className="sync-time">
              {new Date(lastMonobankSync).toLocaleString('uk', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {step === 'token' && (
          <div className="step-content">
            <p>Отримайте персональний токен на <a href="https://api.monobank.ua/" target="_blank" rel="noopener noreferrer">api.monobank.ua</a></p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Вставте токен тут"
              className="token-input"
            />
            <button onClick={handleTokenSubmit} disabled={loading} className="primary-btn">
              {loading ? 'Завантаження...' : 'Далі'}
            </button>
          </div>
        )}

        {step === 'mapping' && (
          <div className="step-content">
            <h3>Підключення рахунків</h3>
            <p>Оберіть рахунки та період для імпорту транзакцій</p>

            <div className="mapping-form">
              <div className="form-row-bank">
                <label>Локальний рахунок:</label>
                <select value={selectedLocalAccount} onChange={(e) => setSelectedLocalAccount(e.target.value)}>
                  <option value="">Оберіть рахунок</option>
                  {accountsList
                    .filter(acc => !accountMapping[acc])
                    .map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))
                  }
                </select>
              </div>

              <div className="form-row-bank">
                <label>Рахунок Monobank:</label>
                <select value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)}>
                  <option value="">Оберіть рахунок</option>
                  {monobankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.maskedPan[0] || acc.iban} - {formatBalance(acc.balance, acc.currencyCode)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBankAccount && (
                <>
                  <div className="form-row-bank">
                    <label>Від (дата):</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-row-bank">
                    <label>До (дата):</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </>
              )}

              <button onClick={handleImport} disabled={loading} className="primary-btn">
                {loading ? 'Імпорт...' : 'Імпортувати'}
              </button>
            </div>

            {Object.keys(accountMapping).length > 0 && (
              <div className="mappings-list">
                <h4>Підключені рахунки:</h4>
                {Object.entries(accountMapping).map(([local, bank]) => {
                  const bankAcc = monobankAccounts.find(a => a.id === bank)
                  return (
                    <div key={local} className="mapping-item">
                      <span>{local} → {bankAcc?.maskedPan[0] || bank}</span>
                      <button onClick={() => removeMapping(local)} className="remove-btn">×</button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="info-box">
              <p>💡 <strong>Важливо:</strong></p>
              <ul>
                <li>Для періодів більше 31 дня імпорт відбувається частинами (автоматично)</li>
                <li>Дублікати транзакцій автоматично пропускаються</li>
                <li>Категорії визначаються автоматично за MCC кодом</li>
              </ul>
            </div>

            <div className="step-buttons">
              <button onClick={() => setStep('token')} className="secondary-btn">Назад</button>
              {Object.keys(accountMapping).length > 0 && (
                <button onClick={deleteIntegration} disabled={loading} className="delete-integration-btn">
                  {loading ? 'Видалення...' : 'Видалити інтеграцію'}
                </button>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

export default BankIntegration
