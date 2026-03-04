import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Box, FormControlLabel, Switch, TextField,
  Typography, Divider, CircularProgress,
} from '@mui/material';

export interface WorkDayConfig {
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
  active: boolean;
}

export type WorkSchedule = {
  domingo:   WorkDayConfig;
  lunes:     WorkDayConfig;
  martes:    WorkDayConfig;
  miercoles: WorkDayConfig;
  jueves:    WorkDayConfig;
  viernes:   WorkDayConfig;
  sabado:    WorkDayConfig;
};

export const DAY_KEYS: (keyof WorkSchedule)[] = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
];

export const DAY_FULL_LABELS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

export const DEFAULT_SCHEDULE: WorkSchedule = {
  domingo:   { start: '09:00', end: '18:00', active: false },
  lunes:     { start: '09:00', end: '18:00', active: true },
  martes:    { start: '09:00', end: '18:00', active: true },
  miercoles: { start: '09:00', end: '18:00', active: true },
  jueves:    { start: '09:00', end: '18:00', active: true },
  viernes:   { start: '09:00', end: '18:00', active: true },
  sabado:    { start: '10:00', end: '14:00', active: true },
};

interface Props {
  open: boolean;
  schedule: WorkSchedule;
  title?: string;
  onClose: () => void;
  onSave: (s: WorkSchedule) => Promise<void>;
}

const JornadaModal: React.FC<Props> = ({
  open,
  schedule,
  title = 'Configurar Jornada Laboral',
  onClose,
  onSave,
}) => {
  const [local, setLocal] = useState<WorkSchedule>(schedule);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(schedule); }, [schedule, open]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {DAY_KEYS.map((key, i) => {
            const cfg = local[key];
            return (
              <Box key={key}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={cfg.active}
                        onChange={(e) =>
                          setLocal((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], active: e.target.checked },
                          }))
                        }
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80 }}>
                        {DAY_FULL_LABELS[i]}
                      </Typography>
                    }
                    sx={{ m: 0, mr: 1 }}
                  />
                  <TextField
                    type="time"
                    size="small"
                    label="Inicio"
                    value={cfg.start}
                    disabled={!cfg.active}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], start: e.target.value },
                      }))
                    }
                    sx={{ width: 130 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="time"
                    size="small"
                    label="Fin"
                    value={cfg.end}
                    disabled={!cfg.active}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], end: e.target.value },
                      }))
                    }
                    sx={{ width: 130 }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                {i < DAY_KEYS.length - 1 && <Divider sx={{ mt: 1.5 }} />}
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JornadaModal;
