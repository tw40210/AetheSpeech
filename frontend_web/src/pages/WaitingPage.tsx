import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { ReportFetchState, useReport } from '../context/ReportContext';
import type { AnswerAssessment } from '../core/types';

// ── Animations ───────────────────────────────────────────────────────────────

const fadeRotate = keyframes`
  0%   { transform: rotate(0deg);   opacity: 1;   }
  100% { transform: rotate(360deg); opacity: 0.2; }
`;

const ping = keyframes`
  75%, 100% { transform: scale(2.4); opacity: 0; }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

interface FadingSpinnerProps {
  size?: number;
  color?: string;
}

function FadingSpinner({ size = 80, color = '#5C6BC0' }: FadingSpinnerProps) {
  const dots = 8;
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: dots }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: '50%',
            bgcolor: color,
            top: '50%',
            left: '50%',
            transformOrigin: '0 0',
            transform: `rotate(${(i / dots) * 360}deg) translate(${size * 0.35}px) translate(-50%, -50%)`,
            opacity: 1 - (i / dots) * 0.8,
            animation: `${fadeRotate} ${dots * 0.15}s ${-(i * 0.15)}s linear infinite`,
          }}
        />
      ))}
    </Box>
  );
}

function PulsingDot() {
  return (
    <Box sx={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: 'warning.main',
          animation: `${ping} 1.4s cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: 'warning.main',
        }}
      />
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const secs = Math.max(0, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

type WaitLocationState = {
  answerIds?: string[];
};

export default function WaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { answerIds: contextAnswerIds, questions } = useInterview();
  const batchAnswerIds =
    (location.state as WaitLocationState | null)?.answerIds ?? contextAnswerIds;
  const {
    fetchState,
    error,
    submitBatch,
    startPolling,
    liveAssessments,
    liveReportStatus,
  } = useReport();

  const submittedRef = useRef(false);

  // Track when each assessment first becomes done/failed: assessmentId → epoch ms
  const doneAtRef = useRef<Record<string, number>>({});

  // Track when the report-generation phase started/finished (epoch ms).
  // "Started" = the moment all per-question assessments became terminal.
  const reportStartedAtRef = useRef<number | null>(null);
  const reportFinishedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (!batchAnswerIds || batchAnswerIds.length === 0) {
      navigate('/dashboard', { replace: true });
      return;
    }

    (async () => {
      const reportId = await submitBatch(batchAnswerIds);
      if (!reportId) return;

      startPolling(reportId, {
        onDone: () => navigate(`/report/${reportId}`, { replace: true }),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stamp done-at timestamps as soon as we see a completed assessment
  liveAssessments.forEach((a) => {
    if ((a.status === 'done' || a.status === 'failed') && !doneAtRef.current[a.id]) {
      doneAtRef.current[a.id] = Date.now();
    }
  });

  // Build quick-lookup map: questionId → assessment
  const byQuestionId: Record<string, AnswerAssessment> = {};
  liveAssessments.forEach((a) => {
    if (a.question_id) byQuestionId[a.question_id] = a;
  });

  // Derive report-generation phase indicators
  const allAnswersTerminal =
    questions.length > 0 &&
    questions.every((q) => {
      const a = byQuestionId[q.id];
      return a && (a.status === 'done' || a.status === 'failed');
    });

  if (allAnswersTerminal && reportStartedAtRef.current === null) {
    reportStartedAtRef.current = Date.now();
  }

  const isReportDone = liveReportStatus === 'done';
  const isReportFailed = liveReportStatus === 'failed';
  const isReportTerminal = isReportDone || isReportFailed;

  if (isReportTerminal && reportFinishedAtRef.current === null) {
    reportFinishedAtRef.current = Date.now();
  }

  let reportTimeLabel = '';
  if (isReportTerminal && reportStartedAtRef.current && reportFinishedAtRef.current) {
    reportTimeLabel = formatDuration(
      reportFinishedAtRef.current - reportStartedAtRef.current,
    );
  }

  /* ── Error state ── */
  if (fetchState === ReportFetchState.ERROR) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 72, color: 'error.main' }} />
          <Typography variant="h5" fontWeight="bold">
            Something went wrong
          </Typography>
          <Typography color="text.secondary">{error ?? 'An unknown error occurred'}</Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Back to Home
          </Button>
        </Box>
      </Box>
    );
  }

  /* ── Waiting / polling state ── */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          maxWidth: 500,
        }}
      >
        <FadingSpinner size={80} color="#5C6BC0" />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold">
            Analysing your answers…
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            AI is transcribing your speech, labeling key points, and preparing personalised
            feedback.
          </Typography>
        </Box>

        {/* Per-question progress list */}
        {questions.length > 0 && (
          <Card
            variant="outlined"
            sx={{ width: '100%', p: 2.5, borderRadius: 2 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 1.5, letterSpacing: 1 }}
            >
              Assessment progress
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {questions.map((q, i) => {
                const assessment = byQuestionId[q.id];
                const isDone = assessment?.status === 'done';
                const isFailed = assessment?.status === 'failed';
                const isCompleted = isDone || isFailed;

                let timeLabel = '';
                if (isCompleted && assessment) {
                  const doneAt = doneAtRef.current[assessment.id];
                  if (doneAt) {
                    timeLabel = formatDuration(
                      doneAt - new Date(assessment.created_at).getTime(),
                    );
                  }
                }

                return (
                  <Box
                    key={q.id}
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
                  >
                    {/* Status indicator */}
                    <Box sx={{ mt: '3px', flexShrink: 0 }}>
                      {isCompleted ? (
                        isDone ? (
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        ) : (
                          <HighlightOffIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        )
                      ) : (
                        <PulsingDot />
                      )}
                    </Box>

                    {/* Question text + timing */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isCompleted ? 'text.primary' : 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        <Box
                          component="span"
                          sx={{ fontWeight: 700, mr: 0.75, color: 'text.primary' }}
                        >
                          Q{i + 1}.
                        </Box>
                        {q.text}
                      </Typography>

                      {isCompleted && timeLabel && (
                        <Typography
                          variant="caption"
                          sx={{ color: isDone ? 'success.main' : 'error.main' }}
                        >
                          Processed in {timeLabel}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Report-generation row */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ mt: '3px', flexShrink: 0 }}>
                {isReportTerminal ? (
                  isReportDone ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  ) : (
                    <HighlightOffIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  )
                ) : allAnswersTerminal ? (
                  <PulsingDot />
                ) : (
                  // Reuse PulsingDot in muted "queued" form before its turn
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: 'action.disabledBackground',
                    }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <AutoAwesomeIcon
                    sx={{
                      fontSize: 16,
                      color: isReportDone
                        ? 'success.main'
                        : isReportFailed
                          ? 'error.main'
                          : allAnswersTerminal
                            ? 'warning.main'
                            : 'text.disabled',
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color:
                        isReportTerminal || allAnswersTerminal
                          ? 'text.primary'
                          : 'text.secondary',
                    }}
                  >
                    Generating personalised feedback
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {isReportDone
                    ? `Ready in ${reportTimeLabel}`
                    : isReportFailed
                      ? 'Failed to generate suggestions'
                      : allAnswersTerminal
                        ? 'Synthesising AI coaching suggestions…'
                        : 'Starts after all answers are processed'}
                </Typography>
              </Box>
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  );
}
