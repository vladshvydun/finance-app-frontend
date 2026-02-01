// API функції для роботи з Monobank інтеграцією
const API_BASE = 'http://localhost:3000'

export interface MonobankAccount {
  id: string
  sendId: string
  balance: number
  creditLimit: number
  type: string
  currencyCode: number
  cashbackType: string
  maskedPan: string[]
  iban: string
}

export interface BankIntegration {
  id: number
  bank_name: string
  token: string
  account_mapping: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ImportResult {
  imported: number
  skipped: number
  total: number
}

// Отримати інформацію про рахунки Monobank
export async function getMonobankAccounts(token: string): Promise<{ accounts: MonobankAccount[] }> {
  const res = await fetch(`${API_BASE}/monobank/accounts?token=${encodeURIComponent(token)}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Помилка отримання рахунків')
  }
  return res.json()
}

// Зберегти інтеграцію з банком
export async function saveBankIntegration(token: string, accountMapping: Record<string, string>): Promise<BankIntegration> {
  const res = await fetch(`${API_BASE}/bank-integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, accountMapping })
  })
  
  if (!res.ok) {
    throw new Error('Не вдалося зберегти інтеграцію')
  }
  
  return res.json()
}

// Отримати збережену інтеграцію
export async function getBankIntegration(): Promise<BankIntegration | null> {
  const res = await fetch(`${API_BASE}/bank-integrations`)
  return res.json()
}

// Імпортувати транзакції з Monobank
export async function importMonobankTransactions(
  token: string,
  accountId: string,
  from: string,
  to: string
): Promise<ImportResult> {
  const res = await fetch(`${API_BASE}/monobank/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, accountId, from, to })
  })
  
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Помилка імпорту')
  }
  
  return res.json()
}
