import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store'
import AppLayout from './components/Layout/AppLayout'
import ProtectedRoute from './components/Common/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import Users from './pages/admin/Users'
import DataSources from './pages/admin/DataSources'
import DatasetList from './pages/datasets/DatasetList'
import DatasetBuilder from './pages/datasets/DatasetBuilder'
import ReportList from './pages/reports/ReportList'
import ReportBuilder from './pages/reports/ReportBuilder'
import DashboardList from './pages/dashboards/DashboardList'
import DashboardViewer from './pages/dashboards/DashboardViewer'

export default function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="admin">
          <Route path="users" element={<Users />} />
          <Route path="data-sources" element={<DataSources />} />
        </Route>
        <Route path="datasets">
          <Route index element={<DatasetList />} />
          <Route path="new" element={<DatasetBuilder />} />
          <Route path=":id/edit" element={<DatasetBuilder />} />
        </Route>
        <Route path="reports">
          <Route index element={<ReportList />} />
          <Route path="new" element={<ReportBuilder />} />
          <Route path=":id/edit" element={<ReportBuilder />} />
          <Route path=":id" element={<ReportBuilder />} />
        </Route>
        <Route path="dashboards">
          <Route index element={<DashboardList />} />
          <Route path=":id" element={<DashboardViewer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
