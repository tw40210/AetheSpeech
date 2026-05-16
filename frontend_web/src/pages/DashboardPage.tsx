import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import MicExternalOnRoundedIcon from '@mui/icons-material/MicExternalOnRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TopicOutlinedIcon from '@mui/icons-material/TopicOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppConstants } from '../core/constants';
import type { Topic } from '../core/types';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { apiClient } from '../services/apiClient';

export default function DashboardPage() {
  const { email, logout } = useAuth();
  const interview = useInterview();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [startingInterview, setStartingInterview] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ownTopicCount = topics?.filter((t) => t.is_own).length ?? 0;

  const loadTopics = async () => {
    setLoadingTopics(true);
    setTopicsError('');
    try {
      const data = await apiClient.get<Topic[]>('/topics');
      setTopics(data);
    } catch (e) {
      setTopicsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    loadTopics();
    interview.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartInterview = async () => {
    if (!selectedTopic) return;
    setStartingInterview(true);
    try {
      interview.setSelectedTopic(selectedTopic);
      await interview.loadQuestions(selectedTopic.id, AppConstants.questionsPerSession);
      navigate('/interview/prepare');
    } catch (e) {
      setTopicsError(e instanceof Error ? e.message : String(e));
    } finally {
      setStartingInterview(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    setDeletingId(topicId);
    try {
      await apiClient.delete(`/topics/${topicId}`);
      if (selectedTopic?.id === topicId) setSelectedTopic(null);
      setTopics((prev) => prev?.filter((t) => t.id !== topicId) ?? null);
    } catch (e) {
      setTopicsError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const username = email ? email.split('@')[0] : null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
            AetheSpeech
          </Typography>
          <Tooltip title="Test microphone">
            <IconButton onClick={() => navigate('/device-test')}>
              <MicExternalOnRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="History">
            <IconButton onClick={() => navigate('/history')}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 640,
          mx: 'auto',
          width: '100%',
        }}
      >
        {loadingTopics ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : topicsError ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Alert severity="error" sx={{ width: '100%' }}>{topicsError}</Alert>
            <Button onClick={loadTopics}>Retry</Button>
          </Box>
        ) : (
          <>
            <Typography variant="h6" fontWeight="bold">
              Welcome{username ? `, ${username}` : ''}!
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select a topic to practise
            </Typography>

            <Button
              variant="outlined"
              startIcon={<MicExternalOnRoundedIcon />}
              fullWidth
              sx={{ mb: 2 }}
              onClick={() => navigate('/device-test')}
            >
              Test your microphone
            </Button>

            {/* Topic list */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                mb: 2,
              }}
            >
              {topics?.map((topic) => {
                const isSelected = selectedTopic?.id === topic.id;
                return (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    selected={isSelected}
                    deleting={deletingId === topic.id}
                    onSelect={() => setSelectedTopic(isSelected ? null : topic)}
                    onDelete={topic.is_own ? () => handleDeleteTopic(topic.id) : undefined}
                  />
                );
              })}
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={
                startingInterview ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <PlayArrowRoundedIcon />
                )
              }
              disabled={!selectedTopic || startingInterview}
              onClick={handleStartInterview}
              sx={{ mb: 1.5 }}
            >
              Start Interview
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => setUploadOpen(true)}
              disabled={ownTopicCount >= AppConstants.maxUserTopics}
            >
              Upload Your Own Topic
              {ownTopicCount > 0 && (
                <Chip
                  label={`${ownTopicCount} / ${AppConstants.maxUserTopics}`}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: 11 }}
                />
              )}
            </Button>
            {ownTopicCount >= AppConstants.maxUserTopics && (
              <Typography variant="caption" color="text.secondary" textAlign="center" mt={0.5}>
                You've reached the {AppConstants.maxUserTopics}-topic limit.
              </Typography>
            )}
          </>
        )}
      </Box>

      <UploadTopicDialog
        open={uploadOpen}
        remainingSlots={AppConstants.maxUserTopics - ownTopicCount}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          loadTopics();
        }}
      />
    </Box>
  );
}

// ── Topic card ────────────────────────────────────────────────

