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
}

function BankIntegration({ onClose, accountsList }: BankIntegrationProps) {
  const [step, setStep] = useState<'token' | 'mapping' | 'import'>('token')
  const [token, setToken] = useState('')
  const [monobankAccounts, setMonobankAccounts] = useState<MonobankAccount[]>([])
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({})
  const [selectedLocalAccount, setSelectedLocalAccount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [importAccount, setImportAccount] = useState('')
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
          setStep('import')
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

  const saveIntegration = async () => {
    if (Object.keys(accountMapping).length === 0) {
      setError('Додайте хоча б один мапінг рахунків')
      return
    }

    setLoading(true)
    setError('')
    try {
      await saveBankIntegration(token, accountMapping)
      setStep('import')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importAccount || !dateFrom || !dateTo) {
      setError('Заповніть всі поля')
      return
    }

    const accountId = accountMapping[importAccount]
    if (!accountId) {
      setError('Рахунок не підключений')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await importMonobankTransactions(token, accountId, dateFrom, dateTo)
      alert(`Імпортовано: ${result.imported}, Пропущено (дублікати): ${result.skipped}`)
      setDateFrom('')
      setDateTo('')
    } catch (err: any) {
      setError(err.message)
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
            <p>Зв'яжіть ваші локальні рахунки з рахунками в Monobank</p>

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

              <button onClick={addMapping} className="secondary-btn">Додати зв'язок</button>
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

            <div className="step-buttons">
              <button onClick={() => setStep('token')} className="secondary-btn">Назад</button>
              <button onClick={saveIntegration} disabled={loading} className="primary-btn">
                {loading ? 'Збереження...' : 'Зберегти і продовжити'}
              </button>
            </div>
          </div>
        )}

        {step === 'import' && (
          <div className="step-content">
            <h3>Імпорт транзакцій</h3>
            <p>Оберіть рахунок та період для імпорту транзакцій</p>

            <div className="import-form">
              <div className="form-row-bank">
                <label>Рахунок:</label>
                <select value={importAccount} onChange={(e) => setImportAccount(e.target.value)}>
                  <option value="">Оберіть рахунок</option>
                  {Object.keys(accountMapping).map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              </div>

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

              <button onClick={handleImport} disabled={loading} className="primary-btn">
                {loading ? 'Імпорт...' : 'Імпортувати транзакції'}
              </button>
            </div>

            <div className="info-box">
              <p>💡 <strong>Важливо:</strong></p>
              <ul>
                <li>Максимальний період імпорту - 31 день</li>
                <li>Дублікати транзакцій автоматично пропускаються</li>
                <li>Категорії визначаються автоматично за MCC кодом</li>
              </ul>
            </div>

            <div className="step-buttons">
              <button onClick={() => setStep('mapping')} className="secondary-btn">Змінити підключення</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BankIntegration
