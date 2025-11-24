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
  Chip,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Kiosk {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  validationRadius: number;
  isActive: boolean;
}

const Kioscos: React.FC = () => {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<Kiosk, 'id'>>({
    name: '',
    address: '',
    city: '',
    state: '',
    latitude: 0,
    longitude: 0,
    validationRadius: 100,
    isActive: true
  });

  useEffect(() => {
    fetchKiosks();
  }, []);

  const fetchKiosks = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'kiosks'));
      const kioskData: Kiosk[] = [];
      querySnapshot.forEach((doc) => {
        kioskData.push({ id: doc.id, ...doc.data() } as Kiosk);
      });
      setKiosks(kioskData);
    } catch (err) {
      setError('Error al cargar kioscos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (kiosk?: Kiosk) => {
    if (kiosk) {
      setEditingKiosk(kiosk);
      setFormData({
        name: kiosk.name,
        address: kiosk.address,
        city: kiosk.city,
        state: kiosk.state,
        latitude: kiosk.latitude,
        longitude: kiosk.longitude,
        validationRadius: kiosk.validationRadius,
        isActive: kiosk.isActive
      });
    } else {
      setEditingKiosk(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        latitude: 0,
        longitude: 0,
        validationRadius: 100,
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingKiosk(null);
    setError('');
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.name || !formData.address) {
        setError('Nombre y dirección son obligatorios');
        return;
      }

      if (editingKiosk) {
        // Actualizar
        await updateDoc(doc(db, 'kiosks', editingKiosk.id), formData);
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'kiosks'), formData);
      }

      await fetchKiosks();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar el kiosco');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este kiosco?')) {
      try {
        await deleteDoc(doc(db, 'kiosks', id));
        await fetchKiosks();
      } catch (err) {
        setError('Error al eliminar el kiosco');
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
        <Typography variant="h4">Kioscos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Agregar Kiosco
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Ciudad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Radio (m)</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {kiosks.map((kiosk) => (
              <TableRow key={kiosk.id}>
                <TableCell>{kiosk.name}</TableCell>
                <TableCell>{kiosk.address}</TableCell>
                <TableCell>{kiosk.city}</TableCell>
                <TableCell>{kiosk.state}</TableCell>
                <TableCell>
                  <a
                    href={`https://www.google.com/maps?q=${kiosk.latitude},${kiosk.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LocationOnIcon fontSize="small" />
                  </a>
                </TableCell>
                <TableCell>{kiosk.validationRadius}</TableCell>
                <TableCell>
                  <Chip
                    label={kiosk.isActive ? 'Activo' : 'Inactivo'}
                    color={kiosk.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(kiosk)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(kiosk.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingKiosk ? 'Editar Kiosco' : 'Agregar Kiosco'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            <TextField
              label="Dirección"
              fullWidth
              required
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Ciudad"
                fullWidth
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
              <TextField
                label="Estado"
                fullWidth
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Latitud"
                type="number"
                fullWidth
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                inputProps={{ step: 0.000001 }}
              />
              <TextField
                label="Longitud"
                type="number"
                fullWidth
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                inputProps={{ step: 0.000001 }}
              />
            </Box>
            <TextField
              label="Radio de validación (metros)"
              type="number"
              fullWidth
              value={formData.validationRadius}
              onChange={(e) => handleInputChange('validationRadius', parseInt(e.target.value))}
            />
            <Box>
              <Button
                variant={formData.isActive ? 'contained' : 'outlined'}
                onClick={() => handleInputChange('isActive', !formData.isActive)}
              >
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingKiosk ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Kioscos;
