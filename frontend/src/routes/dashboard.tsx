import { createFileRoute, redirect } from '@tanstack/react-router';
import { DashboardLayout } from '../components/layout/DashboardLayout';

export const Route = createFileRoute('/dashboard')({
    beforeLoad: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw redirect({ to: '/login' });
        }
    },
    component: DashboardLayout,
});
