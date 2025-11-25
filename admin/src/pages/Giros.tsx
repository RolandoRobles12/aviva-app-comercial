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
  FormControlLabel,
  Switch
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

// Coincide exactamente con GiroRelevante de AvivaConfig.kt
interface Giro {
  id: string;
  codigo: string;
  nombre: string;
  montoMinimoCentavos: number;
  montoMaximoCentavos: number;
  descripcion: string;
  palabrasClave: string[];
  activo: boolean;
}

const Giros: React.FC = () => {
  const [giros, setGiros] = useState<Giro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGiro, setEditingGiro] = useState<Giro | null>(null);
  const [error, setError] = useState<string>('');
  const [palabrasClaveInput, setPalabrasClaveInput] = useState('');

  const [formData, setFormData] = useState<Omit<Giro, 'id'>>({
    codigo: '',
    nombre: '',
    montoMinimoCentavos: 75000, // $750.00
    montoMaximoCentavos: 150000, // $1,500.00
    descripcion: '',
    palabrasClave: [],
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
        codigo: giro.codigo,
        nombre: giro.nombre,
        montoMinimoCentavos: giro.montoMinimoCentavos,
        montoMaximoCentavos: giro.montoMaximoCentavos,
        descripcion: giro.descripcion,
        palabrasClave: giro.palabrasClave,
        activo: giro.activo
      });
      setPalabrasClaveInput(giro.palabrasClave.join(', '));
    } else {
      setEditingGiro(null);
      setFormData({
        codigo: '',
        nombre: '',
        montoMinimoCentavos: 75000,
        montoMaximoCentavos: 150000,
        descripcion: '',
        palabrasClave: [],
        activo: true
      });
      setPalabrasClaveInput('');
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

  const handlePalabrasClaveChange = (value: string) => {
    setPalabrasClaveInput(value);
    const palabras = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    setFormData({ ...formData, palabrasClave: palabras });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.nombre || !formData.codigo) {
        setError('Nombre y código son obligatorios');
        return;
      }

      if (formData.montoMinimoCentavos >= formData.montoMaximoCentavos) {
        setError('El monto mínimo debe ser menor al monto máximo');
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

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Actualmente hardcodeado en AvivaConfig.kt (líneas 12-85):</strong>
        <br />
        9 giros: Abarrotes, Carnicerías, Tortillerías, Fruterías, Papelerías, Panaderías, Tlapalerías, Artesanías, Farmacias
        <br />
        <strong>Para aplicar cambios:</strong> La app Android debe leer de Firestore en lugar del código hardcodeado.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Código DENUE</TableCell>
              <TableCell>Monto Mínimo</TableCell>
              <TableCell>Monto Máximo</TableCell>
              <TableCell>Palabras Clave</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {giros.map((giro) => (
              <TableRow key={giro.id}>
                <TableCell><strong>{giro.nombre}</strong></TableCell>
                <TableCell><code>{giro.codigo}</code></TableCell>
                <TableCell>{formatCurrency(giro.montoMinimoCentavos)}</TableCell>
                <TableCell>{formatCurrency(giro.montoMaximoCentavos)}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {giro.palabrasClave.map((palabra, idx) => (
                      <Chip key={idx} label={palabra} size="small" variant="outlined" />
                    ))}
                  </Box>
                </TableCell>
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
              helperText="Código del catálogo DENUE de INEGI"
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Monto Mínimo (MXN)"
                type="number"
                fullWidth
                value={formData.montoMinimoCentavos / 100}
                onChange={(e) => handleInputChange('montoMinimoCentavos', parseFloat(e.target.value) * 100)}
                inputProps={{ step: 50 }}
                helperText={`= ${formatCurrency(formData.montoMinimoCentavos)}`}
              />
              <TextField
                label="Monto Máximo (MXN)"
                type="number"
                fullWidth
                value={formData.montoMaximoCentavos / 100}
                onChange={(e) => handleInputChange('montoMaximoCentavos', parseFloat(e.target.value) * 100)}
                inputProps={{ step: 50 }}
                helperText={`= ${formatCurrency(formData.montoMaximoCentavos)}`}
              />
            </Box>
            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={2}
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Ej: Tiendas de abarrotes y misceláneas"
            />
            <TextField
              label="Palabras Clave"
              fullWidth
              value={palabrasClaveInput}
              onChange={(e) => handlePalabrasClaveChange(e.target.value)}
              placeholder="Ej: abarrotes, miscelanea, tienda, minisuper"
              helperText="Separadas por comas. Usadas para búsqueda y matching."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.activo}
                  onChange={(e) => handleInputChange('activo', e.target.checked)}
                />
              }
              label={formData.activo ? 'Giro Activo' : 'Giro Inactivo'}
            />
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
