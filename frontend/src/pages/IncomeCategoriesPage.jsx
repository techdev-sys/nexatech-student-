import CategoryManager from '../modules/finance/components/CategoryManager'
import {
  useIncomeCategories, useCreateIncomeCategory, useUpdateIncomeCategory, useDeleteIncomeCategory,
} from '../modules/finance/hooks'

export default function IncomeCategoriesPage() {
  return (
    <CategoryManager
      title="Income Categories"
      accent="bg-emerald-600"
      useList={useIncomeCategories}
      useCreate={useCreateIncomeCategory}
      useUpdate={useUpdateIncomeCategory}
      useDelete={useDeleteIncomeCategory}
    />
  )
}
