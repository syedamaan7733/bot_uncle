import { createFileRoute } from '@tanstack/react-router'
import { CategoryManagement } from '../../components/categories/CategoryManagement'

export const Route = createFileRoute('/dashboard/categories')({
  component: CategoryManagement,
})
