import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContextStep from '../components/topic-generator/ContextStep';
import ExportStep from '../components/topic-generator/ExportStep';
import FrameworkStep from '../components/topic-generator/FrameworkStep';
import SampleQuestionStep from '../components/topic-generator/SampleQuestionStep';
import TopicInfoStep from '../components/topic-generator/TopicInfoStep';
import type {
  FrameworkSuggestion,
  GeneratedTopic,
  SampleQuestionResponse,
  TopicLabel,
} from '../core/types';
import { apiClient } from '../services/apiClient';

const STEPS = ['Context', 'Framework', 'Sample Question', 'Generate', 'Export'];

export default function TopicGeneratorPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');

  const [context, setContext] = useState('');
  const [suggestions, setSuggestions] = useState<FrameworkSuggestion[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<TopicLabel[]>([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(false);

  const [sampleQuestion, setSampleQuestion] = useState<SampleQuestionResponse | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [generatedTopic, setGeneratedTopic] = useState<GeneratedTopic | null>(null);

  const handleContextSubmit = async (ctx: string) => {
    setError('');
    setLoadingFrameworks(true);
    try {
      const resp = await apiClient.post<{ suggestions: FrameworkSuggestion[] }>(
        '/topic-generator/frameworks',
        { context: ctx },
      );
      setContext(ctx);
      setSuggestions(resp.suggestions);
      setSelectedLabels([]);
      setActiveStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFrameworks(false);
    }
  };

  const handleFrameworksNext = (labels: TopicLabel[]) => {
    setSelectedLabels(labels);
    setSampleQuestion(null);
    setActiveStep(2);
    fetchSampleQuestion(labels, null, null);
  };

  const fetchSampleQuestion = async (
    labels: TopicLabel[],
    current: SampleQuestionResponse | null,
    feedback: string | null,
  ) => {
    setError('');
    setLoadingSample(true);
    try {
      const resp = await apiClient.post<SampleQuestionResponse>(
        '/topic-generator/sample-question',
        {
          context,
          labels,
          current_sample: current ? { text: current.text, context: current.context } : undefined,
          user_feedback: feedback ?? undefined,
        },
      );
      setSampleQuestion(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSample(false);
    }
  };

  const handleSampleNext = (sample: SampleQuestionResponse) => {
    setSampleQuestion(sample);
    setActiveStep(3);
  };

  const handleGenerate = async (name: string, description: string) => {
    if (!sampleQuestion) return;
    setError('');
    setLoadingGenerate(true);
    try {
      const resp = await apiClient.post<GeneratedTopic>('/topic-generator/generate', {
        context,
        labels: selectedLabels,
        topic_name: name,
        topic_description: description || undefined,
        approved_sample: { text: sampleQuestion.text, context: sampleQuestion.context },
      });
      setGeneratedTopic(resp);
      setActiveStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleBack = () => {
    setError('');
    setActiveStep((s) => Math.max(0, s - 1));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default">
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/dashboard')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Create Topic with AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4, flex: 1 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <ContextStep loading={loadingFrameworks} onSubmit={handleContextSubmit} />
        )}

        {activeStep === 1 && (
          <FrameworkStep
            suggestions={suggestions}
            onNext={handleFrameworksNext}
            onBack={handleBack}
          />
        )}

        {activeStep === 2 && (
          <SampleQuestionStep
            sampleQuestion={sampleQuestion}
            loading={loadingSample}
            onRegenerate={(current, feedback) =>
              fetchSampleQuestion(selectedLabels, current, feedback)
            }
            onNext={handleSampleNext}
            onBack={handleBack}
          />
        )}

        {activeStep === 3 && (
          <TopicInfoStep
            loading={loadingGenerate}
            onGenerate={handleGenerate}
            onBack={handleBack}
          />
        )}

        {activeStep === 4 && generatedTopic && (
          <ExportStep
            topic={generatedTopic}
            onBack={handleBack}
            onDone={() => navigate('/dashboard')}
          />
        )}
      </Container>
    </Box>
  );
}
