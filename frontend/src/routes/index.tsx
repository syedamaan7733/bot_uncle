import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw redirect({ to: '/login' });
        }
        throw redirect({ to: '/dashboard' });
    },
});
