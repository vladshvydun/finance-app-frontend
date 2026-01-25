import { useState } from 'react'
import { addTransaction } from '../api'

export function AddTransaction() {
  const [amount, setAmount] = useState<number>(0)

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button onClick={() => addTransaction(amount)}>
        Додати
      </button>
    </div>
  )
}
