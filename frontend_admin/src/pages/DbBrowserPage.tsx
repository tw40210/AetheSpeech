import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TableInfo, TablePage } from '../core/types';
import { adminApiClient } from '../services/adminApiClient';
import JsonPayloadViewer from '../components/JsonPayloadViewer';
import { AdminConstants } from '../core/constants';

const TABLES_WITH_STATUS = ['answer_assessments', 'suggestion_reports'];
const TABLES_WITH_USER = ['users', 'topics', 'answer_assessments', 'suggestion_reports'];
const STATUS_OPTIONS = ['pending', 'processing', 'done', 'failed'];

export default function DbBrowserPage() {
  const { tableName } = useParams<{ tableName?: string }>();
  const navigate = useNavigate();

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [pageSize] = useState(AdminConstants.defaultPageSize);
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const [tableData, setTableData] = useState<TablePage | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [drawerRow, setDrawerRow] = useState<Record<string, unknown> | null>(null);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const data = await adminApiClient.get<TableInfo[]>('/admin/db/tables');
      setTables(data);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const loadTableData = useCallback(async () => {
    if (!tableName) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (userIdFilter.trim()) params.user_id = userIdFilter.trim();
      const data = await adminApiClient.get<TablePage>(`/admin/db/tables/${tableName}`, params);
      setTableData(data);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : String(err));
    } finally {
      setDataLoading(false);
    }
  }, [tableName, page, pageSize, statusFilter, userIdFilter]);

  useEffect(() => {
    setPage(0);
    setStatusFilter('');
    setUserIdFilter('');
    setTableData(null);
    setDataError(null);
  }, [tableName]);

  useEffect(() => {
    if (tableName) loadTableData();
  }, [tableName, loadTableData]);

  const handleTableSelect = (name: string) => {
    navigate(`/db/${name}`);
  };

  const truncate = (v: unknown, maxLen = 60): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  };

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Table list sidebar */}
      <Box
        sx={{
          width: 200,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white',
          pt: 2,
        }}
      >
        <Typography variant="caption" sx={{ px: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
          Tables
        </Typography>
        {tablesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            {tables.map((t) => (
              <Box
                key={t.name}
                onClick={() => handleTableSelect(t.name)}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: tableName === t.name ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRight: tableName === t.name ? '3px solid' : '3px solid transparent',
                  borderColor: tableName === t.name ? 'primary.main' : 'transparent',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {t.name}
                </Typography>
                <Chip label={t.count} size="small" sx={{ height: 18, fontSize: 10 }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2.5 }}>
        {!tableName ? (
          /* Overview: table cards */
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Database Overview
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {tables.map((t) => (
                <Paper
                  key={t.name}
                  elevation={0}
                  variant="outlined"
                  onClick={() => handleTableSelect(t.name)}
                  sx={{
                    p: 2.5,
                    width: 180,
                    cursor: 'pointer',
                    borderRadius: 2,
                    '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                    transition: 'all 0.15s',
                  }}
                >
                  <StorageIcon color="action" sx={{ mb: 1 }} />
                  <Typography variant="h5" fontWeight={700}>
                    {t.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.name}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          /* Table view */
          <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
                {tableName}
                {tableData && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({tableData.total} rows)
                  </Typography>
                )}
              </Typography>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={loadTableData} disabled={dataLoading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FilterListIcon fontSize="small" color="action" />
              {TABLES_WITH_STATUS.includes(tableName) && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="">All</MenuItem>
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {TABLES_WITH_USER.includes(tableName) && tableName !== 'users' && (
                <TextField
                  size="small"
                  label="User ID"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  onBlur={() => { if (userIdFilter !== '') { setPage(0); loadTableData(); } }}
                  placeholder="UUID"
                  sx={{ width: 280 }}
                />
              )}
              {(statusFilter || userIdFilter) && (
                <Button
                  size="small"
                  onClick={() => {
                    setStatusFilter('');
                    setUserIdFilter('');
                    setPage(0);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Box>

            {/* Error */}
            {dataError && <Alert severity="error" sx={{ mb: 2 }}>{dataError}</Alert>}

            {/* Table */}
            {dataLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : tableData ? (
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {tableData.columns.map((col) => (
                          <TableCell
                            key={col}
                            sx={{
                              fontWeight: 600,
                              bgcolor: '#FAFAFA',
                              whiteSpace: 'nowrap',
                              fontSize: 12,
                            }}
                          >
                            {col}
                            {tableData.masked_columns.includes(col) && (
                              <Chip label="masked" size="small" sx={{ ml: 0.5, fontSize: 9, height: 14 }} />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.rows.map((row, i) => (
                        <TableRow
                          key={i}
                          hover
                          onClick={() => setDrawerRow(row)}
                          sx={{ cursor: 'pointer' }}
                        >
                          {tableData.columns.map((col) => {
                            const val = row[col];
                            const isStatus = col === 'status';
                            return (
                              <TableCell key={col} sx={{ fontSize: 12, maxWidth: 240 }}>
                                {isStatus && typeof val === 'string' ? (
                                  <Chip
                                    label={val}
                                    size="small"
                                    color={
                                      val === 'done' ? 'success'
                                      : val === 'failed' ? 'error'
                                      : val === 'processing' ? 'warning'
                                      : 'default'
                                    }
                                    sx={{ fontSize: 11 }}
                                  />
                                ) : (
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: 200,
                                    }}
                                    title={val !== null && val !== undefined ? String(val) : ''}
                                  >
                                    {truncate(val)}
                                  </Box>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={tableData.total}
                  page={page}
                  rowsPerPage={pageSize}
                  rowsPerPageOptions={[pageSize]}
                  onPageChange={(_, p) => setPage(p)}
                />
              </Paper>
            ) : null}
          </Box>
        )}
      </Box>

      {/* Row detail drawer */}
      <Drawer
        anchor="right"
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        PaperProps={{ sx: { width: 480, p: 2.5 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
            Row Detail
          </Typography>
          <Button size="small" onClick={() => setDrawerRow(null)}>Close</Button>
        </Box>

        {drawerRow && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Quick actions */}
            {!!drawerRow.id && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {tableName === 'answer_assessments' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      navigate(`/prompt-lab?type=answer&id=${drawerRow.id}`);
                      setDrawerRow(null);
                    }}
                  >
                    Open in Prompt Lab
                  </Button>
                )}
                {tableName === 'suggestion_reports' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      navigate(`/prompt-lab?type=report&id=${drawerRow.id}`);
                      setDrawerRow(null);
                    }}
                  >
                    Open in Prompt Lab
                  </Button>
                )}
              </Box>
            )}
            <JsonPayloadViewer label="Full row data" value={drawerRow} maxHeight={600} />
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
