import { createFileRoute } from '@tanstack/react-router';
import { SmartImport } from '../../components/smart-import/SmartImport';

export const Route = createFileRoute('/dashboard/import')({
    component: SmartImport,
});
