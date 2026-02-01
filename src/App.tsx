import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import BankIntegration from './BankIntegration'
import AutoRules from './AutoRules'

export const socket = io('http://localhost:3000')

type Transaction = {
  id: number
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  account: string
  from_account?: string | null
  to_account?: string | null
  date: string
  comment?: string
}

function App() {
  const [activeTab, setActiveTab] = useState<'expense'|'income'|'transfer'>('expense')
  const [amount, setAmount] = useState('')
  const todayStr = new Date().toISOString().slice(0,10)
  const [date, setDate] = useState<string>(todayStr)
  const [category, setCategory] = useState('Інше')
  const [account, setAccount] = useState('Рахунок 1')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [comment, setComment] = useState('')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountsBalance, setAccountsBalance] = useState<Record<string,number>>({})
  const [categoriesBalance, setCategoriesBalance] = useState<Record<string,number>>({})
  const [balance, setBalance] = useState(0)

  // Pagination & Infinity Scroll
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)

  // Масове видалення
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Час останньої синхронізації Monobank
  const [lastMonobankSync, setLastMonobankSync] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDate, setEditDate] = useState<string>('')
  const [editAccount, setEditAccount] = useState('')
  const [editType, setEditType] = useState<'income'|'expense'|'transfer'>('expense')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTransferFrom, setEditTransferFrom] = useState<string>('')
  const [editTransferTo, setEditTransferTo] = useState<string>('')
  const [editComment, setEditComment] = useState('')
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
  const [showBankIntegration, setShowBankIntegration] = useState(false)
  const [showAutoRules, setShowAutoRules] = useState(false)
  
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
    const prevAccounts = accountsList.slice()
    const prevCategories = allCategoriesList.slice()
    const prevAccBal = { ...accountsBalance }
    const prevCatBal = { ...categoriesBalance }

    if (manageType === 'account') {
      setAccountsList(prev => prev.map(p => p === oldName ? newNameVal : p))
      setAccountsBalance(prev => {
        const copy = { ...prev }
        copy[newNameVal] = (copy[newNameVal] || 0) + start
        delete copy[oldName]
        return copy
      })
    } else {
      setAllCategoriesList(prev => prev.map(p => p === oldName ? newNameVal : p))
      setCategoriesBalance(prev => {
        const copy = { ...prev }
        copy[newNameVal] = (copy[newNameVal] || 0) + start
        delete copy[oldName]
        return copy
      })
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
    const related = transactions.filter(t => {
      if (manageType === 'account') {
        if (t.type === 'transfer') {
          return t.from_account === name || t.to_account === name || t.account === name
        }
        return t.account === name
      }
      return t.category === name
    })
    const count = related.length
    const sum = related.reduce((s, tr) => s + Number(tr.amount), 0)
    const msg = `Ви впевнені що хочете видалити "${name}" разом з ${count} транзакц${count===1? 'ією':'іями'} на суму ${formatMoney(sum)} ₴?`
    const ok = window.confirm(msg)
    if (!ok) return

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
    socket.on('transactions:update', ()=>{
      // При оновленні через Socket.IO - перезавантажуємо транзакції з сервера
      fetch('http://localhost:3000/transactions?limit=20&offset=0')
        .then(r=>r.json())
        .then((data: { transactions: Transaction[], total: number, hasMore: boolean })=>{
          setTransactions(data.transactions)
          setTotal(data.total)
          setHasMore(data.hasMore)
          setOffset(20)
        })
        .catch(err => console.error('Failed to reload transactions:', err))
    })
    socket.on('accounts:update', (ab)=>setAccountsBalance(ab))
    socket.on('categories:update', (cb)=>setCategoriesBalance(cb))
    socket.on('monobank:last-sync', (time: string) => setLastMonobankSync(time))

    fetch('http://localhost:3000/transactions?limit=20&offset=0')
      .then(r=>r.json())
      .then((data: { transactions: Transaction[], total: number, hasMore: boolean })=>{
        setTransactions(data.transactions)
        setTotal(data.total)
        setHasMore(data.hasMore)
        setOffset(20)

        // Завантажуємо баланси окремо (враховують ВСІ транзакції)
        fetch('http://localhost:3000/balances')
          .then(r => r.json())
          .then((balances: { balance: number, accountsBalance: Record<string,number>, categoriesBalance: Record<string,number> }) => {
            setBalance(balances.balance)
            setAccountsBalance(balances.accountsBalance)
            setCategoriesBalance(balances.categoriesBalance)
          })
          .catch(() => {})
        
        // load persistent accounts/categories from backend
        fetch('http://localhost:3000/accounts')
          .then(r => r.json())
          .then((a: string[]) => setAccountsList(a))
          .catch(() => {})

        fetch('http://localhost:3000/categories')
          .then(r => r.json())
          .then((c: string[]) => setAllCategoriesList(c))
          .catch(() => {})
        
        // Завантажуємо час останньої синхронізації Monobank
        fetch('http://localhost:3000/monobank/last-sync')
          .then(r => r.json())
          .then((data: { lastSync: string | null }) => setLastMonobankSync(data.lastSync))
          .catch(() => {})
      })

    return ()=>{
      socket.off('balance:update')
      socket.off('transactions:update')
      socket.off('accounts:update')
      socket.off('categories:update')
      socket.off('monobank:last-sync')
    }
  },[])

  // ensure transfer selects default to available accounts
  useEffect(() => {
    if (accountsList.length > 0) {
      setAccount(prev => accountsList.includes(prev) ? prev : accountsList[0])
      setTransferFrom(prev => prev && accountsList.includes(prev) ? prev : accountsList[0])
      setTransferTo(prev => prev && accountsList.includes(prev) ? prev : (accountsList[1] || accountsList[0]))
    }
  }, [accountsList])

  // Infinity scroll - завантаження наступних транзакцій
  const loadMoreTransactions = async () => {
    // Не завантажуємо якщо offset=0 (initial fetch ще не завершився) або немає більше даних
    if (!hasMore || loadingMore || offset === 0) return
    
    setLoadingMore(true)
    try {
      const response = await fetch(`http://localhost:3000/transactions?limit=20&offset=${offset}`)
      const data: { transactions: Transaction[], total: number, hasMore: boolean } = await response.json()
      
      setTransactions(prev => [...prev, ...data.transactions])
      setOffset(prev => prev + 20)
      setHasMore(data.hasMore)
      setTotal(data.total)
    } catch (err) {
      console.error('Помилка завантаження транзакцій:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // Інтерсекція для infinity scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreTransactions()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById('scroll-sentinel')
    if (sentinel) observer.observe(sentinel)

    return () => {
      if (sentinel) observer.unobserve(sentinel)
    }
  }, [hasMore, loadingMore, offset])

  // Масове видалення
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Видалити ${selectedIds.size} транзакцій?`)) return

    try {
      await fetch('http://localhost:3000/transactions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      
      setSelectedIds(new Set())
      // Перезавантажуємо перші 20 транзакцій
      const response = await fetch('http://localhost:3000/transactions?limit=20&offset=0')
      const data: { transactions: Transaction[], total: number, hasMore: boolean } = await response.json()
      setTransactions(data.transactions)
      setTotal(data.total)
      setHasMore(data.hasMore)
      setOffset(20)
    } catch (err) {
      alert('Помилка при видаленні')
      console.error(err)
    }
  }

  // Переключення виділення транзакції
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Виділити всі / зняти виділення
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  const addTransaction = async ()=>{
    const parsed = String(amount).replace(',', '.')
    let num = parseFloat(parsed)
    if (Number.isNaN(num) || num <= 0) return
    num = Math.round(num * 100) / 100
    await fetch('http://localhost:3000/transactions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({amount: num, type:activeTab, category, account, date, comment})
    })
    setAmount('')
    setDate(todayStr)
    setComment('')
  }

  const addTransfer = async () => {
    const parsed = String(amount).replace(',', '.')
    let num = parseFloat(parsed)
    if (Number.isNaN(num) || num <= 0) return alert('Введіть коректну суму')
    num = Math.round(num * 100) / 100
    if (!transferFrom || !transferTo) return alert('Оберіть рахунки')
    if (transferFrom === transferTo) return alert('Оберіть різні рахунки')

    try {
      const res = await fetch('http://localhost:3000/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num, from: transferFrom, to: transferTo, date, comment })
      })

      if (!res.ok) {
        const text = await res.text()
        alert(`Помилка при виконанні переказу: ${text || res.status}`)
      } else {
        setAmount('')
        setDate(todayStr)
        setComment('')
      }
    } catch (err) {
      alert('Помилка мережі при переказі')
      console.error('Transfer error', err)
    }
  }

  const startEdit = (tr: Transaction) => {
  setEditingId(tr.id)
  setEditAmount(String(tr.amount))
  setEditCategory(tr.category)
  setEditAccount(tr.account)
  setEditComment(tr.comment || '')
  // use local date parts to avoid timezone shift
  try {
    const d = new Date(tr.date)
    const localDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    setEditDate(localDateStr || todayStr)
  } catch (e) {
    setEditDate(todayStr)
  }
  if (tr.type === 'transfer') {
    setEditType('transfer')
    setEditTransferFrom(tr.from_account || tr.account || '')
    setEditTransferTo(tr.to_account || '')
    // Встановлюємо категорію 'Переказ' для переказу
    setEditCategory('Переказ')
    setEditAccount(tr.from_account || tr.account || '')
  } else {
    setEditType(tr.type)
    // Встановлюємо дефолтні значення для переказу на випадок зміни типу
    setEditTransferFrom(tr.account || accountsList[0] || '')
    setEditTransferTo(accountsList.find(a => a !== tr.account) || accountsList[1] || accountsList[0] || '')
    setEditAccount(tr.account)
    setEditCategory(tr.category || allCategoriesList[0] || 'Інше')
  }
  setInlineErrors(prev => {
    const copy = { ...prev }
    delete copy[tr.id]
    return copy
  })
  setShowEditModal(true)
  }

  const saveEdit = async (id: number) => {
    const num = Number(editAmount)
    if (Number.isNaN(num)) return
    if (editType === 'transfer') {
      if (!editTransferFrom || !editTransferTo) return alert('Оберіть рахунки')
      if (editTransferFrom === editTransferTo) return alert('Оберіть різні рахунки')
    }

    // Optimistic update: keep previous state for rollback
    const prev = transactions.slice()
    // optimistic update: update current row
    const updated = transactions.map(t =>
      t.id === id ? {
        ...t,
        amount: num,
        category: editType === 'transfer' ? 'Переказ' : editCategory,
        account: editType === 'transfer' ? editTransferFrom : editAccount,
        from_account: editType === 'transfer' ? editTransferFrom : t.from_account,
        to_account: editType === 'transfer' ? editTransferTo : t.to_account,
        date: editDate,
        type: editType,
        comment: editComment
      } : t
    )
    setTransactions(updated)
    setSavingId(id)

    try {
      const body = editType === 'transfer'
        ? { amount: num, category: 'Переказ', account: editTransferFrom, from_account: editTransferFrom, to_account: editTransferTo, date: editDate, type: 'transfer', comment: editComment }
        : { amount: num, category: editCategory, account: editAccount, date: editDate, type: editType, comment: editComment }

      const res = await fetch(`http://localhost:3000/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
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
      setShowEditModal(false)
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

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingId(null)
  }


  const accounts = accountsList.slice().sort((a, b) => a.localeCompare(b, 'uk'))

  const allCategories = allCategoriesList.slice().sort((a, b) => a.localeCompare(b, 'uk'))

  const categoriesByType = allCategories.slice()

  const filteredTransactions = transactions
    .filter(t => {
      const accountMatch = filterAccounts.length
        ? (t.type === 'transfer'
          ? filterAccounts.some(a => a === t.from_account || a === t.to_account || a === t.account)
          : filterAccounts.includes(t.account))
        : true
      const categoryMatch = filterCategories.length
        ? (t.type === 'transfer' ? false : filterCategories.includes(t.category))
        : true
      return accountMatch && categoryMatch
    })

  const formatMoney = (value: number) => {
    const num = Math.round((Number(value) || 0) * 100) / 100
    const sign = num < 0 ? '-' : ''
    const abs = Math.abs(num)
    const integerPart = Math.trunc(abs)
    const frac = Math.round((abs - integerPart) * 100)
    // insert space as thousands separator
    const intStr = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
    if (frac === 0) return sign + intStr
    const fracStr = String(frac).padStart(2, '0')
    return sign + intStr + '.' + fracStr
  }

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
              <h3>Баланс: {formatMoney(balance)} ₴</h3>
              {lastMonobankSync && (
                <div className="monobank-sync-info">
                  <i className="fa-solid fa-clock"></i>
                  <span>Останнє оновлення Monobank:</span>
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
                    <button className="bank-btn" onClick={() => setShowBankIntegration(true)} aria-label="Інтеграція з банком">
                      <i className="fa-solid fa-building-columns"></i>
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
                    <div className="list-item-right" onClick={(e) => e.stopPropagation()}>{formatMoney(accountsBalance[a] || 0)} ₴</div>
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
                    <div className="list-item-right" onClick={(e) => e.stopPropagation()}>{formatMoney(categoriesBalance[c] || 0)} ₴</div>
                  </li>
                ))}
              </ul>

              <button 
                className="auto-rules-sidebar-btn" 
                onClick={() => setShowAutoRules(true)}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Автоправила
              </button>

            </div>

          </div>
        </div>

        {/* Права колонка */}
        <div className="content">
        <div className={`tabs ${activeTab === 'expense' ? 'styleExpense' : activeTab === 'income' ? 'styleIncome' : 'styleTransfer'}`}>
          <div className={`tabs-header ${activeTab === 'expense' ? 'styleHeaderExpense' : activeTab === 'income' ? 'styleHeaderIncome' : 'styleHeaderTransfer'}`}>
            <button 
              className={activeTab==='expense'?'active':'inactive'}
              onClick={()=>setActiveTab('expense')}
            >Витрати</button>
            <button
              className={activeTab==='income'?'active':'inactive'}
              onClick={()=>setActiveTab('income')}
            >Дохід</button>
            <button
              className={activeTab==='transfer'?'active':'inactive'}
              onClick={()=>setActiveTab('transfer')}
            >Переказ</button>
          </div>

          <div className="tabs-content">
            {activeTab !== 'transfer' ? (
              <>
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

                    <div className="form-row">
                      <input 
                        className="comment-input"
                        type="text" 
                        value={comment} 
                        onChange={e => setComment(e.target.value)} 
                        placeholder='Коментар'
                      />
                    </div>
                  </div>
                </div>
                <div className="tab-content-right-column">
                  <div className="form-row-summ">
                    <div className="form-row tabs-summ">
                      <label>Сума:</label>
                      <input className="summ-input" type="number" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/>
                    </div>
                    <div className="form-row">
                      <label>Дата:</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <button className={`add-button ${activeTab === 'expense' ? 'add-button-expense' : 'add-button-income'}`} onClick={addTransaction}>
                      {activeTab === 'expense' ? 'Додати витрату' : 'Додати дохід'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Transfer tab
              <>
                <div className="tab-content-left-column">
                  <div className="transaction-form">
                    <div className="form-row">
                      <label>З рахунку:</label>
                      <select value={transferFrom} onChange={e=>setTransferFrom(e.target.value)}>
                        {accounts.map(a=><option key={"from-"+a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="form-row">
                      <label>На рахунок:</label>
                      <select value={transferTo} onChange={e=>setTransferTo(e.target.value)}>
                        {accounts.map(a=><option key={"to-"+a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="form-row">
                      <input 
                        className="comment-input"
                        type="text" 
                        value={comment} 
                        onChange={e => setComment(e.target.value)} 
                        placeholder='Коментар'
                      />
                    </div>
                  </div>
                </div>
                <div className="tab-content-right-column">
                  <div className="form-row-summ">
                    <div className="form-row tabs-summ">
                      <label>Сума:</label>
                      <input className="summ-input" type="number" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/>
                    </div>
                    <div className="form-row">
                      <label>Дата:</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <button className="add-button add-button-transfer" onClick={() => addTransfer()}>Додати переказ</button>
                  </div>
                </div>
              </>
            )}
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

          <div className="transactions-header">
            <div className="col checkbox-col">
              <input 
                type="checkbox" 
                checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                onChange={toggleSelectAll}
                title="Виділити всі"
              />
            </div>
            <div className="col date">Дата</div>
            <div className="col account">Рахунок</div>
            <div className="col category">Категорія</div>
            <div className="col comment">Коментар</div>
            <div className="col amount">Сума</div>
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <button 
                onClick={handleBulkDelete}
                className="delete-selected-btn"
              >
                Видалити обрані ({selectedIds.size})
              </button>
            </div>
          )}

          <ul className="transactions-list">
            {filteredTransactions.map(tr => {
              const isTransfer = tr.type === 'transfer'
              const fromAcc = tr.from_account || tr.account
              const toAcc = tr.to_account || ''

              return (
                <li
                  key={tr.id}
                  className={`transaction-row ${tr.type === 'income' ? 'transaction-income' : tr.type === 'expense' ? 'transaction-expense' : 'transaction-transfer'}`}
                >
                  <div className="col checkbox-col" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(tr.id)}
                      onChange={() => toggleSelect(tr.id)}
                    />
                  </div>
                  
                  <div className="col date" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>
                    <div>{new Date(tr.date).toLocaleDateString()}</div>
                    <div className="time">{new Date(tr.date).toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>

                  {isTransfer ? (
                    <>
                      <div className="col account" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>{fromAcc} → {toAcc}</div>
                      <div className="col category" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>Переказ</div>
                    </>
                  ) : (
                    <>
                      <div className="col account" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>{tr.account}</div>
                      <div className="col category" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>{tr.category}</div>
                    </>
                  )}

                  <div className="col comment" onClick={() => startEdit(tr)} style={{ cursor: 'pointer' }}>{tr.comment || ''}</div>

                  <div 
                    className={`col amount ${tr.type === 'income' ? 'amount-positive' : 'amount-negative'}`}
                    onClick={() => startEdit(tr)} 
                    style={{ cursor: 'pointer' }}
                  >
                    {isTransfer ? `-${formatMoney(Number(tr.amount))} ₴` : `${tr.type === 'income' ? '+' : '-'}${formatMoney(Number(tr.amount))} ₴`}
                  </div>
                </li>
              )
            })}
            
            {/* Sentinel для infinity scroll */}
            <div id="scroll-sentinel" style={{ height: '20px', margin: '10px 0' }}>
              {loadingMore && <div style={{ textAlign: 'center', color: '#666' }}>Завантаження...</div>}
            </div>
          </ul>

          {!hasMore && transactions.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Всього транзакцій: {total}
            </div>
          )}
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
        {showEditModal && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="edit-modal" onClick={e => e.stopPropagation()}>
              <div className={`tabs ${editType === 'expense' ? 'styleExpense' : editType === 'income' ? 'styleIncome' : 'styleTransfer'}`}>
                <div className={`tabs-header ${editType === 'expense' ? 'styleHeaderExpense' : editType === 'income' ? 'styleHeaderIncome' : 'styleHeaderTransfer'}`}>
                  <button className={editType==='expense'?'active':'inactive'} onClick={()=>setEditType('expense')}>Витрати</button>
                  <button className={editType==='income'?'active':'inactive'} onClick={()=>setEditType('income')}>Дохід</button>
                  <button className={editType==='transfer'?'active':'inactive'} onClick={()=>setEditType('transfer')}>Переказ</button>
                </div>
                <div className="tabs-content">
                  <div className="tab-content-left-column">
                    <div className="transaction-form">
                      {editType === 'transfer' ? (
                        <>
                          <div className="form-row">
                            <label>З рахунку:</label>
                            <select value={editTransferFrom} onChange={e=>setEditTransferFrom(e.target.value)}>
                              {accounts.map(a=><option key={"from-"+a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="form-row">
                            <label>На рахунок:</label>
                            <select value={editTransferTo} onChange={e=>setEditTransferTo(e.target.value)}>
                              {accounts.map(a=><option key={"to-"+a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="form-row">
                            <label>Рахунок:</label>
                            <select value={editAccount} onChange={e=>setEditAccount(e.target.value)}>
                              {accounts.map(a=><option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>

                          <div className="form-row">
                            <label>Категорія:</label>
                            <select value={editCategory} onChange={e=>setEditCategory(e.target.value)}>
                              {categoriesByType.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="form-row comment-row">
                      <label>Коментар:</label>
                      <input 
                        type="text" 
                        value={editComment} 
                        onChange={e => setEditComment(e.target.value)} 
                        placeholder="Необов'язкове поле"
                      />
                    </div>
                  </div>
                  <div className="tab-content-right-column">
                    <div className="form-row-summ">
                      <div className="form-row tabs-summ">
                        <label>Сума:</label>
                        <input className="summ-input" type="number" step="0.01" inputMode="decimal" value={editAmount} onChange={e=>setEditAmount(e.target.value)}/>
                      </div>
                      <div className="form-row">
                        <label>Дата:</label>
                        <input className="date-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className='edit-modal-buttons'>
                  <button className="edit-modal-delete-button"
                    onClick={async () => {
                      if (!editingId) return
                      const ok = window.confirm('Підтвердити видалення транзакції?')
                      if (!ok) return

                      // optimistic remove
                      const prev = transactions.slice()
                      setTransactions(transactions.filter(t => t.id !== editingId))
                      setDeletingId(editingId)
                      closeEditModal()

                      try {
                        const res = await fetch(`http://localhost:3000/transactions/${editingId}`, {
                          method: 'DELETE'
                        })

                        if (!res.ok) {
                          setTransactions(prev)
                          const text = await res.text()
                          const message = `Не вдалося видалити: ${text || res.status}`
                          alert(message)
                          setInlineErrors(prevErr => ({ ...prevErr, [editingId]: message }))
                        }
                      } catch (err) {
                        setTransactions(prev)
                        const message = 'Помилка мережі при видаленні'
                        alert(message)
                        setInlineErrors(prevErr => ({ ...prevErr, [editingId]: message }))
                        console.error('Delete error', err)
                      } finally {
                        setDeletingId(null)
                      }
                    }}
                    disabled={deletingId === editingId}
                  >
                    {deletingId === editingId ? '...' : 'Видалити платіж'}
                  </button>
                  <div className="edit-del-modal-buttons">
                    <button className="cancel-button" onClick={closeEditModal}>Скасувати</button>
                    <button className="add-button" onClick={() => editingId && saveEdit(editingId)}>Зберегти</button>
                  </div>
                </div>
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

        {showBankIntegration && (
          <BankIntegration
            onClose={() => setShowBankIntegration(false)}
            accountsList={accountsList}
          />
        )}

        {showAutoRules && (
          <AutoRules
            onClose={() => setShowAutoRules(false)}
            categories={allCategoriesList}
          />
        )}
      </div>

      </div>
      
    </div>
  )
}

export default App
