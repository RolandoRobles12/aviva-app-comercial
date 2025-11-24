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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Giro {
  id: string;
  nombre: string;
  codigo: string;
  montoCredito: number; // En centavos
  descripcion?: string;
  activo: boolean;
}

const Giros: React.FC = () => {
  const [giros, setGiros] = useState<Giro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGiro, setEditingGiro] = useState<Giro | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<Giro, 'id'>>({
    nombre: '',
    codigo: '',
    montoCredito: 7500, // $75.00 en centavos
    descripcion: '',
    activo: true
  });

  useEffect(() => {
    fetchGiros();
  }, []);

  const fetchGiros = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'giros_relevantes'));
      const girosData: Giro[] = [];
      querySnapshot.forEach((doc) => {
        girosData.push({ id: doc.id, ...doc.data() } as Giro);
      });
      setGiros(girosData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError('Error al cargar giros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (giro?: Giro) => {
    if (giro) {
      setEditingGiro(giro);
      setFormData({
        nombre: giro.nombre,
        codigo: giro.codigo,
        montoCredito: giro.montoCredito,
        descripcion: giro.descripcion || '',
        activo: giro.activo
      });
    } else {
      setEditingGiro(null);
      setFormData({
        nombre: '',
        codigo: '',
        montoCredito: 7500,
        descripcion: '',
        activo: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGiro(null);
    setError('');
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.nombre || !formData.codigo) {
        setError('Nombre y código son obligatorios');
        return;
      }

      if (editingGiro) {
        await updateDoc(doc(db, 'giros_relevantes', editingGiro.id), formData);
      } else {
        await addDoc(collection(db, 'giros_relevantes'), formData);
      }

      await fetchGiros();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar el giro');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este giro?')) {
      try {
        await deleteDoc(doc(db, 'giros_relevantes', id));
        await fetchGiros();
      } catch (err) {
        setError('Error al eliminar el giro');
        console.error(err);
      }
    }
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(centavos / 100);
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Catálogo de Giros</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Tipos de negocios relevantes para Aviva Tu Negocio
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Agregar Giro
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        Actualmente en AvivaConfig.kt: Abarrotes, Carnicerías, Tortillerías, Fruterías,
        Papelerías, Panaderías, Tlapalerías, Artesanías, Farmacias
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Monto de Crédito</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {giros.map((giro) => (
              <TableRow key={giro.id}>
                <TableCell><strong>{giro.nombre}</strong></TableCell>
                <TableCell><code>{giro.codigo}</code></TableCell>
                <TableCell>{formatCurrency(giro.montoCredito)}</TableCell>
                <TableCell>{giro.descripcion || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={giro.activo ? 'Activo' : 'Inactivo'}
                    color={giro.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(giro)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(giro.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGiro ? 'Editar Giro' : 'Agregar Giro'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre del Giro"
              fullWidth
              required
              value={formData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              placeholder="Ej: Abarrotes"
            />
            <TextField
              label="Código DENUE"
              fullWidth
              required
              value={formData.codigo}
              onChange={(e) => handleInputChange('codigo', e.target.value)}
              placeholder="Ej: 461110"
            />
            <TextField
              label="Monto de Crédito (MXN)"
              type="number"
              fullWidth
              value={formData.montoCredito / 100}
              onChange={(e) => handleInputChange('montoCredito', parseFloat(e.target.value) * 100)}
              inputProps={{ step: 0.50 }}
              helperText={`= ${formatCurrency(formData.montoCredito)}`}
            />
            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              rows={2}
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
            />
            <Box>
              <Button
                variant={formData.activo ? 'contained' : 'outlined'}
                onClick={() => handleInputChange('activo', !formData.activo)}
              >
                {formData.activo ? 'Activo' : 'Inactivo'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingGiro ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Giros;
