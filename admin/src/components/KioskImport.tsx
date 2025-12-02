import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { collection, addDoc, Timestamp, GeoPoint } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Kiosk, ProductType } from '../types/kiosk';
import { PRODUCT_TYPES, MEXICAN_STATES } from '../types/kiosk';

interface ImportRow {
  row: number;
  name: string;
  productType: string;
  city: string;
  state: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  radiusMeters?: string;
  hubId?: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const KioskImport: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      alert('El archivo debe contener al menos un encabezado y una fila de datos');
      return;
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.findIndex(h => h.includes('nombre') || h === 'name');
    const productIdx = header.findIndex(h => h.includes('producto') || h.includes('product') || h === 'type');
    const cityIdx = header.findIndex(h => h.includes('ciudad') || h === 'city');
    const stateIdx = header.findIndex(h => h.includes('estado') || h === 'state');
    const latIdx = header.findIndex(h => h.includes('lat'));
    const lngIdx = header.findIndex(h => h.includes('lng') || h.includes('lon'));
    const addressIdx = header.findIndex(h => h.includes('direcci') || h === 'address');
    const radiusIdx = header.findIndex(h => h.includes('radio') || h === 'radius');
    const hubIdIdx = header.findIndex(h => h.includes('hub') || h === 'id');

    // Parse data rows
    const data: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue; // Skip invalid rows

