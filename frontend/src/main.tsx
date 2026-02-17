import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { routeTree } from './routeTree.gen';
import './index.css';

// Create router instance
const router = createRouter({ routeTree });

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#800000', // Maroon
    colorBgBase: '#ffffff', // White background
    colorBgContainer: 'rgba(255, 255, 255, 0.8)', // Semi-transparent for glass effect
    colorBorder: 'rgba(128, 0, 0, 0.1)', // Subtle maroon border
    borderRadius: 12, // More modern rounded corners
    fontSize: 16, // Larger base font size
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    lineHeight: 1.6,
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.95)',
      bodyBg: '#ffffff',
      triggerBg: 'rgba(255, 255, 255, 0.95)',
    },
    Menu: {
      colorBgContainer: 'transparent',
      itemBg: 'rgba(255, 255, 255, 0.1)',
      itemHoverBg: 'rgba(128, 0, 0, 0.1)',
      itemSelectedBg: 'rgba(128, 0, 0, 0.2)',
      itemSelectedColor: '#800000',
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.25)',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.18)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    },
    Button: {
      borderRadius: 8,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>
);
