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
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
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
import type {
  HubSpotProperty,
  HubSpotPropertyFormData,
  HubSpotObjectType,
  HubSpotDataType
} from '../types/hubspotProperty';
import { DEFAULT_HUBSPOT_PROPERTIES } from '../types/hubspotProperty';

const HubSpotProperties: React.FC = () => {
  const [properties, setProperties] = useState<HubSpotProperty[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<HubSpotProperty | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [filterObjectType, setFilterObjectType] = useState<HubSpotObjectType | 'all'>('all');

  const [formData, setFormData] = useState<HubSpotPropertyFormData>({
    name: '',
    internalName: '',
    objectType: 'deals',
    dataType: 'text',
    description: '',
    active: true
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hubspotProperties'));
      const propertiesData: HubSpotProperty[] = [];
      querySnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() } as HubSpotProperty);
      });
      setProperties(propertiesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError('Error al cargar properties');
      console.error(err);
    }
  };

  const handleOpenDialog = (property?: HubSpotProperty) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name,
        internalName: property.internalName,
        objectType: property.objectType,
        dataType: property.dataType,
        description: property.description || '',
        active: property.active
      });
    } else {
      setEditingProperty(null);
      setFormData({
        name: '',
        internalName: '',
        objectType: 'deals',
        dataType: 'text',
        description: '',
        active: true
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProperty(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.name.trim()) {
        setError('El nombre es obligatorio');
        return;
      }

      if (!formData.internalName.trim()) {
        setError('El internal name es obligatorio');
        return;
      }

      const dataToSave: any = {
        name: formData.name.trim(),
        internalName: formData.internalName.trim(),
        objectType: formData.objectType,
        dataType: formData.dataType,
        description: formData.description?.trim() || null,
        active: formData.active,
        updatedAt: Timestamp.now(),
        createdBy: 'admin'
      };

      if (editingProperty) {
        await updateDoc(doc(db, 'hubspotProperties', editingProperty.id), dataToSave);
        setSuccess('Property actualizada exitosamente');
      } else {
        dataToSave.createdAt = Timestamp.now();
        await addDoc(collection(db, 'hubspotProperties'), dataToSave);
        setSuccess('Property creada exitosamente');
      }

      handleCloseDialog();
      fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al guardar la property');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta property? Esto podría romper métricas que la usen.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'hubspotProperties', id));
      setSuccess('Property eliminada');
      fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al eliminar la property');
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm(`¿Crear ${DEFAULT_HUBSPOT_PROPERTIES.length} properties predefinidas?`)) {
      return;
    }

    try {
      let created = 0;
      for (const property of DEFAULT_HUBSPOT_PROPERTIES) {
        // Verificar si ya existe
        const q = query(
          collection(db, 'hubspotProperties'),
          where('internalName', '==', property.internalName),
          where('objectType', '==', property.objectType)
        );
        const existing = await getDocs(q);

        if (existing.empty) {
          await addDoc(collection(db, 'hubspotProperties'), {
            ...property,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'system'
          });
          created++;
        }
      }

      setSuccess(`${created} properties creadas (${DEFAULT_HUBSPOT_PROPERTIES.length - created} ya existían)`);
      fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al crear properties predefinidas');
    }
  };

  const filteredProperties = filterObjectType === 'all'
    ? properties
    : properties.filter(p => p.objectType === filterObjectType);

  const getObjectTypeLabel = (type: HubSpotObjectType) => {
    const labels: Record<HubSpotObjectType, string> = {
      deals: 'Deals',
      contacts: 'Contactos',
      companies: 'Empresas'
    };
    return labels[type];
  };

  const getDataTypeLabel = (type: HubSpotDataType) => {
    const labels: Record<HubSpotDataType, string> = {
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      enum: 'Enum',
      boolean: 'Booleano'
    };
    return labels[type];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Properties de HubSpot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define el catálogo de campos (properties) de HubSpot que usarás en métricas, ligas, metas y bonos
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<StorageIcon />}
            onClick={handleSeedDefaults}
          >
            Crear Properties Predefinidas
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Property
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box mb={2}>
        <TextField
          select
          label="Filtrar por Objeto"
          value={filterObjectType}
          onChange={(e) => setFilterObjectType(e.target.value as any)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">Todos los objetos</MenuItem>
          <MenuItem value="deals">Deals</MenuItem>
          <MenuItem value="contacts">Contactos</MenuItem>
          <MenuItem value="companies">Empresas</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Internal Name</TableCell>
              <TableCell>Objeto</TableCell>
              <TableCell>Tipo de Dato</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProperties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay properties configuradas. Crea properties predefinidas o agrega una nueva.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {property.name}
                      </Typography>
                      {property.description && (
                        <Typography variant="caption" color="text.secondary">
                          {property.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'grey.100',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'inline-block'
                      }}
                    >
                      {property.internalName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getObjectTypeLabel(property.objectType)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getDataTypeLabel(property.dataType)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={property.active ? 'Activa' : 'Inactiva'}
                      size="small"
                      color={property.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(property)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(property.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProperty ? 'Editar Property' : 'Nueva Property'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Fecha Venta Vida"
              helperText="Nombre descriptivo para identificar la property"
            />

            <TextField
              label="Internal Name"
              fullWidth
              required
              value={formData.internalName}
              onChange={(e) => setFormData({ ...formData, internalName: e.target.value })}
              placeholder="Ej: fecha_venta_vida"
              helperText="Nombre exacto de la property en HubSpot (case-sensitive)"
              InputProps={{
                sx: { fontFamily: 'monospace' }
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Objeto de HubSpot"
                  fullWidth
                  required
                  value={formData.objectType}
                  onChange={(e) => setFormData({ ...formData, objectType: e.target.value as HubSpotObjectType })}
                >
                  <MenuItem value="deals">Deals</MenuItem>
                  <MenuItem value="contacts">Contactos</MenuItem>
                  <MenuItem value="companies">Empresas</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  select
                  label="Tipo de Dato"
                  fullWidth
                  required
                  value={formData.dataType}
                  onChange={(e) => setFormData({ ...formData, dataType: e.target.value as HubSpotDataType })}
                >
                  <MenuItem value="text">Texto</MenuItem>
                  <MenuItem value="number">Número</MenuItem>
                  <MenuItem value="date">Fecha</MenuItem>
                  <MenuItem value="enum">Enum</MenuItem>
                  <MenuItem value="boolean">Booleano</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe para qué se usa esta property..."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Property Activa"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProperty ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HubSpotProperties;
