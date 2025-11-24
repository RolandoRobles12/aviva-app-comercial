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
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface DynamicText {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  lastUpdated: Date;
}

const CATEGORIES = [
  'general',
  'home',
  'profile',
  'attendance',
  'metrics',
  'notifications',
  'errors',
  'success'
];

const TextosDinamicos: React.FC = () => {
  const [texts, setTexts] = useState<DynamicText[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingText, setEditingText] = useState<DynamicText | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<DynamicText, 'id' | 'lastUpdated'>>({
    key: '',
    value: '',
    description: '',
    category: 'general'
  });

  useEffect(() => {
    fetchTexts();
  }, []);

  const fetchTexts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'dynamic_texts'));
      const textData: DynamicText[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        textData.push({
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        } as DynamicText);
      });
      setTexts(textData);
    } catch (err) {
      setError('Error al cargar textos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (text?: DynamicText) => {
    if (text) {
      setEditingText(text);
      setFormData({
        key: text.key,
        value: text.value,
        description: text.description || '',
        category: text.category
      });
    } else {
      setEditingText(null);
      setFormData({
        key: '',
        value: '',
        description: '',
        category: 'general'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingText(null);
    setError('');
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.key || !formData.value) {
        setError('Key y valor son obligatorios');
        return;
      }

      const dataToSave = {
        ...formData,
        lastUpdated: new Date()
      };

      if (editingText) {
        // Actualizar
        await updateDoc(doc(db, 'dynamic_texts', editingText.id), dataToSave);
      } else {
        // Usar el key como ID del documento
        await setDoc(doc(db, 'dynamic_texts', formData.key), dataToSave);
      }

      await fetchTexts();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar el texto');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este texto?')) {
      try {
        await deleteDoc(doc(db, 'dynamic_texts', id));
        await fetchTexts();
      } catch (err) {
        setError('Error al eliminar el texto');
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
        <Typography variant="h4">Textos Dinámicos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Agregar Texto
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Última actualización</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {texts.map((text) => (
              <TableRow key={text.id}>
                <TableCell>
                  <code>{text.key}</code>
                </TableCell>
                <TableCell>{text.value}</TableCell>
                <TableCell>{text.category}</TableCell>
                <TableCell>{text.description}</TableCell>
                <TableCell>
                  {text.lastUpdated.toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(text)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(text.id)}
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
          {editingText ? 'Editar Texto' : 'Agregar Texto'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Key (identificador único)"
              fullWidth
              required
              disabled={!!editingText}
              value={formData.key}
              onChange={(e) => handleInputChange('key', e.target.value)}
              placeholder="home_welcome_message"
            />
            <TextField
              label="Valor"
              fullWidth
              required
              multiline
              rows={3}
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
              placeholder="Texto que se mostrará en la app"
            />
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.category}
                label="Categoría"
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="¿Dónde se usa este texto?"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingText ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TextosDinamicos;
