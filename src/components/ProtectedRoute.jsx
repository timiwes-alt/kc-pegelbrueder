import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!isAdmin) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}
