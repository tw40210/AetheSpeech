import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HomeIcon from '@mui/icons-material/Home';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LabeledText from '../components/LabeledText';
import type { AnswerAssessment, QuestionFeedback, Report, StructuredSuggestions } from '../core/types';
import { useInterview } from '../context/InterviewContext';
import { ReportFetchState, useReport } from '../context/ReportContext';

type ReportLocationState = { from?: 'history' };

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchState, report, error, loadReport, reset } = useReport();
  const { reset: resetInterview } = useInterview();
  const fromHistory = (location.state as ReportLocationState | null)?.from === 'history';

  useEffect(() => {
    if (reportId) loadReport(reportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleHome = () => {
    resetInterview();
    reset();
    navigate('/dashboard', { replace: true });
  };

  const handleBack = () => {
    navigate('/history');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar>
          {fromHistory ? (
            <IconButton edge="start" onClick={handleBack} aria-label="Back to history">
              <ArrowBackIcon />
            </IconButton>
          ) : null}
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              flex: 1,
              textAlign: fromHistory ? 'left' : 'center',
              ml: fromHistory ? 1 : 0,
            }}
          >
            Assessment Report
          </Typography>
          <IconButton onClick={handleHome} aria-label="Go to dashboard">
            <HomeIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {fetchState === ReportFetchState.IDLE ||
        fetchState === ReportFetchState.SUBMITTING ||
        fetchState === ReportFetchState.POLLING ? (
          <Box
            sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CircularProgress />
          </Box>
        ) : fetchState === ReportFetchState.ERROR ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Typography color="error">{error ?? 'Failed to load report'}</Typography>
          </Box>
        ) : report ? (
          <ReportBody report={report} />
        ) : null}
      </Box>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ReportBody({ report }: { report: Report }) {
  const [outerTab, setOuterTab] = useState(0);
  const assessments = report.assessments ?? [];

  const feedbackByIndex = useMemo(() => {
    const map = new Map<number, QuestionFeedback>();
    report.suggestions?.questions?.forEach((item) => map.set(item.question_index, item));
    return map;
  }, [report.suggestions]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        value={outerTab}
        onChange={(_, v: number) => setOuterTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Tab label="Overview" />
        {assessments.map((_, i) => (
          <Tab key={i} label={`Q${i + 1}`} />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {outerTab === 0 ? (
          <OverviewTab suggestions={report.suggestions} />
        ) : (
          <AssessmentTab
            assessment={assessments[outerTab - 1]}
            feedback={feedbackByIndex.get(outerTab)}
            questionLabel={`Question ${outerTab}`}
          />
        )}
      </Box>
    </Box>
  );
}

/* ─────────────────── Overview ─────────────────── */

function OverviewTab({ suggestions }: { suggestions?: StructuredSuggestions | null }) {
  const questions = suggestions?.questions ?? [];

  return (
    <Box sx={{ p: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          borderRadius: 3,
          bgcolor: 'primary.main' + '18',
          mb: 2.5,
        }}
      >
        <AutoAwesomeIcon color="primary" />
        <Box>
          <Typography fontWeight="bold" color="primary.main">
            AI Coaching Feedback
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Per-question strengths, improvements, and scores
          </Typography>
        </Box>
      </Box>

      {questions.length === 0 ? (
        <Typography color="text.secondary">No feedback available yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {questions.map((item) => (
            <QuestionFeedbackCard key={item.question_index} feedback={item} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/* ─────────────────── Per-question ─────────────────── */

function AssessmentTab({
  assessment,
  feedback,
  questionLabel,
}: {
  assessment: AnswerAssessment;
  feedback?: QuestionFeedback;
  questionLabel: string;
}) {
  const [innerTab, setInnerTab] = useState(0);

  const panes = [
    {
      label: 'Raw',
      content: <TextPane text={assessment.raw_transcript} emptyLabel="No transcript available" />,
    },
    {
      label: 'Labeled',
      content: <LabeledPane xmlText={assessment.labeled_transcript} />,
    },
    {
      label: 'Recommended',
      content: <LabeledPane xmlText={assessment.rephrased_transcript} />,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {feedback && (
        <Box sx={{ p: 2.5, pb: 0 }}>
          <QuestionFeedbackCard feedback={feedback} title={questionLabel} compact />
        </Box>
      )}

      <Tabs
        value={innerTab}
        onChange={(_, v: number) => setInnerTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, px: 1 }}
      >
        {panes.map((p) => (
          <Tab key={p.label} label={p.label} />
        ))}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>{panes[innerTab].content}</Box>
    </Box>
  );
}

function QuestionFeedbackCard({
  feedback,
  title,
  compact = false,
}: {
  feedback: QuestionFeedback;
  title?: string;
  compact?: boolean;
}) {
  const heading = title ?? `Question ${feedback.question_index}`;

  return (
    <Paper variant="outlined" sx={{ p: compact ? 2 : 2.5, borderRadius: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: feedback.question_snippet ? 1 : 2 }}
      >
        <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight="bold">
          {heading}
        </Typography>
        <ScoreChips scores={feedback.scores} />
      </Stack>

      {feedback.question_snippet && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, fontStyle: 'italic' }}
        >
          {feedback.question_snippet}
        </Typography>
      )}

      <ScoreBars scores={feedback.scores} />

      <Divider sx={{ my: 2 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
        <FeedbackList
          title="Strengths"
          icon={<CheckCircleOutlineIcon fontSize="small" color="success" />}
          items={feedback.positive_points}
          emptyLabel="No strengths noted."
        />
        <FeedbackList
          title="Needs Improvement"
          icon={<TipsAndUpdatesOutlinedIcon fontSize="small" color="warning" />}
          items={feedback.need_improvement_points}
          emptyLabel="No improvements noted."
        />
      </Stack>
    </Paper>
  );
}

function ScoreChips({ scores }: { scores: QuestionFeedback['scores'] }) {
  const items = [
    { label: 'Structure', value: scores.structure },
    { label: 'Native', value: scores.native },
    { label: 'Wording', value: scores.wording },
  ];

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Chip
          key={item.label}
          size="small"
          label={`${item.label}: ${item.value}/5`}
          color={scoreColor(item.value)}
          variant="outlined"
        />
      ))}
    </Stack>
  );
}

function ScoreBars({ scores }: { scores: QuestionFeedback['scores'] }) {
  const items = [
    { label: 'Structure', value: scores.structure },
    { label: 'Native fluency', value: scores.native },
    { label: 'Wording', value: scores.wording },
  ];

  return (
    <Stack spacing={1.25}>
      {items.map((item) => (
        <Box key={item.label}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              {item.value}/5
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={(item.value / 5) * 100}
            color={scoreColor(item.value)}
            sx={{ height: 8, borderRadius: 999 }}
          />
        </Box>
      ))}
    </Stack>
  );
}

function FeedbackList({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {emptyLabel}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((item, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
              <Box sx={{ mt: 0.35, flexShrink: 0 }}>{icon}</Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {item}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function scoreColor(value: number): 'error' | 'warning' | 'success' {
  if (value <= 2) return 'error';
  if (value <= 3) return 'warning';
  return 'success';
}

function TextPane({ text, emptyLabel }: { text?: string; emptyLabel: string }) {
  if (!text) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
      {text}
    </Typography>
  );
}

function LabeledPane({ xmlText }: { xmlText?: string }) {
  if (!xmlText) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No labeled text available.
      </Typography>
    );
  }
  return <LabeledText xmlText={xmlText} />;
}
