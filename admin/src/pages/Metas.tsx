import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  LinearProgress,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import * as XLSX from 'xlsx';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ==================== INTERFACES DE METAS ====================

type MetaPeriodo = 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL';
type MetaTipo = 'GLOBAL' | 'LIGA' | 'USUARIO' | 'KIOSCO';

interface Meta {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: MetaTipo;
  periodo: MetaPeriodo;

  // Targets
  llamadasObjetivo: number;
  colocacionObjetivo: number; // en centavos
  tasaCierreObjetivo: number; // porcentaje

  // Asignación dinámica
  targetIds?: string[];        // IDs de ligas, usuarios o kioscos
  targetNames?: string[];      // Nombres para mostrar en UI

  // Fechas
  fechaInicio: Timestamp;
  fechaFin: Timestamp;

  activo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ==================== LABELS Y CONSTANTES ====================

const periodoLabels: Record<MetaPeriodo, string> = {
  'SEMANAL': 'Semanal',
  'MENSUAL': 'Mensual',
  'TRIMESTRAL': 'Trimestral'
};

const tipoLabels: Record<MetaTipo, string> = {
  'GLOBAL': 'Todos los Promotores',
  'LIGA': 'Por Liga',
  'USUARIO': 'Por Promotor Específico',
  'KIOSCO': 'Por Kiosco Específico'
};

// Columnas del CSV de metas por usuario
// Correo | Categoría | Producto | Meta Mensual | Meta Solicitudes (opcional)
const REQUIRED_COLUMNS = ['correo', 'meta mensual'];

interface ImportRow {
  row: number;
  correo: string;
  categoria: string;
  producto: string;
  metaMensual: number;
  metaSolicitudes: number;
  // Resueltos al importar
  userId?: string;
  userName?: string;
  errors: string[];
}

/** Calcula primer y último día del mes actual */
const getCurrentMonthRange = () => {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fin    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { inicio, fin };
};

const MES_NOMBRE = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date());

