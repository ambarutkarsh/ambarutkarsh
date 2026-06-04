import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Chip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import PeopleIcon from '@mui/icons-material/People'
import TableChartIcon from '@mui/icons-material/TableChart'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import HistoryIcon from '@mui/icons-material/History'
import { useAuth } from '../../hooks/useAuth'

const DRAWER_WIDTH = 240

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: <DashboardIcon />, roles: ['admin', 'data_admin', 'report_creator', 'viewer'] },
  { label: 'Data Sources', path: '/admin/data-sources', icon: <StorageIcon />, roles: ['admin'] },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon />, roles: ['admin'] },
  { label: 'Datasets', path: '/datasets', icon: <TableChartIcon />, roles: ['admin', 'data_admin', 'report_creator'] },
  { label: 'Reports', path: '/reports', icon: <AssessmentIcon />, roles: ['admin', 'data_admin', 'report_creator'] },
  { label: 'Dashboards', path: '/dashboards', icon: <ViewModuleIcon />, roles: ['admin', 'data_admin', 'report_creator', 'viewer'] },
  { label: 'Audit Logs', path: '/audit', icon: <HistoryIcon />, roles: ['admin'] },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (user?.is_superuser) return true
    const userRoles = new Set(user?.roles || [])
    return item.roles.some((r) => userRoles.has(r))
  })

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1A237E',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2, pt: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="white" lineHeight={1.2}>
          Star Health
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Data Streamliner
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
      <List sx={{ px: 1, pt: 1 }}>
        {visibleItems.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: 'rgba(255,255,255,0.8)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(227,24,55,0.9)',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2 }}>
        <Chip
          label={`v1.0.0`}
          size="small"
          sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}
        />
      </Box>
    </Drawer>
  )
}
