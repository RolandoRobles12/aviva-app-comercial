import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Checkbox,
  Toolbar,
  Typography,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useSearch } from '../hooks/useSearch';
import { useExport } from '../hooks/useExport';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  searchFields?: (keyof T)[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  exportEnabled?: boolean;
  exportFilename?: string;
  loading?: boolean;
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  title,
  searchFields = [],
  onRowClick,
  actions,
  selectable = false,
  onSelectionChange,
  exportEnabled = true,
  exportFilename = 'export',
  loading = false
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof T | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<string[]>([]);

  const { searchTerm, setSearchTerm, filteredData, clearSearch } = useSearch({
    data,
    searchFields
  });

  const { exportToCSV } = useExport();

  // Sorting
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return order === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, orderBy, order]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = paginatedData.map(n => n.id);
      setSelected(newSelected);
      if (onSelectionChange) {
        onSelectionChange(paginatedData);
      }
    } else {
      setSelected([]);
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  };

  const handleClick = (id: string, row: T) => {
    if (selectable) {
      const selectedIndex = selected.indexOf(id);
      let newSelected: string[] = [];

      if (selectedIndex === -1) {
        newSelected = [...selected, id];
      } else {
        newSelected = selected.filter(s => s !== id);
      }

      setSelected(newSelected);
      if (onSelectionChange) {
        const selectedRows = data.filter(d => newSelected.includes(d.id));
        onSelectionChange(selectedRows);
      }
    } else if (onRowClick) {
      onRowClick(row);
    }
  };

  const handleExport = () => {
    const exportColumns = columns.map(col => ({
      key: col.key,
      label: col.label
    }));

    exportToCSV(filteredData, exportColumns, { filename: `${exportFilename}.csv` });
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      {(title || searchFields.length > 0 || selected.length > 0) && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            ...(selected.length > 0 && {
              bgcolor: 'primary.light'
            })
          }}
        >
          {selected.length > 0 ? (
            <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
              {selected.length} seleccionado(s)
            </Typography>
          ) : (
            <>
              {title && (
                <Typography sx={{ flex: '1 1 100%' }} variant="h6">
                  {title}
                </Typography>
              )}
              {searchFields.length > 0 && (
                <TextField
                  size="small"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={clearSearch}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ minWidth: 250 }}
                />
              )}
            </>
          )}

          {exportEnabled && selected.length === 0 && (
            <Tooltip title="Exportar CSV">
              <IconButton onClick={handleExport}>
                <FileDownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < paginatedData.length}
                    checked={paginatedData.length > 0 && selected.length === paginatedData.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  align={column.align || 'left'}
                  style={{ width: column.width }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.key}
                      direction={orderBy === column.key ? order : 'asc'}
                      onClick={() => handleRequestSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {actions && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0) + (selectable ? 1 : 0)} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0) + (selectable ? 1 : 0)} align="center">
                  No hay datos disponibles
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const isItemSelected = isSelected(row.id);

                return (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleClick(row.id, row)}
                    role={selectable ? 'checkbox' : undefined}
                    aria-checked={selectable ? isItemSelected : undefined}
                    selected={isItemSelected}
                    sx={{ cursor: onRowClick || selectable ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox checked={isItemSelected} />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} align={column.align || 'left'}>
                        {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
}

export default DataTable;
