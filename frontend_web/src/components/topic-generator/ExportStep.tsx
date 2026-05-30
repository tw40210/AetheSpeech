import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { GeneratedTopic } from '../../core/types';
import { apiClient } from '../../services/apiClient';
import type { Topic } from '../../core/types';

interface Props {
  topic: GeneratedTopic;
  onBack: () => void;
  onDone: () => void;
}

export default function ExportStep({ topic, onBack, onDone }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);

  const topicJson = JSON.stringify([topic], null, 2);

  const handleDownload = () => {
    const blob = new Blob([topicJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadError('');
    try {
      const blob = new Blob([topicJson], { type: 'application/json' });
      const file = new File([blob], 'topic.json', { type: 'application/json' });
      const result = await apiClient.postFile<Topic[]>('/topics/upload', file, 'file');
      setUploadedCount(result.length);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Your topic is ready
      </Typography>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {topic.name}
        </Typography>
        {topic.description && (
          <Typography variant="body2" color="text.secondary" mt={0.5} mb={1}>
            {topic.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {topic.labels.map((l) => (
            <Chip key={l.key} label={l.key} size="small" variant="outlined" color="primary" />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {topic.questions.length} questions
        </Typography>
      </Box>

      <Accordion disableGutters sx={{ mb: 3, border: 1, borderColor: 'divider', boxShadow: 'none', borderRadius: '8px !important' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={500}>
            Preview JSON ({topic.questions.length} questions)
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              fontSize: 12,
              fontFamily: 'monospace',
              bgcolor: '#1E272E',
              color: '#E0E0E0',
              overflowX: 'auto',
              maxHeight: 400,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
            }}
          >
            {topicJson}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Stack spacing={1.5} mb={3}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<DownloadRoundedIcon />}
          onClick={handleDownload}
        >
          Download JSON
        </Button>

        <Divider>or</Divider>

        {uploadedCount !== null ? (
          <Alert
            severity="success"
            icon={<CheckCircleRoundedIcon />}
            action={
              <Button color="inherit" size="small" onClick={onDone}>
                Go to Dashboard
              </Button>
            }
          >
            Topic uploaded successfully!
          </Alert>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadOutlinedIcon />}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload to My Topics'}
          </Button>
        )}

        {uploadError && (
          <Alert severity="error" onClose={() => setUploadError('')}>
            {uploadError}
          </Alert>
        )}
      </Stack>

      <Button variant="text" fullWidth onClick={onBack} disabled={uploading}>
        ← Back to edit
      </Button>
    </Box>
  );
}
