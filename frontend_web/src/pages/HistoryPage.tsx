import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReportSummary } from '../core/types';
import { useReport } from '../context/ReportContext';

export default function HistoryPage() {
  const { history, loadHistory } = useReport();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory().finally(() => setLoading(false));
  }, [loadHistory]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold" sx={{ ml: 1 }}>
            Interview History
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, p: 2, maxWidth: 640, mx: 'auto', width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 10,
              gap: 1.5,
            }}
          >
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6">No interviews yet</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Complete your first interview to see reports here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {history.map((r) => (
              <HistoryCard key={r.id} report={r} onTap={() => navigate(`/report/${r.id}`)} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

interface HistoryCardProps {
  report: ReportSummary;
  onTap: () => void;
}

function HistoryCard({ report, onTap }: HistoryCardProps) {
  const isDone = report.status === 'done';
  const isFailed = report.status === 'failed';

  const color = isDone ? 'primary.main' : isFailed ? 'error.main' : 'text.secondary';
  const StatusIcon = isDone
    ? CheckCircleOutlineIcon
    : isFailed
    ? ErrorOutlineIcon
    : HourglassEmptyIcon;

  return (
    <Card elevation={1}>
      <CardActionArea onClick={isDone ? onTap : undefined} disabled={!isDone} sx={{ px: 1 }}>
        <ListItem
          secondaryAction={isDone ? <ChevronRightIcon sx={{ color: 'text.secondary' }} /> : null}
          disablePadding
          sx={{ py: 1 }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: color + '26' }}>
              <StatusIcon sx={{ color }} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography fontWeight={600}>
                {report.answer_count} Question{report.answer_count !== 1 ? 's' : ''}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {formatDate(report.created_at)} · {report.status.toUpperCase()}
              </Typography>
            }
          />
        </ListItem>
      </CardActionArea>
    </Card>
  );
}

function formatDate(isoString: string): string {
  const dt = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
