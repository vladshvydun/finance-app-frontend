import { useState, useEffect } from 'react'
import './AutoRules.css'

type AutoRule = {
  id: number
  name: string
  comment_pattern: string
  category: string
  created_at: string
  updated_at: string
}

type Props = {
  onClose: () => void
  categories: string[]
}

export default function AutoRules({ onClose, categories }: Props) {
  const [rules, setRules] = useState<AutoRule[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Форма додавання/редагування
  const [formName, setFormName] = useState('')
  const [formPattern, setFormPattern] = useState('')
  const [formCategory, setFormCategory] = useState('')

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const response = await fetch('http://localhost:3000/auto-rules')
      const data = await response.json()
      setRules(data)
    } catch (err) {
      console.error('Failed to load auto rules:', err)
      alert('Помилка завантаження автоправил')
    }
  }

  const handleAdd = async () => {
    if (!formName || !formPattern || !formCategory) {
      alert('Заповніть всі поля')
      return
    }

    try {
      const response = await fetch('http://localhost:3000/auto-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          comment_pattern: formPattern,
          category: formCategory
        })
      })

      if (response.ok) {
        setFormName('')
        setFormPattern('')
        setFormCategory('')
        setShowAddForm(false)
        loadRules()
      } else {
        alert('Помилка при створенні правила')
      }
    } catch (err) {
      console.error('Failed to create rule:', err)
      alert('Помилка при створенні правила')
    }
  }

  const handleEdit = (rule: AutoRule) => {
    setEditingId(rule.id)
    setFormName(rule.name)
    setFormPattern(rule.comment_pattern)
    setFormCategory(rule.category)
    setShowAddForm(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !formName || !formPattern || !formCategory) {
      alert('Заповніть всі поля')
      return
    }

    try {
      const response = await fetch(`http://localhost:3000/auto-rules/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          comment_pattern: formPattern,
          category: formCategory
        })
      })

      if (response.ok) {
        setEditingId(null)
        setFormName('')
        setFormPattern('')
        setFormCategory('')
        loadRules()
      } else {
        alert('Помилка при оновленні правила')
      }
    } catch (err) {
      console.error('Failed to update rule:', err)
      alert('Помилка при оновленні правила')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити це правило?')) return

    try {
      const response = await fetch(`http://localhost:3000/auto-rules/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadRules()
      } else {
        alert('Помилка при видаленні правила')
      }
    } catch (err) {
      console.error('Failed to delete rule:', err)
      alert('Помилка при видаленні правила')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormName('')
    setFormPattern('')
    setFormCategory('')
  }

  return (
    <div className="auto-rules-overlay" onClick={onClose}>
      <div className="auto-rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auto-rules-header">
          <h2>Автоправила</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="auto-rules-content">
          <div className="auto-rules-description">
            <p>Автоправила дозволяють автоматично призначати категорії транзакціям на основі їх коментарів.</p>
          </div>

          {!showAddForm && !editingId && (
            <button className="add-rule-btn" onClick={() => setShowAddForm(true)}>
              <i className="fa-solid fa-plus"></i> Додати правило
            </button>
          )}

          {(showAddForm || editingId) && (
            <div className="rule-form">
              <h3>{editingId ? 'Редагувати правило' : 'Нове правило'}</h3>
              
              <div className="form-group">
                <label>Назва правила:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Наприклад: Продукти в Сільпо"
                />
              </div>

              <div className="form-group">
                <label>Ключове слово в коментарі:</label>
                <input
                  type="text"
                  value={formPattern}
                  onChange={(e) => setFormPattern(e.target.value)}
                  placeholder="Наприклад: Сільпо"
                />
                <small>Якщо коментар містить це слово, буде застосована категорія</small>
              </div>

              <div className="form-group">
                <label>Категорія:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">Оберіть категорію</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button className="save-btn" onClick={editingId ? handleUpdate : handleAdd}>
                  {editingId ? 'Оновити' : 'Створити'}
                </button>
                <button className="cancel-btn" onClick={handleCancel}>Скасувати</button>
              </div>
            </div>
          )}

          <div className="rules-list">
            <h3>Існуючі правила ({rules.length})</h3>
            
            {rules.length === 0 ? (
              <p className="no-rules">Немає автоправил. Додайте перше правило!</p>
            ) : (
              <ul>
                {rules.map(rule => (
                  <li key={rule.id} className="rule-item">
                    <div className="rule-info">
                      <h4>{rule.name}</h4>
                      <div className="rule-details">
                        <span className="rule-pattern">
                          <i className="fa-solid fa-search"></i> "{rule.comment_pattern}"
                        </span>
                        <span className="rule-arrow">→</span>
                        <span className="rule-category">
                          <i className="fa-solid fa-tag"></i> {rule.category}
                        </span>
                      </div>
                    </div>
                    <div className="rule-actions">
                      <button className="edit-btn" onClick={() => handleEdit(rule)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(rule.id)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
