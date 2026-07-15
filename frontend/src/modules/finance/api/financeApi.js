// Finance/accounting API layer — wraps the SHARED axios client only.
import api from '../../../api/axios'

const unwrap = (res) => res.data

export const financeApi = {
  dashboard: () => api.get('/api/finance/dashboard').then(unwrap),

  // Income categories
  incomeCategories:       (params) => api.get('/api/finance/income-categories', { params }).then(unwrap),
  createIncomeCategory:   (payload) => api.post('/api/finance/income-categories', payload).then(unwrap),
  updateIncomeCategory:   (id, payload) => api.patch(`/api/finance/income-categories/${id}`, payload).then(unwrap),
  deleteIncomeCategory:   (id) => api.delete(`/api/finance/income-categories/${id}`).then(unwrap),
  restoreIncomeCategory:  (id) => api.post(`/api/finance/income-categories/${id}/restore`).then(unwrap),

  // Expense categories
  expenseCategories:      (params) => api.get('/api/finance/expense-categories', { params }).then(unwrap),
  createExpenseCategory:  (payload) => api.post('/api/finance/expense-categories', payload).then(unwrap),
  updateExpenseCategory:  (id, payload) => api.patch(`/api/finance/expense-categories/${id}`, payload).then(unwrap),
  deleteExpenseCategory:  (id) => api.delete(`/api/finance/expense-categories/${id}`).then(unwrap),
  restoreExpenseCategory: (id) => api.post(`/api/finance/expense-categories/${id}/restore`).then(unwrap),

  // Expenses + lifecycle
  expenses:        (params) => api.get('/api/finance/expenses', { params }).then(unwrap),
  createExpense:   (payload) => api.post('/api/finance/expenses', payload).then(unwrap),
  updateExpense:   (id, payload) => api.patch(`/api/finance/expenses/${id}`, payload).then(unwrap),
  deleteExpense:   (id) => api.delete(`/api/finance/expenses/${id}`).then(unwrap),
  approveExpense:  (id) => api.post(`/api/finance/expenses/${id}/approve`).then(unwrap),
  markExpensePaid: (id) => api.post(`/api/finance/expenses/${id}/mark-paid`).then(unwrap),
  cancelExpense:   (id) => api.post(`/api/finance/expenses/${id}/cancel`).then(unwrap),

  // Cashbook
  cashbook: (params) => api.get('/api/finance/cashbook', { params }).then(unwrap),
}

export function backendMessage(err, fallback = 'The request could not be completed.') {
  const data = err?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }
  return data?.message ?? fallback
}
