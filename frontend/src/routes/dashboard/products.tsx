import { createFileRoute } from '@tanstack/react-router'
import { ProductManagement } from '../../components/products/ProductManagement'

export const Route = createFileRoute('/dashboard/products')({
  component: ProductManagement,
})
