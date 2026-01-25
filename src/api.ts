export async function addTransaction(amount: number) {
  await fetch('http://localhost:3000/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  })
}