      data.push({
        row: i + 1,
        name: values[nameIdx] || '',
        productType: values[productIdx] || '',
        city: values[cityIdx] || '',
        state: values[stateIdx] || '',
        latitude: latIdx >= 0 ? values[latIdx] : undefined,
        longitude: lngIdx >= 0 ? values[lngIdx] : undefined,
        address: addressIdx >= 0 ? values[addressIdx] : undefined,
        radiusMeters: radiusIdx >= 0 ? values[radiusIdx] : undefined,
        hubId: hubIdIdx >= 0 ? values[hubIdIdx] : undefined,
        status: 'pending'
      });
    }

    setImportData(data);
  };

  const validateRow = (row: ImportRow): { valid: boolean; error?: string } => {
    if (!row.name) return { valid: false, error: 'Nombre requerido' };
    if (!row.productType) return { valid: false, error: 'Tipo de producto requerido' };
    if (!row.city) return { valid: false, error: 'Ciudad requerida' };
    if (!row.state) return { valid: false, error: 'Estado requerido' };

    // Validate product type
    const validProductType = PRODUCT_TYPES.find(
      pt => pt.value === row.productType || pt.label.toLowerCase() === row.productType.toLowerCase()
    );
    if (!validProductType) {
      return { valid: false, error: `Tipo de producto inválido: ${row.productType}` };
    }

    // Validate state
    if (!MEXICAN_STATES.includes(row.state)) {
      return { valid: false, error: `Estado inválido: ${row.state}` };
    }

    // Validate coordinates if provided
    if (row.latitude || row.longitude) {
      if (!row.latitude || !row.longitude) {
        return { valid: false, error: 'Debe proporcionar latitud Y longitud' };
      }
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lng)) {
        return { valid: false, error: 'Coordenadas inválidas' };
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { valid: false, error: 'Coordenadas fuera de rango' };
      }
    }

    return { valid: true };
  };

  const normalizeProductType = (productType: string): ProductType => {
    const pt = PRODUCT_TYPES.find(
      p => p.value === productType || p.label.toLowerCase() === productType.toLowerCase()
    );
    return pt?.value || 'bodega_aurrera';
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    const updatedData = [...importData];

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];

      // Validate row
      const validation = validateRow(row);
      if (!validation.valid) {
        row.status = 'error';
        row.error = validation.error;
        setImportData([...updatedData]);
        setProgress(((i + 1) / updatedData.length) * 100);
        continue;
      }

      try {
        // Prepare kiosk data
        const kioskData: Partial<Kiosk> = {
          name: row.name,
          productType: normalizeProductType(row.productType),
          city: row.city,
          state: row.state,
          address: row.address,
          radiusOverride: row.radiusMeters ? parseInt(row.radiusMeters) : 100,
          coordinates: row.latitude && row.longitude
            ? new GeoPoint(parseFloat(row.latitude), parseFloat(row.longitude))
            : null,
          hubId: row.hubId || null,
          requiresPresence: true,
          status: 'ACTIVE',
          // Use default weekly schedule
          workHoursStart: 9,
          workHoursEnd: 19,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Save to Firestore
        await addDoc(collection(db, 'kiosks'), kioskData);

        row.status = 'success';
      } catch (error: any) {
        console.error('Error importing kiosk:', error);
        row.status = 'error';
        row.error = error.message || 'Error desconocido';
      }

      setImportData([...updatedData]);
      setProgress(((i + 1) / updatedData.length) * 100);
    }

    setImporting(false);
    onSuccess();
  };

  const downloadTemplate = () => {
    const template = `nombre,tipo_producto,ciudad,estado,latitud,longitud,direccion,radio_metros,hub_id
Bodega Aurrera Centro,bodega_aurrera,Ciudad de México,Ciudad de México,19.432608,-99.133209,Av. Principal 123,100,KIO001
Construrama Norte,construrama,Monterrey,Nuevo León,25.686614,-100.316116,Blvd. Norte 456,150,KIO002
Aviva Contigo Sur,aviva_contigo,Guadalajara,Jalisco,20.659699,-103.349609,Calle Sur 789,120,KIO003`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_kioscos.csv';
    link.click();
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setImportData([]);
      setProgress(0);
      onClose();
    }
  };

  const successCount = importData.filter(r => r.status === 'success').length;
  const errorCount = importData.filter(r => r.status === 'error').length;
  const pendingCount = importData.filter(r => r.status === 'pending').length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Importar Kioscos Masivamente
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Formato del archivo CSV:</strong>
            </Typography>
            <Typography variant="caption" component="div">
              • Columnas: nombre, tipo_producto, ciudad, estado, latitud, longitud, direccion, radio_metros, hub_id
            </Typography>
            <Typography variant="caption" component="div">
              • Tipos de producto válidos: bodega_aurrera, aviva_contigo, construrama
            </Typography>
            <Typography variant="caption" component="div">
              • El hub_id es un identificador interno (no de HubSpot)
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
            >
              Descargar Plantilla
            </Button>

            <Button
              variant="contained"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={importing}
            >
              Seleccionar Archivo CSV
              <input
                type="file"
                hidden
                accept=".csv,.txt"
                onChange={handleFileChange}
              />
            </Button>
          </Box>

          {file && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Archivo seleccionado: <strong>{file.name}</strong>
            </Typography>
          )}
        </Box>

        {importData.length > 0 && (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Exitosos: ${successCount}`}
                color="success"
                size="small"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`Errores: ${errorCount}`}
                color="error"
                size="small"
              />
              <Chip
                label={`Pendientes: ${pendingCount}`}
                color="default"
                size="small"
              />
            </Box>

            {importing && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                  Importando... {Math.round(progress)}%
                </Typography>
              </Box>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fila</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Ciudad</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importData.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.productType}</TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell>{row.state}</TableCell>
                      <TableCell>
                        {row.status === 'pending' && <Chip label="Pendiente" size="small" />}
                        {row.status === 'success' && (
                          <Chip icon={<CheckCircleIcon />} label="Exitoso" color="success" size="small" />
                        )}
                        {row.status === 'error' && (
                          <Chip
                            icon={<ErrorIcon />}
                            label={row.error || 'Error'}
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {importData.length > 0 && successCount > 0 ? 'Cerrar' : 'Cancelar'}
        </Button>
        {importData.length > 0 && pendingCount > 0 && (
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            disabled={importing}
          >
            Importar {pendingCount} Kioscos
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default KioskImport;
