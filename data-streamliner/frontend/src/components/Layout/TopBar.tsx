import React, { useState } from 'react'
import {
  AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem,
  Box, Chip, Tooltip,
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../../hooks/useAuth'

export default function TopBar() {
  const { user, logout } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
        ml: '240px',
        width: 'calc(100% - 240px)',
      }}
    >
      <Toolbar>
        <Typography variant="h6" fontWeight="600" color="primary" sx={{ mr: 1 }}>
          Star Health Insurance
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          — Renewal Analytics Platform
        </Typography>
        <Box flexGrow={1} />
        <Box display="flex" alignItems="center" gap={1}>
          {user?.roles?.map((role) => (
            <Chip
              key={role}
              label={role.replace('_', ' ')}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
            />
          ))}
          <Tooltip title={user?.full_name || user?.username || ''}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </MenuItem>
          <MenuItem onClick={() => { logout(); setAnchorEl(null) }}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
