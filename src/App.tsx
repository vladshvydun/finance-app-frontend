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
  }

  const saveEdit = async (id: number) => {
    await fetch(`http://localhost:3000/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(editAmount),
        category: editCategory,
        account: editAccount
      })
    })
    setEditingId(null)
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
                {accounts.map(a=>
                  <li key={a} className="list-item">
                    <div className="list-item-left">{a}:</div><div className="list-item-right">{accountsBalance[a]||0} ₴</div>
                  </li>
                )}
              </ul>
            </div>

            <div className="sidebar-block">
              <h3>Категорії</h3>
              <ul className="list">
                {allCategories.map(c => (
                  <li key={c} className="list-item">
                    <div className="list-item-left">{c}:</div>
                    <div className="list-item-right">
                      {categoriesBalance[c] || 0} ₴
                    </div>
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
          <h3>Останні записи</h3>

          <ul className="transactions-list">
            {transactions.slice().reverse().map(tr => (
              <li
                key={tr.id}
                className={`transaction-row ${
                  tr.type === 'income'
                    ? 'transaction-income'
                    : 'transaction-expense'
                }`}
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
                      <button onClick={() => saveEdit(tr.id)}>✔</button>
                      <button onClick={() => setEditingId(null)}>✖</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col account">{tr.account}</div>
                    <div className="col category">{tr.category}</div>
                    <div className="col amount">
                      {tr.type === 'income' ? '+' : '-'}
                      {Number(tr.amount).toLocaleString()} ₴

                      <button onClick={() => startEdit(tr)}>✏️</button>
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
