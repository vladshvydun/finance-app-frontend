import { useEffect, useState } from 'react'
import { socket } from '../socket'

export function Balance() {
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    socket.on('balance:update', (newBalance: number) => {
      setBalance(newBalance)
    })

    return () => {
      socket.off('balance:update')
    }
  }, [])

  return <h2>Баланс: {balance} ₴</h2>
}
