import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Autocomplete,
  Stack,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { League, LeagueFormData } from '../types/league';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

const Ligas: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    color: '#1976d2',
    icon: '🏆',
    members: [],
    active: true
  });

  useEffect(() => {
    fetchLeagues();
    fetchUsers();
  }, []);

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leagues'));
      const leaguesData: League[] = [];
      querySnapshot.forEach((doc) => {
        leaguesData.push({ id: doc.id, ...doc.data() } as League);
      });
      setLeagues(leaguesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError('Error al cargar ligas');
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'seller'));
      const querySnapshot = await getDocs(q);
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          displayName: data.displayName || data.email || '',
          email: data.email || '',
          role: data.role || ''
        });
      });
      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (err) {
      console.error('Error al cargar promotores:', err);
    }
  };

  const handleOpenDialog = (league?: League) => {
    if (league) {
      setEditingLeague(league);
      setFormData({
        name: league.name,
        description: league.description || '',
        color: league.color || '#1976d2',
        icon: league.icon || '🏆',
        members: league.members,
        active: league.active
      });
    } else {
      setEditingLeague(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        icon: '🏆',
        members: [],
        active: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeague(null);
    setError('');
  };

  const handleInputChange = (field: keyof LeagueFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      // Validaciones
      if (!formData.name.trim()) {
        setError('El nombre de la liga es obligatorio');
        return;
      }

      if (formData.members.length < 2) {
        setError('Una liga debe tener al menos 2 miembros para hacer benchmarking');
        return;
      }

      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        color: formData.color || '#1976d2',
        icon: formData.icon || '🏆',
        members: formData.members,
        active: formData.active,
        updatedAt: Timestamp.now(),
        createdBy: 'admin', // TODO: Get from auth context
        ...(editingLeague ? {} : { createdAt: Timestamp.now() })
      };

      if (editingLeague) {
        await updateDoc(doc(db, 'leagues', editingLeague.id), dataToSave);
      } else {
        await addDoc(collection(db, 'leagues'), dataToSave);
      }

      await fetchLeagues();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la liga');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta liga? Los promotores seguirán existiendo, pero perderán su membresía.')) {
      try {
        await deleteDoc(doc(db, 'leagues', id));
        await fetchLeagues();
      } catch (err) {
        setError('Error al eliminar la liga');
        console.error(err);
      }
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const activeLeagues = leagues.filter(l => l.active);
  const totalMembers = leagues.reduce((sum, league) => sum + league.members.length, 0);

  const commonIcons = ['🏆', '⭐', '🥇', '🥈', '🥉', '💎', '👑', '🎯', '🔥', '⚡'];
  const commonColors = [
    '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0',
    '#0288d1', '#00796b', '#f57c00', '#c62828', '#7b1fa2'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Ligas de Promotores</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Agrupa promotores en ligas para benchmarking y competencia
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nueva Liga
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Benchmarking de Ligas:</strong> Los promotores de cada liga compiten entre sí.
        Las métricas se comparan automáticamente usando datos de HubSpot para calcular rankings y
        estadísticas promedio de la liga.
      </Alert>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <EmojiEventsIcon color="primary" />
                <Typography color="textSecondary">
                  Ligas Activas
                </Typography>
              </Box>
              <Typography variant="h4">
                {activeLeagues.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PeopleIcon color="success" />
                <Typography color="textSecondary">
                  Total de Miembros
                </Typography>
              </Box>
              <Typography variant="h4">
                {totalMembers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <GroupIcon color="warning" />
                <Typography color="textSecondary">
                  Promedio por Liga
                </Typography>
              </Box>
              <Typography variant="h4">
                {leagues.length > 0 ? Math.round(totalMembers / leagues.length) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Liga</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Miembros</TableCell>
              <TableCell>Creada</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leagues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay ligas configuradas. Crea la primera liga para comenzar el benchmarking.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leagues.map((league) => (
                <TableRow key={league.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar
                        sx={{
                          bgcolor: league.color || '#1976d2',
                          width: 36,
                          height: 36,
                          fontSize: '1.2rem'
                        }}
                      >
                        {league.icon || '🏆'}
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        {league.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {league.description || 'Sin descripción'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${league.members.length} miembros`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(league.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={league.active ? 'Activa' : 'Inactiva'}
                      color={league.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(league)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(league.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingLeague ? 'Editar Liga' : 'Nueva Liga'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre de la Liga"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Liga Plata Norte"
            />

            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción opcional de la liga"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Icono de la Liga
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {commonIcons.map(icon => (
                    <IconButton
                      key={icon}
                      onClick={() => handleInputChange('icon', icon)}
                      sx={{
                        border: formData.icon === icon ? 2 : 1,
                        borderColor: formData.icon === icon ? 'primary.main' : 'divider',
                        fontSize: '1.5rem'
                      }}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </Stack>
                <TextField
                  label="O escribe uno personalizado"
                  fullWidth
                  size="small"
                  value={formData.icon}
                  onChange={(e) => handleInputChange('icon', e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Color de la Liga
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {commonColors.map(color => (
                    <IconButton
                      key={color}
                      onClick={() => handleInputChange('color', color)}
                      sx={{
                        border: formData.color === color ? 2 : 1,
                        borderColor: formData.color === color ? 'primary.main' : 'divider',
                        bgcolor: color,
                        width: 40,
                        height: 40,
                        '&:hover': {
                          bgcolor: color,
                          opacity: 0.8
                        }
                      }}
                    />
                  ))}
                </Stack>
                <TextField
                  label="O escribe un color personalizado (hex)"
                  fullWidth
                  size="small"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#1976d2"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => `${option.displayName} (${option.email})`}
              value={users.filter(u => formData.members.includes(u.id))}
              onChange={(_, newValue) => {
                handleInputChange('members', newValue.map(u => u.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Miembros de la Liga"
                  required
                  placeholder="Seleccionar promotores..."
                  helperText={`${formData.members.length} miembros seleccionados (mínimo 2)`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.displayName}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
              }
              label="Liga Activa"
            />

            {formData.members.length > 0 && (
              <Alert severity="success">
                <strong>Vista Previa:</strong>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Avatar
                    sx={{
                      bgcolor: formData.color,
                      width: 32,
                      height: 32,
                      fontSize: '1rem'
                    }}
                  >
                    {formData.icon}
                  </Avatar>
                  <Typography variant="body2">
                    {formData.name || 'Nombre de la liga'} - {formData.members.length} miembros
                  </Typography>
                </Box>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingLeague ? 'Actualizar' : 'Crear Liga'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Ligas;
