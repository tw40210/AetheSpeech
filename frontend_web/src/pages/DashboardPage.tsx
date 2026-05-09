import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import MicExternalOnRoundedIcon from '@mui/icons-material/MicExternalOnRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TopicOutlinedIcon from '@mui/icons-material/TopicOutlined';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
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
                    onSelect={() => setSelectedTopic(isSelected ? null : topic)}
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
            >
              Start Interview
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}

interface TopicCardProps {
  topic: Topic;
  selected: boolean;
  onSelect: () => void;
}

function TopicCard({ topic, selected, onSelect }: TopicCardProps) {
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
        <Typography
          variant="subtitle1"
          fontWeight={600}
          color={selected ? 'primary' : 'text.primary'}
          noWrap
        >
          {topic.name}
        </Typography>
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

      {selected && <CheckCircleRoundedIcon sx={{ color: 'primary.main', flexShrink: 0 }} />}
    </Box>
  );
}
