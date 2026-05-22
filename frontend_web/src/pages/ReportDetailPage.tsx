import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HomeIcon from '@mui/icons-material/Home';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LabeledText from '../components/LabeledText';
import type { AnswerAssessment, Report } from '../core/types';
import { useInterview } from '../context/InterviewContext';
import { ReportFetchState, useReport } from '../context/ReportContext';

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { fetchState, report, error, loadReport, reset } = useReport();
  const { reset: resetInterview } = useInterview();

  useEffect(() => {
    if (reportId) loadReport(reportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleHome = () => {
    resetInterview();
    reset();
    navigate('/dashboard', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit">
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flex: 1, textAlign: 'center' }}>
            Assessment Report
          </Typography>
          <IconButton onClick={handleHome}>
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
          <AssessmentTab assessment={assessments[outerTab - 1]} />
        )}
      </Box>
    </Box>
  );
}

/* ─────────────────── Overview ─────────────────── */

function OverviewTab({ suggestions }: { suggestions?: string }) {
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
          mb: 2,
        }}
      >
        <AutoAwesomeIcon color="primary" />
        <Typography fontWeight="bold" color="primary.main">
          AI Coaching Suggestions
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
        {suggestions ?? 'No suggestions available.'}
      </Typography>
    </Box>
  );
}

/* ─────────────────── Per-question ─────────────────── */

function AssessmentTab({ assessment }: { assessment: AnswerAssessment }) {
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
      <Tabs
        value={innerTab}
        onChange={(_, v: number) => setInnerTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        {panes.map((p) => (
          <Tab key={p.label} label={p.label} />
        ))}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>{panes[innerTab].content}</Box>
    </Box>
  );
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
