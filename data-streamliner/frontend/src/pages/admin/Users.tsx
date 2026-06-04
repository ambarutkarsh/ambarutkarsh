import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl,
  Alert, CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import apiClient from '../../api/client'
import { useForm, Controller } from 'react-hook-form'

interface User {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
  roles: string[]
  created_at?: string
}

interface FormData {
  email: string
  username: string
  full_name: string
  password: string
  is_active: boolean
  is_superuser: boolean
  roles: string[]
}

const ROLES = ['admin', 'data_admin', 'report_creator', 'viewer']

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { is_active: true, is_superuser: false, roles: ['viewer'] },
  })

  const load = () => {
    setLoading(true)
    apiClient.get('/users').then(({ data }) => { setUsers(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ is_active: true, is_superuser: false, roles: ['viewer'] })
    setOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    reset({ email: u.email, username: u.username, full_name: u.full_name || '', password: '', is_active: u.is_active, is_superuser: u.is_superuser, roles: u.roles })
    setOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      if (editing) {
        await apiClient.put(`/users/${editing.id}`, data)
      } else {
        await apiClient.post('/users', data)
      }
      setOpen(false)
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error saving user')
    }
  }

  const deactivate = async (id: number) => {
    if (!confirm('Deactivate this user?')) return
    await apiClient.delete(`/users/${id}`)
    load()
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add User</Button>
      </Box>
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.full_name}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {u.is_superuser && <Chip label="superuser" size="small" color="error" />}
                    {(u.roles || []).map((r) => <Chip key={r} label={r} size="small" variant="outlined" />)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deactivate(u.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit User' : 'Create User'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField fullWidth label="Username" margin="normal" {...register('username', { required: true })} error={!!errors.username} />
            <TextField fullWidth label="Email" margin="normal" {...register('email', { required: true })} error={!!errors.email} />
            <TextField fullWidth label="Full Name" margin="normal" {...register('full_name')} />
            <TextField fullWidth label={editing ? 'New Password (leave blank to keep)' : 'Password'} type="password" margin="normal"
              {...register('password', { required: !editing })} error={!!errors.password} />
            <FormControl fullWidth margin="normal">
              <InputLabel>Roles</InputLabel>
              <Controller name="roles" control={control} render={({ field }) => (
                <Select {...field} multiple label="Roles">
                  {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
            <Controller name="is_active" control={control} render={({ field }) => (
              <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Active" />
            )} />
            <Controller name="is_superuser" control={control} render={({ field }) => (
              <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Superuser" />
            )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
