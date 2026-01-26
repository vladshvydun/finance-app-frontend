import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

export const socket = io('http://localhost:3000')

type Transaction = {
  id: number
  amount: number
  type: 'income' | 'expense'
  category: string
  account: string
  date: string
}

function App() {
  const [activeTab, setActiveTab] = useState<'expense'|'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Інше')
  const [account, setAccount] = useState('Рахунок 1')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountsBalance, setAccountsBalance] = useState<Record<string,number>>({})
  const [categoriesBalance, setCategoriesBalance] = useState<Record<string,number>>({})
  const [balance, setBalance] = useState(0)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editAccount, setEditAccount] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [inlineErrors, setInlineErrors] = useState<Record<number, string>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [filterAccount, setFilterAccount] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)


  useEffect(()=>{
    socket.on('balance:update', (b:number)=>setBalance(b))
    socket.on('transactions:update', (t:Transaction[])=>setTransactions(t))
    socket.on('accounts:update', (ab)=>setAccountsBalance(ab))
    socket.on('categories:update', (cb)=>setCategoriesBalance(cb))

    fetch('http://localhost:3000/transactions')
      .then(r=>r.json())
      .then((t:Transaction[])=>{
        setTransactions(t)
        const b = t.reduce((sum,tr)=> tr.type==='income'? sum+Number(tr.amount):sum-Number(tr.amount),0)
        setBalance(b)
        const ab:Record<string,number>={}
        const cb:Record<string,number>={}
        t.forEach(tr=>{
          ab[tr.account] = (ab[tr.account]||0) + (tr.type==='income'?Number(tr.amount):-Number(tr.amount))
          cb[tr.category] = (cb[tr.category]||0) + (tr.type==='income'?Number(tr.amount):-Number(tr.amount))
        })
        setAccountsBalance(ab)
        setCategoriesBalance(cb)
      })

    return ()=>{
      socket.off('balance:update')
      socket.off('transactions:update')
      socket.off('accounts:update')
      socket.off('categories:update')
    }
  },[])

  const addTransaction = async ()=>{
    const num = Number(amount)
    if(!num) return
    await fetch('http://localhost:3000/transactions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({amount:num,type:activeTab,category,account})
    })
    setAmount('')
  }

  const startEdit = (tr: Transaction) => {
  setEditingId(tr.id)
  setEditAmount(String(tr.amount))
  setEditCategory(tr.category)
  setEditAccount(tr.account)
  setInlineErrors(prev => {
    const copy = { ...prev }
    delete copy[tr.id]
    return copy
  })
  }

  const saveEdit = async (id: number) => {
    const num = Number(editAmount)
    if (Number.isNaN(num)) return

    // Optimistic update: keep previous state for rollback
    const prev = transactions.slice()
    const updated = transactions.map(t =>
      t.id === id ? { ...t, amount: num, category: editCategory, account: editAccount } : t
    )
    setTransactions(updated)
    setSavingId(id)

    try {
      const res = await fetch(`http://localhost:3000/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num, category: editCategory, account: editAccount })
      })

      if (!res.ok) {
        // rollback on error, set inline error and show alert
        const text = await res.text()
        setTransactions(prev)
        const message = `Не вдалося зберегти: ${text || res.status}`
        setInlineErrors(prevErr => ({ ...prevErr, [id]: message }))
        alert(message)
        return
      }

      // success — clear editing state and any inline error
      setInlineErrors(prevErr => {
        const copy = { ...prevErr }
        delete copy[id]
        return copy
      })
      setEditingId(null)
    } catch (err) {
      setTransactions(prev)
      const message = `Помилка мережі при збереженні`
      setInlineErrors(prevErr => ({ ...prevErr, [id]: message }))
      alert(message)
      console.error('Save edit error', err)
    } finally {
      setSavingId(null)
    }
  }


  const accounts = ['Рахунок 1', 'Рахунок 2']
  .slice()
  .sort((a, b) => a.localeCompare(b, 'uk'))

  const allCategories = ['Інше', 'Реклама', 'Зарплата']
  .slice()
  .sort((a, b) => a.localeCompare(b, 'uk'))

  const categoriesByType =
   (activeTab === 'expense'
    ? ['Інше', 'Реклама']
    : ['Інше', 'Зарплата']
  )
    .slice()
    .sort((a, b) => a.localeCompare(b, 'uk'))

  const filteredTransactions = transactions
    .filter(t => (filterAccount ? t.account === filterAccount : true) && (filterCategory ? t.category === filterCategory : true))
    .slice()
    .reverse()

  return (
    <div className="app-container">
      <div className="header">
        <h1>Finance App</h1>
      </div>

      <div className="container">
        
        {/* Ліва колонка */}
        <div className="sidebar">
          <div className="left-column">

            <div className="sidebar-block">
              <h3>Баланс: {balance.toLocaleString()} ₴</h3>
            </div>

            <div className="sidebar-block">
              <h3>Мої рахунки</h3>
              <ul className="list">
                {accounts.map(a => (
                  <li key={a} className="list-item">
                    <div className="list-item-left">
                      <button
                        onClick={() => setFilterAccount(prev => (prev === a ? null : a))}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {a}:
                      </button>
                    </div>
                    <div className="list-item-right">{accountsBalance[a] || 0} ₴</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-block">
              <h3>Категорії</h3>
              <ul className="list">
                {allCategories.map(c => (
                  <li key={c} className="list-item">
                    <div className="list-item-left">
                      <button
                        onClick={() => setFilterCategory(prev => (prev === c ? null : c))}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {c}:
                      </button>
                    </div>
                    <div className="list-item-right">{categoriesBalance[c] || 0} ₴</div>
                  </li>
                ))}
              </ul>

            </div>

          </div>
        </div>

        {/* Права колонка */}
        <div className="content">
        <div className="tabs">
          <div className="tabs-header">
            <button 
              className={activeTab==='expense'?'active':'inactive'}
              onClick={()=>setActiveTab('expense')}
            >Витрати</button>
            <button
              className={activeTab==='income'?'active':'inactive'}
              onClick={()=>setActiveTab('income')}
            >Дохід</button>
          </div>

          <div className="tabs-content">
            <div className="tab-content-left-column">
              <div className="transaction-form">
                <div className="form-row">
                  <label>Рахунок:</label>
                  <select value={account} onChange={e=>setAccount(e.target.value)}>
                    {accounts.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="form-row">
                  <label>Категорія:</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)}>
                    {categoriesByType.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                </div>
              </div>
            </div>
            <div className="tab-content-right-column">
              <div className="form-row-summ">
                <div className="form-row tabs-summ">
                  <label>Сума:</label>
                  <input className="summ-input" type="text" value={amount} onChange={e=>setAmount(e.target.value)}/>
                </div>
                  
                  <button className="add-button" onClick={addTransaction}>Додати</button>
                </div>
            </div>
          </div>
          
        </div>

        <div className="transactions">
          <div className="filter-bar">
            {(filterAccount || filterCategory) ? (
              <>
                <strong>Фільтри:</strong>
                {filterAccount && (
                  <span className="filter-chip" onClick={() => setFilterAccount(null)}>Рахунок: {filterAccount} ✖</span>
                )}
                {filterCategory && (
                  <span className="filter-chip" onClick={() => setFilterCategory(null)}>Категорія: {filterCategory} ✖</span>
                )}
                <button className="linkish" onClick={() => { setFilterAccount(null); setFilterCategory(null); }}>Очистити</button>
              </>
            ) : (
              <div className="filter-help">Клікніть на рахунок або категорію в сайдбарі або в рядку транзакції, щоб відфільтрувати</div>
            )}
          </div>

          <h3>Останні записи</h3>

          <ul className="transactions-list">
            {filteredTransactions.map(tr => (
              <li
                key={tr.id}
                className={`transaction-row ${
                  tr.type === 'income' ? 'transaction-income' : 'transaction-expense'
                } ${editingId === tr.id ? 'transaction-row-edit' : ''}`}
              >
                <div className="col date">
                  {new Date(tr.date).toLocaleDateString()}
                </div>

                {editingId === tr.id ? (
                  <>
                    <div className="col account">
                      <select
                        value={editAccount}
                        onChange={e => setEditAccount(e.target.value)}
                      >
                        {accounts.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col category">
                      <select
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                      >
                        {allCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col amount">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                      />
                    </div>

                    <div className="col actions">
                      <button
                        onClick={() => saveEdit(tr.id)}
                        disabled={savingId === tr.id}
                        aria-label="Зберегти"
                      >
                        {savingId === tr.id ? '...' : <i className="fa-solid fa-check"></i>}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setInlineErrors(prev => {
                            const copy = { ...prev }
                            delete copy[tr.id]
                            return copy
                          })
                        }}
                        disabled={savingId === tr.id}
                        aria-label="Відмінити"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    {inlineErrors[tr.id] && (
                      <div className="inline-error" style={{ color: 'red', marginTop: 6 }}>
                        {inlineErrors[tr.id]}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="col account">{tr.account}</div>
                    <div className="col category">{tr.category}</div>
                    <div className="col amount">
                      {tr.type === 'income' ? '+' : '-'}
                      {Number(tr.amount).toLocaleString()} ₴

                      <button onClick={() => startEdit(tr)} aria-label="Редагувати">
                        <i className="fa-solid fa-pencil"></i>
                      </button>

                      <button
                        onClick={async () => {
                          const ok = window.confirm('Підтвердити видалення транзакції?')
                          if (!ok) return

                          // optimistic remove
                          const prev = transactions.slice()
                          setTransactions(transactions.filter(t => t.id !== tr.id))
                          setDeletingId(tr.id)

                          try {
                            const res = await fetch(`http://localhost:3000/transactions/${tr.id}`, {
                              method: 'DELETE'
                            })

                            if (!res.ok) {
                              setTransactions(prev)
                              const text = await res.text()
                              const message = `Не вдалося видалити: ${text || res.status}`
                              alert(message)
                              setInlineErrors(prevErr => ({ ...prevErr, [tr.id]: message }))
                            }
                          } catch (err) {
                            setTransactions(prev)
                            const message = 'Помилка мережі при видаленні'
                            alert(message)
                            setInlineErrors(prevErr => ({ ...prevErr, [tr.id]: message }))
                            console.error('Delete error', err)
                          } finally {
                            setDeletingId(null)
                          }
                        }}
                        disabled={deletingId === tr.id}
                        aria-label="Видалити"
                      >
                        {deletingId === tr.id ? '...' : <i className="fa-solid fa-xmark"></i>}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      </div>
      
    </div>
  )
}

export default App