const Metas: React.FC = () => {
  // Estados para Metas
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string>('');

  // Estados para importación CSV/XLS
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Data para Metas
  const [metaFormData, setMetaFormData] = useState<Omit<Meta, 'id'>>({
    nombre: '',
    descripcion: '',
    tipo: 'GLOBAL',
    periodo: 'SEMANAL',
    llamadasObjetivo: 0,
    colocacionObjetivo: 0,
    tasaCierreObjetivo: 0,
    targetIds: [],
    targetNames: [],
    fechaInicio: Timestamp.now(),
    fechaFin: Timestamp.now(),
    activo: true
  });

  useEffect(() => {
    console.log('🚀 Metas v3.0 - Gestión de Metas');
    fetchMetas();
  }, []);
  // ==================== FETCH FUNCTIONS ====================

  const fetchMetas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'metas'));
      const metasData: Meta[] = [];
      querySnapshot.forEach((doc) => {
        metasData.push({ id: doc.id, ...doc.data() } as Meta);
      });
      setMetas(metasData.sort((a, b) => b.fechaInicio.seconds - a.fechaInicio.seconds));
    } catch (err) {
      setError('Error al cargar metas');
      console.error(err);
    }
  };
  // ==================== HANDLERS PARA METAS ====================

  const handleOpenMetaDialog = (meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta);
      setMetaFormData({
        nombre: meta.nombre,
        descripcion: meta.descripcion,
        tipo: meta.tipo,
        periodo: meta.periodo,
        llamadasObjetivo: meta.llamadasObjetivo,
        colocacionObjetivo: meta.colocacionObjetivo,
        tasaCierreObjetivo: meta.tasaCierreObjetivo,
        targetIds: meta.targetIds || [],
        targetNames: meta.targetNames || [],
        fechaInicio: meta.fechaInicio,
        fechaFin: meta.fechaFin,
        activo: meta.activo
      });
    } else {
      setEditingMeta(null);
      setMetaFormData({
        nombre: '',
        descripcion: '',
        tipo: 'GLOBAL',
        periodo: 'SEMANAL',
        llamadasObjetivo: 0,
        colocacionObjetivo: 0,
        tasaCierreObjetivo: 0,
        targetIds: [],
        targetNames: [],
        fechaInicio: Timestamp.now(),
        fechaFin: Timestamp.now(),
        activo: true
      });
    }
    setMetaDialogOpen(true);
  };

  const handleCloseMetaDialog = () => {
    setMetaDialogOpen(false);
    setEditingMeta(null);
    setError('');
  };

  const handleMetaInputChange = (field: keyof typeof metaFormData, value: any) => {
    setMetaFormData({ ...metaFormData, [field]: value });
  };

  const handleSubmitMeta = async () => {
    try {
      setError('');

      if (!metaFormData.nombre) {
        setError('El nombre de la meta es obligatorio');
        return;
      }

      const dataToSave: any = {
        nombre: metaFormData.nombre,
        descripcion: metaFormData.descripcion,
        tipo: metaFormData.tipo,
        periodo: metaFormData.periodo,
        llamadasObjetivo: Number(metaFormData.llamadasObjetivo),
        colocacionObjetivo: Number(metaFormData.colocacionObjetivo),
        tasaCierreObjetivo: Number(metaFormData.tasaCierreObjetivo),
        fechaInicio: metaFormData.fechaInicio,
        fechaFin: metaFormData.fechaFin,
        activo: metaFormData.activo,
        updatedAt: Timestamp.now()
      };

      if (metaFormData.targetIds && metaFormData.targetIds.length > 0) {
        dataToSave.targetIds = metaFormData.targetIds;
        dataToSave.targetNames = metaFormData.targetNames;
      }

      if (!editingMeta) {
        dataToSave.createdAt = Timestamp.now();
      }

      if (editingMeta) {
        await updateDoc(doc(db, 'metas', editingMeta.id), dataToSave);
      } else {
        await addDoc(collection(db, 'metas'), dataToSave);
      }

      await fetchMetas();
      handleCloseMetaDialog();
    } catch (err) {
      setError('Error al guardar la meta');
      console.error(err);
    }
  };

  const handleDeleteMeta = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta?')) {
      try {
        await deleteDoc(doc(db, 'metas', id));
        await fetchMetas();
      } catch (err) {
        setError('Error al eliminar la meta');
        console.error(err);
      }
    }
  };
  // ==================== IMPORT CSV/XLS ====================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (raw.length === 0) {
          setImportError('El archivo está vacío o no tiene filas de datos.');
          return;
        }

        // Normalizar headers a minúsculas para comparación
        const headers = Object.keys(raw[0]).map(h => h.trim().toLowerCase());
        const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
        if (missing.length > 0) {
          setImportError(`Columnas faltantes: ${missing.join(', ')}`);
          return;
        }

        // Helper para leer columna sin importar mayúsculas/tildes
        const get = (r: any, key: string) => {
          const match = Object.keys(r).find(k => k.trim().toLowerCase() === key);
          return match ? r[match] : '';
        };

        const rows: ImportRow[] = raw.map((r: any, idx: number) => {
          const errors: string[] = [];
          const correo        = String(get(r, 'correo') || '').trim().toLowerCase();
          const categoria     = String(get(r, 'categoría') || get(r, 'categoria') || '').trim();
          const producto      = String(get(r, 'producto') || '').trim();
          const metaMensual   = Number(get(r, 'meta mensual') || 0);
          const metaSol       = Number(get(r, 'meta solicitudes') || 0);

          if (!correo || !correo.includes('@')) errors.push('correo inválido');
          if (isNaN(metaMensual) || metaMensual <= 0) errors.push('Meta Mensual debe ser > 0');

          return { row: idx + 2, correo, categoria, producto, metaMensual, metaSolicitudes: metaSol, errors };
        });

        setImportRows(rows);
      } catch (err) {
        setImportError('Error al leer el archivo. Verifica que sea un CSV o Excel válido.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    const validRows = importRows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);

    // Cargar todos los usuarios para resolver email → {id, displayName}
    const usersSnap = await getDocs(collection(db, 'users'));
    const emailMap: Record<string, { id: string; name: string }> = {};
    usersSnap.forEach(d => {
      const data = d.data();
      const email = (data.email || '').toLowerCase();
      if (email) emailMap[email] = { id: d.id, name: data.displayName || data.email || email };
    });

    const { inicio, fin } = getCurrentMonthRange();
    const fechaInicio = Timestamp.fromDate(inicio);
    const fechaFin    = Timestamp.fromDate(fin);

    let ok = 0; let fail = 0;

    for (const row of validRows) {
      try {
        const userInfo = emailMap[row.correo];
        const targetIds   = userInfo ? [userInfo.id]   : [];
        const targetNames = userInfo ? [userInfo.name] : [row.correo];

        // Nombre legible: "Meta Mensual marzo 2026 – nombre"
        const label = userInfo ? userInfo.name : row.correo;
        const nombre = `Meta Mensual ${MES_NOMBRE} – ${label}`;

        await addDoc(collection(db, 'metas'), {
          nombre,
          descripcion: [row.categoria, row.producto].filter(Boolean).join(' · '),
          tipo: 'USUARIO' as MetaTipo,
          periodo: 'MENSUAL' as MetaPeriodo,
          // colocacionObjetivo en centavos (el monto del CSV viene en pesos)
          colocacionObjetivo: row.metaMensual * 100,
          llamadasObjetivo: row.metaSolicitudes,
          tasaCierreObjetivo: 0,
          targetIds,
          targetNames,
          // Email guardado para referencia aunque no haya doc en Firestore
          targetEmail: row.correo,
          producto: row.producto,
          categoria: row.categoria,
          fechaInicio,
          fechaFin,
          activo: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        ok++;
      } catch (err) {
        console.error('Error al guardar fila', row.row, err);
        fail++;
      }
    }

    setImportResult({ ok, fail });
    setImporting(false);
    await fetchMetas();
  };

  const handleDownloadTemplate = () => {
    const template = [
      { Correo: 'adrian.contreras@avivacredito.com', 'Categoría': 'G3', Producto: 'aviva_contigo',  'Meta Mensual': 124300, 'Meta Solicitudes': '' },
      { Correo: 'airet.cervantes@avivacredito.com',  'Categoría': 'G1', Producto: 'construrama',    'Meta Mensual': 136000, 'Meta Solicitudes': '' },
      { Correo: 'ejemplo@avivacredito.com',           'Categoría': 'G2', Producto: 'aviva_tu_negocio','Meta Mensual': 180000, 'Meta Solicitudes': 5 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Metas');
    XLSX.writeFile(wb, 'plantilla_metas.xlsx');
  };

  // ==================== UTILITY FUNCTIONS ====================

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(centavos / 100);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-MX');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Metas</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Configura metas para los promotores
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ==================== METAS ==================== */}
      <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Metas Definidas</Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Descargar plantilla Excel">
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                >
                  Plantilla
                </Button>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => { setImportDialogOpen(true); setImportRows([]); setImportError(''); setImportResult(null); }}
              >
                Importar CSV/XLS
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenMetaDialog()}
              >
                Nueva Meta
              </Button>
            </Box>
          </Box>
          {/* Input oculto para seleccionar archivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas Activas
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.activo).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas Globales
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.tipo === 'GLOBAL').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Metas por Liga
                  </Typography>
                  <Typography variant="h4">
                    {metas.filter(m => m.tipo === 'LIGA').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Llamadas</TableCell>
                  <TableCell>Colocación</TableCell>
                  <TableCell>Tasa Cierre</TableCell>
                  <TableCell>Vigencia</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metas.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {meta.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {meta.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={tipoLabels[meta.tipo]} size="small" variant="outlined" />
                      {meta.targetNames && meta.targetNames.length > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {meta.targetNames.join(', ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{periodoLabels[meta.periodo]}</TableCell>
                    <TableCell>{meta.llamadasObjetivo}</TableCell>
                    <TableCell>{formatCurrency(meta.colocacionObjetivo)}</TableCell>
                    <TableCell>{meta.tasaCierreObjetivo}%</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(meta.fechaInicio)} - {formatDate(meta.fechaFin)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={meta.activo ? 'Activa' : 'Inactiva'}
                        color={meta.activo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenMetaDialog(meta)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMeta(meta.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
      </Box>

      {/* ==================== DIALOG IMPORTAR CSV/XLS ==================== */}
      <Dialog open={importDialogOpen} onClose={() => !importing && setImportDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Importar Metas desde CSV / Excel</DialogTitle>
        <DialogContent>
          {importError && <Alert severity="error" sx={{ mb: 2 }}>{importError}</Alert>}
          {importResult && (
            <Alert severity={importResult.fail === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
              Importación completada: <strong>{importResult.ok} metas guardadas</strong>
              {importResult.fail > 0 && `, ${importResult.fail} fallidas`}
            </Alert>
          )}

          {importRows.length === 0 && !importResult && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" mb={2}>
                Selecciona tu archivo <strong>.csv</strong>, <strong>.xlsx</strong> o <strong>.xls</strong> de metas mensuales.
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Columnas requeridas: <code>Correo</code>, <code>Meta Mensual</code>
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Columnas opcionales: <code>Categoría</code>, <code>Producto</code>, <code>Meta Solicitudes</code>
              </Typography>
              <Alert severity="info" sx={{ textAlign: 'left', mb: 3 }}>
                • Las fechas se calculan automáticamente: del <strong>1 al último día del mes actual</strong><br />
                • <strong>Meta Mensual</strong>: monto en pesos (ej: 124300)<br />
                • <strong>Meta Solicitudes</strong>: número de solicitudes (opcional, puede dejarse vacío)
              </Alert>
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                Seleccionar archivo
              </Button>
            </Box>
          )}

          {importRows.length > 0 && !importResult && (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="body2">
                  <strong>{importRows.filter(r => r.errors.length === 0).length}</strong> filas válidas de {importRows.length} total
                  {importRows.some(r => r.errors.length > 0) && (
                    <Typography component="span" color="error" ml={1}>
                      ({importRows.filter(r => r.errors.length > 0).length} con errores — serán omitidas)
                    </Typography>
                  )}
                </Typography>
                <Button size="small" onClick={() => fileInputRef.current?.click()}>Cambiar archivo</Button>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Las metas se crearán para el mes actual ({MES_NOMBRE}), del día 1 al último día del mes.
              </Alert>
              {importing && <LinearProgress sx={{ mb: 2 }} />}
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Correo</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Meta Venta</TableCell>
                      <TableCell align="right">Meta Solicitudes</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importRows.map((row) => (
                      <TableRow key={row.row} sx={{ bgcolor: row.errors.length > 0 ? 'error.50' : 'inherit' }}>
                        <TableCell>{row.row}</TableCell>
                        <TableCell>{row.correo}</TableCell>
                        <TableCell>{row.categoria}</TableCell>
                        <TableCell>{row.producto}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(row.metaMensual)}
                        </TableCell>
                        <TableCell align="right">
                          {row.metaSolicitudes || '—'}
                        </TableCell>
                        <TableCell>
                          {row.errors.length === 0 ? (
                            <Tooltip title="Válida"><CheckCircleIcon color="success" fontSize="small" /></Tooltip>
                          ) : (
                            <Tooltip title={row.errors.join('; ')}><ErrorIcon color="error" fontSize="small" /></Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>Cerrar</Button>
          {importRows.length > 0 && !importResult && (
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing || importRows.filter(r => r.errors.length === 0).length === 0}
            >
              Importar {importRows.filter(r => r.errors.length === 0).length} metas
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ==================== DIALOG PARA CREAR/EDITAR META ==================== */}
      <Dialog open={metaDialogOpen} onClose={handleCloseMetaDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingMeta ? 'Editar Meta' : 'Nueva Meta'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de la Meta"
                value={metaFormData.nombre}
                onChange={(e) => handleMetaInputChange('nombre', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={metaFormData.descripcion}
                onChange={(e) => handleMetaInputChange('descripcion', e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Meta</InputLabel>
                <Select
                  value={metaFormData.tipo}
                  label="Tipo de Meta"
                  onChange={(e) => handleMetaInputChange('tipo', e.target.value)}
                >
                  <MenuItem value="GLOBAL">Todos los Promotores</MenuItem>
                  <MenuItem value="LIGA">Por Liga</MenuItem>
                  <MenuItem value="USUARIO">Por Promotor Específico</MenuItem>
                  <MenuItem value="KIOSCO">Por Kiosco Específico</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={metaFormData.periodo}
                  label="Período"
                  onChange={(e) => handleMetaInputChange('periodo', e.target.value)}
                >
                  <MenuItem value="SEMANAL">Semanal</MenuItem>
                  <MenuItem value="MENSUAL">Mensual</MenuItem>
                  <MenuItem value="TRIMESTRAL">Trimestral</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Llamadas Objetivo"
                value={metaFormData.llamadasObjetivo}
                onChange={(e) => handleMetaInputChange('llamadasObjetivo', e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Colocación Objetivo (MXN)"
                value={metaFormData.colocacionObjetivo / 100}
                onChange={(e) => handleMetaInputChange('colocacionObjetivo', Number(e.target.value) * 100)}
                helperText="Ingresa el monto en pesos"
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Tasa de Cierre Objetivo (%)"
                value={metaFormData.tasaCierreObjetivo}
                onChange={(e) => handleMetaInputChange('tasaCierreObjetivo', e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha de Inicio"
                value={metaFormData.fechaInicio.toDate().toISOString().split('T')[0]}
                onChange={(e) => handleMetaInputChange('fechaInicio', Timestamp.fromDate(new Date(e.target.value)))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha de Fin"
                value={metaFormData.fechaFin.toDate().toISOString().split('T')[0]}
                onChange={(e) => handleMetaInputChange('fechaFin', Timestamp.fromDate(new Date(e.target.value)))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={metaFormData.activo}
                    onChange={(e) => handleMetaInputChange('activo', e.target.checked)}
                  />
                }
                label="Meta Activa"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMetaDialog}>Cancelar</Button>
          <Button onClick={handleSubmitMeta} variant="contained">
            {editingMeta ? 'Guardar Cambios' : 'Crear Meta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Metas;
