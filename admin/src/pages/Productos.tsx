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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Product {
  id: string;
  name: string; // Nombre mostrado (ej: "Aviva Tu Negocio")
  code: string; // Código interno (ej: "aviva_tu_negocio")
  category: string; // Categoría del producto
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const CATEGORIES = [
  'Productos Aviva',
  'Supermercados',
  'Tiendas Departamentales',
  'Electrónica y Muebles',
  'Ferreterías',
  'Clubes de Precio',
  'Ópticas',
  'Otro'
];

const Productos: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    code: '',
    category: 'Productos Aviva',
    isActive: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'products'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      setProducts(productsData);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      // Edit existing product
      setEditingProduct(product);
      setFormData({
        name: product.name,
        code: product.code,
        category: product.category,
        isActive: product.isActive
      });
    } else {
      // Create new product
      setEditingProduct(null);
      setFormData({
        name: '',
        code: '',
        category: 'Productos Aviva',
        isActive: true
      });
    }

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      category: 'Productos Aviva',
      isActive: true
    });
  };

  const generateCodeFromName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Validate required fields
      if (!formData.name) {
        setError('El nombre del producto es obligatorio');
        return;
      }

      // Generate code if not provided
      const code = formData.code || generateCodeFromName(formData.name);

      // Check if code already exists (only for new products or if code changed)
      if (!editingProduct || editingProduct.code !== code) {
        const existingProduct = products.find(p => p.code === code && p.id !== editingProduct?.id);
        if (existingProduct) {
          setError(`Ya existe un producto con el código "${code}"`);
          return;
        }
      }

      const productData: Partial<Product> = {
        name: formData.name,
        code,
        category: formData.category || 'Otro',
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        updatedAt: Timestamp.now()
      };

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        setSuccess('Producto actualizado exitosamente');
      } else {
        // Create new product
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: Timestamp.now()
        });
        setSuccess('Producto creado exitosamente');
      }

      handleCloseDialog();
      fetchProducts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Error al guardar producto');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', product.id));
      setSuccess('Producto eliminado exitosamente');
      fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Error al eliminar producto');
    }
  };

  const getCategoryColor = (category: string): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (category) {
      case 'Productos Aviva':
        return 'success';
      case 'Supermercados':
        return 'primary';
      case 'Tiendas Departamentales':
        return 'info';
      case 'Electrónica y Muebles':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Cargando productos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gestión de Productos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los tipos de productos disponibles para los kioscos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Producto
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay productos registrados
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                      {product.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.category}
                      color={getCategoryColor(product.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.isActive ? 'Activo' : 'Inactivo'}
                      color={product.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(product)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(product)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar producto */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre del Producto"
              fullWidth
              value={formData.name || ''}
              onChange={e => {
                setFormData({
                  ...formData,
                  name: e.target.value,
                  // Auto-generate code if creating new product
                  ...(editingProduct ? {} : { code: generateCodeFromName(e.target.value) })
                });
              }}
              placeholder="Ej: Aviva Tu Negocio"
              required
              helperText="Nombre visible en los dropdowns"
            />

            <TextField
              label="Código Interno"
              fullWidth
              value={formData.code || ''}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ej: aviva_tu_negocio"
              required
              helperText="Código único (snake_case, sin espacios ni caracteres especiales)"
            />

            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.category || 'Productos Aviva'}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                label="Categoría"
              >
                {CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.isActive !== undefined ? formData.isActive : true}
                onChange={e => setFormData({ ...formData, isActive: e.target.value as boolean })}
                label="Estado"
              >
                <MenuItem value={true as any}>Activo</MenuItem>
                <MenuItem value={false as any}>Inactivo</MenuItem>
              </Select>
            </FormControl>

            {!editingProduct && formData.code && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="caption">
                  <strong>Vista previa del código:</strong> {formData.code}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingProduct ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Productos;
