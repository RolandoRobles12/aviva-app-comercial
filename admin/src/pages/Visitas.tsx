import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ── Types ──────────────────────────────────────────────────────────────────

interface VisitStatus {
  id: string;
  label: string;
  color: string;
  code: string;
  order: number;
}

interface Visit {
  id: string;
  businessName: string;
  businessType?: string;
  address?: string;
  status: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  productLine?: string;
  notes?: string;
  timestamp: Timestamp;
}

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  productLine?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

const STATUS_COLORS: Record<string, string> = {
  solicitud_creada: 'success',
  no_interesado: 'error',
  programada: 'warning',
  no_aplica: 'default',
};

// ── Main Component ─────────────────────────────────────────────────────────

const Visitas: React.FC = () => {
  // Visits data
  const [visits, setVisits] = useState<Visit[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<VisitStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Status configuration dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<VisitStatus | null>(null);
  const [statusForm, setStatusForm] = useState({ label: '', color: '#16b877', code: '', order: 0 });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchVisits(), fetchUsers(), fetchProducts(), fetchStatuses()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisits = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'visits'), orderBy('timestamp', 'desc')));
      const data: Visit[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Visit));
      setVisits(data);
    } catch (e) {
      console.error('Error al cargar visitas:', e);
      setError('Error al cargar visitas. Verifica permisos de Firestore.');
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({
        id: d.id,
        displayName: d.data().displayName || d.data().email || '',
        email: d.data().email || '',
        productLine: d.data().productLine,
      })));
    } catch { /* ignorar */ }
  };

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'products'), orderBy('name', 'asc')));
      setProducts(snap.docs
        .filter((d) => d.data().isActive !== false)
        .map((d) => ({ id: d.id, name: d.data().name || '', code: d.data().code || '' })));
    } catch { /* ignorar */ }
  };

  const fetchStatuses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'visitStatuses'), orderBy('order', 'asc')));
      if (snap.empty) {
        // Defaults si no hay ninguno configurado
        setStatuses([
          { id: 'default_1', label: 'Solicitud creada', color: '#16b877', code: 'solicitud_creada', order: 0 },
          { id: 'default_2', label: 'No interesado',   color: '#EF4444', code: 'no_interesado',   order: 1 },
          { id: 'default_3', label: 'Programada',       color: '#F59E0B', code: 'programada',       order: 2 },
          { id: 'default_4', label: 'No aplica',        color: '#9CA3AF', code: 'no_aplica',        order: 3 },
        ]);
      } else {
        setStatuses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VisitStatus)));
      }
    } catch { /* ignorar */ }
  };

  // ── Status CRUD ─────────────────────────────────────────────────────────

  const openStatusDialog = (s?: VisitStatus) => {
    if (s) {
      setEditingStatus(s);
      setStatusForm({ label: s.label, color: s.color, code: s.code, order: s.order });
    } else {
      setEditingStatus(null);
      setStatusForm({ label: '', color: '#16b877', code: '', order: statuses.length });
    }
    setStatusDialogOpen(true);
  };

  const saveStatus = async () => {
    if (!statusForm.label.trim() || !statusForm.code.trim()) return;
    const data = {
      label: statusForm.label.trim(),
      color: statusForm.color,
      code: statusForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
      order: Number(statusForm.order),
    };
    if (editingStatus && !editingStatus.id.startsWith('default_')) {
      await updateDoc(doc(db, 'visitStatuses', editingStatus.id), data);
    } else {
      await addDoc(collection(db, 'visitStatuses'), data);
    }
    setStatusDialogOpen(false);
    fetchStatuses();
  };

  const deleteStatus = async (s: VisitStatus) => {
    if (s.id.startsWith('default_')) return;
    if (!window.confirm(`¿Eliminar el estado "${s.label}"?`)) return;
    await deleteDoc(doc(db, 'visitStatuses', s.id));
    fetchStatuses();
  };

  // ── Filtered visits ──────────────────────────────────────────────────────

  const usersForFilter = filterProduct === 'all'
    ? users
    : users.filter((u) => u.productLine?.toLowerCase() === filterProduct.toLowerCase());

  const filteredVisits = visits.filter((v) => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (filterUser !== 'all' && v.userId !== filterUser && v.userEmail !== filterUser) return false;
    if (filterProduct !== 'all') {
      const userForVisit = users.find((u) => u.id === v.userId || u.email === v.userEmail);
      if (userForVisit && userForVisit.productLine?.toLowerCase() !== filterProduct.toLowerCase()) return false;
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + 'T00:00:00');
      if (v.timestamp.toDate() < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59');
      if (v.timestamp.toDate() > to) return false;
    }
    return true;
  });

  const getStatusLabel = (code: string) =>
    statuses.find((s) => s.code === code)?.label || code;

  const getStatusColor = (code: string): string =>
    statuses.find((s) => s.code === code)?.color || '#9CA3AF';

  const formatDate = (ts: Timestamp) =>
    ts.toDate().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getUserName = (v: Visit) =>
    v.userName || users.find((u) => u.id === v.userId || u.email === v.userEmail)?.displayName || v.userEmail || '—';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Visitas</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Visualiza y filtra todas las visitas registradas por los vendedores
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openStatusDialog()}>
          Configurar estados
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Status chips */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          Estados de visita configurados
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          {statuses.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              size="small"
              sx={{ bgcolor: s.color + '22', color: s.color, fontWeight: 600, borderColor: s.color, border: '1px solid' }}
              onDelete={s.id.startsWith('default_') ? undefined : () => deleteStatus(s)}
              onClick={() => openStatusDialog(s)}
            />
          ))}
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <FilterListIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Producto</InputLabel>
              <Select value={filterProduct} label="Producto"
                onChange={(e) => { setFilterProduct(e.target.value); setFilterUser('all'); }}>
                <MenuItem value="all">Todos los productos</MenuItem>
                {products.map((p) => <MenuItem key={p.id} value={p.code}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Vendedor</InputLabel>
              <Select value={filterUser} label="Vendedor" onChange={(e) => setFilterUser(e.target.value)}>
                <MenuItem value="all">Todos los vendedores</MenuItem>
                {usersForFilter.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.displayName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={filterStatus} label="Estado" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">Todos los estados</MenuItem>
                {statuses.map((s) => <MenuItem key={s.code} value={s.code}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth size="small" type="date" label="Desde"
              value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth size="small" type="date" label="Hasta"
              value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Mostrando {filteredVisits.length} de {visits.length} visitas
        </Typography>
      </Paper>

      {/* Visits table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Negocio</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Comentarios</TableCell>
              <TableCell>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>Cargando visitas...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay visitas que coincidan con los filtros.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits.map((visit) => {
                const userForVisit = users.find((u) => u.id === visit.userId || u.email === visit.userEmail);
                return (
                  <TableRow key={visit.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{visit.businessName || '—'}</Typography>
                      {visit.businessType && (
                        <Typography variant="caption" color="text.secondary">{visit.businessType}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{getUserName(visit)}</Typography>
                      {visit.userEmail && (
                        <Typography variant="caption" color="text.secondary">{visit.userEmail}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {userForVisit?.productLine
                          ? (products.find((p) => p.code === userForVisit.productLine)?.name || userForVisit.productLine)
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(visit.status)}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(visit.status) + '22',
                          color: getStatusColor(visit.status),
                          borderColor: getStatusColor(visit.status),
                          border: '1px solid',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={visit.address || ''}>
                        <Typography variant="caption" sx={{ maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {visit.address || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={visit.notes || ''}>
                        <Typography variant="caption" sx={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {visit.notes || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(visit.timestamp)}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Status Config Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingStatus ? 'Editar estado' : 'Nuevo estado de visita'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre del estado"
              fullWidth
              value={statusForm.label}
              onChange={(e) => {
                const label = e.target.value;
                const code = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                setStatusForm((prev) => ({ ...prev, label, code }));
              }}
              placeholder="Ej: En seguimiento"
            />
            <TextField
              label="Código interno"
              fullWidth
              value={statusForm.code}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, code: e.target.value }))}
              helperText="Se usa para sincronizar con la app Android"
            />
            <Box>
              <Typography variant="caption" color="text.secondary">Color</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <input
                  type="color"
                  value={statusForm.color}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, color: e.target.value }))}
                  style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
                <Typography variant="body2">{statusForm.color}</Typography>
                <Chip
                  label={statusForm.label || 'Vista previa'}
                  size="small"
                  sx={{ bgcolor: statusForm.color + '22', color: statusForm.color, border: `1px solid ${statusForm.color}`, fontWeight: 600 }}
                />
              </Box>
            </Box>
            <TextField
              label="Orden (0 = primero)"
              type="number"
              fullWidth
              value={statusForm.order}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, order: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveStatus} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Visitas;
