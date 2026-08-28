import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthContext.tsx'
import { ApiError } from './lib/api-client.ts'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No tiene sentido reintentar un 4xx (403/404/400...): el resultado
      // no va a cambiar, y por default TanStack Query reintenta 3 veces con
      // backoff, lo que deja la UI de error varios segundos "en blanco".
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
