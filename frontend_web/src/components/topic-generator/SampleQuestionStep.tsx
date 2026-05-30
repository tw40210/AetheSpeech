import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import type { SampleQuestionResponse } from '../../core/types';

interface Props {
  sampleQuestion: SampleQuestionResponse | null;
  loading: boolean;
  onRegenerate: (current: SampleQuestionResponse | null, feedback: string | null) => void;
  onNext: (sample: SampleQuestionResponse) => void;
  onBack: () => void;
}

export default function SampleQuestionStep({ sampleQuestion, loading, onRegenerate, onNext, onBack }: Props) {
  const [editedText, setEditedText] = useState('');
  const [editedContext, setEditedContext] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (sampleQuestion) {
      setEditedText(sampleQuestion.text);
      setEditedContext(sampleQuestion.context ?? '');
    }
  }, [sampleQuestion]);

  const currentSample: SampleQuestionResponse | null = sampleQuestion
    ? { ...sampleQuestion, text: editedText, context: editedContext || undefined }
    : null;

  const handleRegenerate = () => {
    onRegenerate(currentSample, feedback.trim() || null);
    setFeedback('');
  };

  const handleNext = () => {
    if (!currentSample) return;
    onNext(currentSample);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Review sample question
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        The AI generated a sample question based on your context and labels. Edit it directly, or
        provide feedback and click "Regenerate". When you're happy, click "Use this question".
      </Typography>

      {loading && !sampleQuestion ? (
        <Box>
          <Skeleton variant="text" height={28} width="60%" />
          <Skeleton variant="rounded" height={80} sx={{ mt: 1 }} />
        </Box>
      ) : (
        <>
          <TextField
            label="Question text"
            fullWidth
            multiline
            minRows={3}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${editedText.length} / 500`}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Context hint (optional)"
            fullWidth
            value={editedContext}
            onChange={(e) => setEditedContext(e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText="Guidance shown to the practitioner alongside the question."
            disabled={loading}
            sx={{ mb: 2 }}
          />

          {sampleQuestion?.rationale && (
            <Accordion disableGutters sx={{ mb: 2, border: 1, borderColor: 'divider', boxShadow: 'none', borderRadius: '8px !important' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Why this question?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {sampleQuestion.rationale}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          <TextField
            label="Feedback / modification request (optional)"
            fullWidth
            placeholder="e.g. Make it more focused on risks, or make it harder"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <Button
            variant="outlined"
            fullWidth
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleRegenerate}
            disabled={loading}
            sx={{ mb: 3 }}
          >
            {loading ? 'Regenerating…' : 'Regenerate'}
          </Button>
        </>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} disabled={loading} sx={{ flex: 1 }}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!currentSample || !editedText.trim() || loading}
          sx={{ flex: 2 }}
        >
          Use this question →
        </Button>
      </Box>
    </Box>
  );
}
