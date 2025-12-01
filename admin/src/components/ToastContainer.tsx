import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useApp } from '../contexts/AppContext';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: { xs: 24 + index * 70, sm: 24 + index * 70 } }}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.severity as AlertColor}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default ToastContainer;
