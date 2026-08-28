import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { TicketsListPage } from './pages/TicketsListPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<TicketsListPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