interface TopicCardProps {
  topic: Topic;
  selected: boolean;
  deleting: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function TopicCard({ topic, selected, deleting, onSelect, onDelete }: TopicCardProps) {
  return (
    <Box
      onClick={onSelect}
      sx={{
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 3,
        p: 2,
        cursor: 'pointer',
        bgcolor: selected ? 'primary.main' + '14' : 'background.paper',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'primary.main' + '0A',
        },
      }}
    >
      <TopicOutlinedIcon
        sx={{
          color: selected ? 'primary.main' : 'text.secondary',
          fontSize: 32,
          mt: 0.25,
          flexShrink: 0,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            color={selected ? 'primary' : 'text.primary'}
            noWrap
          >
            {topic.name}
          </Typography>
          {topic.is_own && (
            <Tooltip title="Your topic">
              <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Tooltip>
          )}
        </Box>
        {topic.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 1,
            }}
          >
            {topic.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {topic.labels?.map((l) => (
            <Chip key={l.key} label={l.key} size="small" sx={{ fontSize: 11, height: 20 }} />
          ))}
        </Box>
      </Box>

      {selected && !onDelete && (
        <CheckCircleRoundedIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
      )}

      {onDelete && (
        <Tooltip title="Delete topic">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            sx={{ flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            {deleting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <DeleteOutlineRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Upload dialog ─────────────────────────────────────────────

interface UploadTopicDialogProps {
  open: boolean;
  remainingSlots: number;
  onClose: () => void;
  onUploaded: () => void;
}

const sampleTopicDownloadUrl = new URL(
  '/topics/sample',
  AppConstants.baseUrl || window.location.origin,
).href;

function UploadTopicDialog({ open, remainingSlots, onClose, onUploaded }: UploadTopicDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const reset = () => {
    setSelectedFile(null);
    setError('');
    setSuccessCount(null);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessCount(null);
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.endsWith('.json')) {
      setError('Please select a .json file.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(f);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    setSuccessCount(null);
    try {
      const result = await apiClient.postFile<Topic[]>('/topics/upload', selectedFile, 'file');
      setSuccessCount(result.length);
      setTimeout(() => {
        onUploaded();
        reset();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Your Own Topic</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Upload a <strong>.json</strong> file matching the{' '}
          <Link
            href="data:application/json;charset=utf-8,%5B%0A%20%20%7B%0A%20%20%20%20%22name%22%3A%20%22My%20Topic%22%2C%0A%20%20%20%20%22description%22%3A%20%22Optional%20description%22%2C%0A%20%20%20%20%22labels%22%3A%20%5B%7B%20%22key%22%3A%20%22A%22%2C%20%22name%22%3A%20%22Label%20A%22%20%7D%5D%2C%0A%20%20%20%20%22questions%22%3A%20%5B%7B%20%22text%22%3A%20%22Your%20question%3F%22%2C%20%22context%22%3A%20%22Optional%20hint%22%20%7D%5D%0A%20%20%7D%0A%5D"
            download="sample_topic.json"
            underline="always"
          >
            sample format
          </Link>
          . You can upload up to{' '}
          <strong>{remainingSlots}</strong> more topic{remainingSlots !== 1 ? 's' : ''}.
        </Typography>

        <Box
          component="ul"
          sx={{ typography: 'caption', color: 'text.secondary', pl: 2.5, mt: 0, mb: 2 }}
        >
          <li>Topic name: max 100 characters</li>
          <li>Description: max 500 characters</li>
          <li>Label key: max 20 chars · label name: max 100 chars · up to 20 labels</li>
          <li>Question text &amp; context: max 500 characters each · up to 50 questions</li>
        </Box>

        <Button
          variant="outlined"
          size="small"
          component="a"
          href={sampleTopicDownloadUrl}
          download="sample_seed.json"
          startIcon={<DownloadRoundedIcon />}
          fullWidth
          sx={{ mb: 1 }}
        >
          Download sample file
        </Button>

        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileRoundedIcon />}
          fullWidth
          sx={{ mb: 1 }}
        >
          {selectedFile ? selectedFile.name : 'Choose JSON file'}
          <input
            hidden
            accept="application/json,.json"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {successCount !== null && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {successCount} topic{successCount !== 1 ? 's' : ''} uploaded successfully!
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
