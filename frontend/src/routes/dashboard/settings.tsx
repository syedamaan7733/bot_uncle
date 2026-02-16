import { createFileRoute } from '@tanstack/react-router'
import { BusinessSettings } from '../../components/settings/BusinessSettings'

export const Route = createFileRoute('/dashboard/settings')({
    component: BusinessSettings,
})
