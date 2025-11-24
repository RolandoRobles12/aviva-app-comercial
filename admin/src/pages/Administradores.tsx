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
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Admin {
  id: string;
  email: string;
  nombre?: string;
  fechaAgregado: Date;
  agregadoPor?: string;
}

const Administradores: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [newNombre, setNewNombre] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      const adminsData: Admin[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        adminsData.push({
          id: doc.id,
          email: data.email,
          nombre: data.nombre,
          fechaAgregado: data.fechaAgregado?.toDate() || new Date(),
          agregadoPor: data.agregadoPor
        });
      });
      setAdmins(adminsData.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (err) {
      setError('Error al cargar administradores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setNewEmail('');
    setNewNombre('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!newEmail || !newEmail.includes('@')) {
        setError('Email inválido');
        return;
      }

      if (!newEmail.endsWith('@avivacredito.com')) {
        setError('Solo se permiten emails de @avivacredito.com');
        return;
      }

      // Verificar si ya existe
      const existingQuery = query(
        collection(db, 'admins'),
        where('email', '==', newEmail)
      );
      const existing = await getDocs(existingQuery);

      if (!existing.empty) {
        setError('Este email ya es administrador');
        return;
      }

      await addDoc(collection(db, 'admins'), {
        email: newEmail.toLowerCase().trim(),
        nombre: newNombre.trim() || null,
        fechaAgregado: new Date(),
        agregadoPor: 'panel-admin' // Puedes mejorar esto con el usuario actual
      });

      await fetchAdmins();
      handleCloseDialog();
    } catch (err) {
      setError('Error al agregar administrador');
      console.error(err);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === 'rolando.robles@avivacredito.com') {
      setError('No se puede eliminar al super admin');
      return;
    }

    if (window.confirm(`¿Eliminar a ${email} como administrador?`)) {
      try {
        await deleteDoc(doc(db, 'admins', id));
        await fetchAdmins();
      } catch (err) {
        setError('Error al eliminar administrador');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Administradores</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Usuarios con acceso administrativo a la app
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Agregar Admin
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Actualmente hardcodeado en MainActivity.kt (líneas 142-149):</strong>
        <br />
        • rolando.robles@avivacredito.com (super admin)
        <br />
        • jesica.silva@avivacredito.com
        <br />
        • christian.garcia@avivacredito.com
        <br />
        • fernando.cordova@avivacredito.com
        <br />
        • jose.romero@avivacredito.com
        <br />
        • ana.carmona@avivacredito.com
        <br />
        • angelica.garcia@avivacredito.com
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Fecha Agregado</TableCell>
              <TableCell>Agregado Por</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AdminPanelSettingsIcon fontSize="small" color="primary" />
                    {admin.email}
                    {admin.email === 'rolando.robles@avivacredito.com' && (
                      <Chip label="SUPER ADMIN" color="error" size="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{admin.nombre || '-'}</TableCell>
                <TableCell>
                  {admin.fechaAgregado.toLocaleDateString('es-MX')}
                </TableCell>
                <TableCell>{admin.agregadoPor || '-'}</TableCell>
                <TableCell align="right">
                  {admin.email !== 'rolando.robles@avivacredito.com' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(admin.id, admin.email)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Administrador</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              fullWidth
              required
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="usuario@avivacredito.com"
              helperText="Solo emails de @avivacredito.com"
            />
            <TextField
              label="Nombre (opcional)"
              fullWidth
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Administradores;
