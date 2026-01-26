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
  const [filterAccounts, setFilterAccounts] = useState<string[]>([])
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [accountsList, setAccountsList] = useState<string[]>(['Рахунок 1', 'Рахунок 2'])
  const [allCategoriesList, setAllCategoriesList] = useState<string[]>(['Інше', 'Реклама', 'Зарплата'])

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'category'|'account'>('category')
  const [newName, setNewName] = useState('')
  const [newStartBalance, setNewStartBalance] = useState('0')
  const [showManageModal, setShowManageModal] = useState(false)
  const [manageType, setManageType] = useState<'category'|'account'>('category')
  const [manageList, setManageList] = useState<string[]>([])
  const [manageEditing, setManageEditing] = useState<string | null>(null)
  const [manageTempName, setManageTempName] = useState('')
  const [manageTempStart, setManageTempStart] = useState('0')

  const openModal = (type: 'category'|'account') => {
    setModalType(type)
    setNewName('')
    setNewStartBalance('0')
    setShowModal(true)
  }

  const openManage = (type: 'category'|'account') => {
    setManageType(type)
    setManageList(type === 'account' ? accountsList.slice() : allCategoriesList.slice())
    setManageEditing(null)
    setShowManageModal(true)
  }

  const closeManage = () => setShowManageModal(false)

  const closeModal = () => setShowModal(false)

  const createNew = async () => {
    const name = newName.trim()
    const start = Number(newStartBalance) || 0
    if (!name) return alert('Введіть назву')

    if (modalType === 'account') {
      if (accountsList.includes(name)) return alert('Такий рахунок вже існує')

      // optimistic update
      const prevList = accountsList.slice()
      const prevBalances = { ...accountsBalance }
      setAccountsList(prev => [...prev, name])
      setAccountsBalance(prev => ({ ...prev, [name]: (prev[name] || 0) + start }))
      setFilterAccounts(prev => prev.includes(name) ? prev : [...prev, name])
      setShowModal(false)

      try {
        const res = await fetch('http://localhost:3000/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, start })
        })

        if (!res.ok) {
          setAccountsList(prevList)
          setAccountsBalance(prevBalances)
          const text = await res.text()
          alert(`Не вдалося створити рахунок: ${text || res.status}`)
        } else {
          const data = await res.json()
          if (data.accounts) setAccountsList(data.accounts)
        }
      } catch (err) {
        setAccountsList(prevList)
        setAccountsBalance(prevBalances)
        alert('Помилка мережі при створенні рахунку')
        console.error(err)
      }

      return
    }

    // category
    if (allCategoriesList.includes(name)) return alert('Така категорія вже існує')

    const prevCatList = allCategoriesList.slice()
    const prevCatBalances = { ...categoriesBalance }
    setAllCategoriesList(prev => [...prev, name])
    setCategoriesBalance(prev => ({ ...prev, [name]: (prev[name] || 0) + start }))
    setFilterCategories(prev => prev.includes(name) ? prev : [...prev, name])
    setShowModal(false)

    try {
      const res = await fetch('http://localhost:3000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start })
      })

      if (!res.ok) {
        setAllCategoriesList(prevCatList)
        setCategoriesBalance(prevCatBalances)
        const text = await res.text()
        alert(`Не вдалося створити категорію: ${text || res.status}`)
      } else {
        const data = await res.json()
        if (data.categories) setAllCategoriesList(data.categories)
      }
    } catch (err) {
      setAllCategoriesList(prevCatList)
      setCategoriesBalance(prevCatBalances)
      alert('Помилка мережі при створенні категорії')
      console.error(err)
    }
  }

  const startManageEdit = (item: string) => {
    setManageEditing(item)
    setManageTempName(item)
    const startVal = manageType === 'account' ? (accountsBalance[item] || 0) : (categoriesBalance[item] || 0)
    setManageTempStart(String(startVal))
  }

  const cancelManageEdit = () => {
    setManageEditing(null)
    setManageTempName('')
    setManageTempStart('0')
  }

  const saveManageEdit = async (oldName: string) => {
    const newNameVal = manageTempName.trim()
    const start = Number(manageTempStart) || 0
    if (!newNameVal) return alert('Введіть назву')

    // optimistic
    const prevList = manageList.slice()
    const prevAccounts = accountsList.slice()
    const prevCategories = allCategoriesList.slice()
    const prevAccBal = { ...accountsBalance }
    const prevCatBal = { ...categoriesBalance }

    if (manageType === 'account') {
      setAccountsList(prev => prev.map(p => p === oldName ? newNameVal : p))
      setAccountsBalance(prev => ({ ...prev, [newNameVal]: (prev[newNameVal] || 0) + start, [oldName]: undefined }))
    } else {
      setAllCategoriesList(prev => prev.map(p => p === oldName ? newNameVal : p))
      setCategoriesBalance(prev => ({ ...prev, [newNameVal]: (prev[newNameVal] || 0) + start, [oldName]: undefined }))
    }
    setManageEditing(null)

    try {
      const endpoint = manageType === 'account' ? `http://localhost:3000/accounts/${encodeURIComponent(oldName)}` : `http://localhost:3000/categories/${encodeURIComponent(oldName)}`
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newNameVal, start })
      })

      if (!res.ok) {
        // rollback
        setAccountsList(prevAccounts)
        setAllCategoriesList(prevCategories)
        setAccountsBalance(prevAccBal)
        setCategoriesBalance(prevCatBal)
        const text = await res.text()
        alert(`Не вдалося зберегти: ${text || res.status}`)
      } else {
        const data = await res.json()
        if (data.accounts) setAccountsList(data.accounts)
        if (data.categories) setAllCategoriesList(data.categories)
      }
    } catch (err) {
      setAccountsList(prevAccounts)
      setAllCategoriesList(prevCategories)
      setAccountsBalance(prevAccBal)
      setCategoriesBalance(prevCatBal)
      alert('Помилка мережі при збереженні')
      console.error(err)
    }
  }

  const deleteManageItem = async (name: string) => {
    // compute related transactions count and total amount
    const related = transactions.filter(t => (manageType === 'account' ? t.account === name : t.category === name))
    const count = related.length
    const sum = related.reduce((s, tr) => s + Number(tr.amount), 0)
    const msg = `Ви впевнені що хочете видалити "${name}" разом з ${count} транзакц${count===1? 'ією':'іями'} на суму ${sum.toLocaleString()} ₴?`
    const ok = window.confirm(msg)
    if (!ok) return

    const prevList = manageList.slice()
    const prevAccounts = accountsList.slice()
    const prevCategories = allCategoriesList.slice()
    const prevAccBal = { ...accountsBalance }
    const prevCatBal = { ...categoriesBalance }

    // optimistic remove
    if (manageType === 'account') {
      setAccountsList(prev => prev.filter(p => p !== name))
      setAccountsBalance(prev => { const copy = { ...prev }; delete copy[name]; return copy })
      setFilterAccounts(prev => prev.filter(x => x !== name))
    } else {
      setAllCategoriesList(prev => prev.filter(p => p !== name))
      setCategoriesBalance(prev => { const copy = { ...prev }; delete copy[name]; return copy })
      setFilterCategories(prev => prev.filter(x => x !== name))
    }

    try {
      const endpoint = manageType === 'account' ? `http://localhost:3000/accounts/${encodeURIComponent(name)}` : `http://localhost:3000/categories/${encodeURIComponent(name)}`
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) {
        // rollback
        setAccountsList(prevAccounts)
        setAllCategoriesList(prevCategories)
        setAccountsBalance(prevAccBal)
        setCategoriesBalance(prevCatBal)
        const text = await res.text()
        alert(`Не вдалося видалити: ${text || res.status}`)
      } else {
        const data = await res.json()
        if (data.accounts) setAccountsList(data.accounts)
        if (data.categories) setAllCategoriesList(data.categories)
      }
    } catch (err) {
      setAccountsList(prevAccounts)
      setAllCategoriesList(prevCategories)
      setAccountsBalance(prevAccBal)
      setCategoriesBalance(prevCatBal)
      alert('Помилка мережі при видаленні')
      console.error(err)
    }
  }


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
        // load persistent accounts/categories from backend
        fetch('http://localhost:3000/accounts')
          .then(r => r.json())
          .then((a: string[]) => setAccountsList(a))
          .catch(() => {})

        fetch('http://localhost:3000/categories')
          .then(r => r.json())
          .then((c: string[]) => setAllCategoriesList(c))
          .catch(() => {})
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


  const accounts = accountsList.slice().sort((a, b) => a.localeCompare(b, 'uk'))

  const allCategories = allCategoriesList.slice().sort((a, b) => a.localeCompare(b, 'uk'))

  const categoriesByType = allCategories.slice()

  const filteredTransactions = transactions
    .filter(t => (filterAccounts.length ? filterAccounts.includes(t.account) : true) && (filterCategories.length ? filterCategories.includes(t.category) : true))
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
               <div className="sidebar-block-header">

                  <h3>Мої рахунки</h3>

                  <div className="sidebar-block-header-edit-buttons">
                    <button className="add-btn" onClick={() => openModal('account')} aria-label="Додати рахунок">
                      <i className="fa-solid fa-plus"></i>
                    </button>
                    <button className="manage-btn" onClick={() => openManage('account')} aria-label="Керувати рахунками">
                      <i className="fa-regular fa-pen-to-square"></i>
                    </button>
                  </div>

                </div>

              <ul className="list">
                {accounts.map(a => (
                  <li
                    key={a}
                    className="list-item"
                    onClick={() => setFilterAccounts(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-item-left">
                      <button
                        onClick={(e) => { e.stopPropagation(); setFilterAccounts(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]); }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {a}:
                      </button>
                    </div>
                    <div className="list-item-right" onClick={(e) => e.stopPropagation()}>{accountsBalance[a] || 0} ₴</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-block">
              <div className="sidebar-block-header">

                  <h3>Категорії</h3>

                  <div className="sidebar-block-header-edit-buttons">
                    <button className="add-btn" onClick={() => openModal('category')} aria-label="Додати категорію">
                      <i className="fa-solid fa-plus"></i>
                    </button>
                    <button className="manage-btn" onClick={() => openManage('category')} aria-label="Керувати категоріями">
                      <i className="fa-regular fa-pen-to-square"></i>
                    </button>
                  </div>

                </div>

              <ul className="list">
                {allCategories.map(c => (
                  <li
                    key={c}
                    className="list-item"
                    onClick={() => setFilterCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-item-left">
                      <button
                        onClick={(e) => { e.stopPropagation(); setFilterCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]); }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {c}:
                      </button>
                    </div>
                    <div className="list-item-right" onClick={(e) => e.stopPropagation()}>{categoriesBalance[c] || 0} ₴</div>
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
            {(filterAccounts.length || filterCategories.length) ? (
              <>
                <strong>Фільтри:</strong>
                {filterAccounts.map(a => (
                  <span key={"acc-"+a} className="filter-chip" onClick={() => setFilterAccounts(prev => prev.filter(x => x !== a))}>Рахунок: {a} ✖</span>
                ))}
                {filterCategories.map(c => (
                  <span key={"cat-"+c} className="filter-chip" onClick={() => setFilterCategories(prev => prev.filter(x => x !== c))}>Категорія: {c} ✖</span>
                ))}
                <button className="linkish" onClick={() => { setFilterAccounts([]); setFilterCategories([]); }}>Очистити</button>
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

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{modalType === 'category' ? 'Створити нову категорію' : 'Створити новий рахунок'}</h3>
              <div className="form-row">
                <label>Назва:</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Стартовий баланс:</label>
                <input type="number" value={newStartBalance} onChange={e => setNewStartBalance(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={closeModal}>Скасувати</button>
                <button onClick={createNew}>Створити</button>
              </div>
            </div>
          </div>
        )}
        {showManageModal && (
          <div className="modal-overlay" onClick={closeManage}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{manageType === 'account' ? 'Керування рахунками' : 'Керування категоріями'}</h3>
              <div className="manage-list">
                { (manageType === 'account' ? accountsList : allCategoriesList).map(item => (
                  <div key={item} className="manage-row">
                    {manageEditing === item ? (
                      <>
                        <input value={manageTempName} onChange={e => setManageTempName(e.target.value)} />
                        <input type="number" value={manageTempStart} onChange={e => setManageTempStart(e.target.value)} style={{ width: 110 }} />
                        <div className="manage-actions">
                          <button onClick={() => saveManageEdit(item)}><i className="fa-solid fa-check"></i></button>
                          <button onClick={cancelManageEdit}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="manage-name">{item}</div>
                        <div className="manage-actions">
                          <button onClick={() => { setManageType(manageType); startManageEdit(item) }} aria-label="Редагувати"><i className="fa-solid fa-pen"></i></button>
                          <button onClick={() => deleteManageItem(item)} aria-label="Видалити"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={closeManage}>Закрити</button>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>
      
    </div>
  )
}

export default App
