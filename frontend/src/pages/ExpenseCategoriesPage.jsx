import CategoryManager from '../modules/finance/components/CategoryManager'
import {
  useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory,
} from '../modules/finance/hooks'

export default function ExpenseCategoriesPage() {
  return (
    <CategoryManager
      title="Expense Categories"
      accent="bg-rose-600"
      useList={useExpenseCategories}
      useCreate={useCreateExpenseCategory}
      useUpdate={useUpdateExpenseCategory}
      useDelete={useDeleteExpenseCategory}
    />
  )
}
