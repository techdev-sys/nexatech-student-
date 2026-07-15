import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '../../../context/ToastContext'
import { financeApi } from '../api/financeApi'

function useResource(fetcher, deps = [], { initial = null } = {}) {
  const [data, setData]       = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const reqId = useRef(0)

  const refetch = useCallback(() => {
    const id = ++reqId.current
    setLoading(true); setError(null)
    Promise.resolve(fetcher())
      .then(r => { if (id === reqId.current) setData(r) })
      .catch(e => { if (id === reqId.current) setError(e) })
      .finally(() => { if (id === reqId.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { refetch() }, [refetch])
  return { data, loading, error, refetch }
}

function useMutation(fn, successMessage) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const mutate = useCallback(async (...args) => {
    setLoading(true)
    try {
      const r = await fn(...args)
      if (successMessage) toast.success(successMessage)
      return r
    } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { mutate, loading }
}

export const useFinanceDashboard = () => useResource(() => financeApi.dashboard(), [])

export const useIncomeCategories = (params = {}) =>
  useResource(() => financeApi.incomeCategories(params), [params.search, params.is_active, params.page])
export const useCreateIncomeCategory = () => useMutation((p) => financeApi.createIncomeCategory(p), 'Income category created.')
export const useUpdateIncomeCategory = () => useMutation((id, p) => financeApi.updateIncomeCategory(id, p), 'Income category updated.')
export const useDeleteIncomeCategory = () => useMutation((id) => financeApi.deleteIncomeCategory(id), 'Income category deleted.')

export const useExpenseCategories = (params = {}) =>
  useResource(() => financeApi.expenseCategories(params), [params.search, params.is_active, params.page])
export const useCreateExpenseCategory = () => useMutation((p) => financeApi.createExpenseCategory(p), 'Expense category created.')
export const useUpdateExpenseCategory = () => useMutation((id, p) => financeApi.updateExpenseCategory(id, p), 'Expense category updated.')
export const useDeleteExpenseCategory = () => useMutation((id) => financeApi.deleteExpenseCategory(id), 'Expense category deleted.')

export const useExpenses = (params = {}) =>
  useResource(() => financeApi.expenses(params), [params.status, params.expense_category_id, params.search, params.page])
export const useCreateExpense   = () => useMutation((p) => financeApi.createExpense(p), 'Expense created.')
export const useUpdateExpense   = () => useMutation((id, p) => financeApi.updateExpense(id, p), 'Expense updated.')
export const useDeleteExpense   = () => useMutation((id) => financeApi.deleteExpense(id), 'Expense deleted.')
export const useApproveExpense  = () => useMutation((id) => financeApi.approveExpense(id), 'Expense approved.')
export const useMarkExpensePaid = () => useMutation((id) => financeApi.markExpensePaid(id), 'Expense marked paid.')
export const useCancelExpense   = () => useMutation((id) => financeApi.cancelExpense(id), 'Expense cancelled.')

export const useCashbook = (params = {}) =>
  useResource(() => financeApi.cashbook(params), [params.entry_type, params.from_date, params.to_date, params.page])
