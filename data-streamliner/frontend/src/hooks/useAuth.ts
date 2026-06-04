import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { loginThunk, logout } from '../store/authSlice'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, token, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth)

  const login = (username: string, password: string) =>
    dispatch(loginThunk({ username, password }))

  const logoutUser = () => dispatch(logout())

  const hasRole = (role: string) =>
    user?.is_superuser || (user?.roles || []).includes(role)

  const isAdmin = () => hasRole('admin')
  const isDataAdmin = () => hasRole('admin') || hasRole('data_admin')
  const isReportCreator = () => hasRole('admin') || hasRole('data_admin') || hasRole('report_creator')

  return { user, token, isAuthenticated, loading, error, login, logout: logoutUser, hasRole, isAdmin, isDataAdmin, isReportCreator }
}
