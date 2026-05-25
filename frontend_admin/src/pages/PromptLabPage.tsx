import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CodeIcon from '@mui/icons-material/Code';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QueryPromptDialog from '../components/QueryPromptDialog';
import StepCard from '../components/StepCard';
import WorkflowStepper from '../components/WorkflowStepper';
import PromptEditor from '../components/PromptEditor';
import type {
  AnswerStepId,
  AnswerWorkflow,
  ChatMessage,
  ChatPayload,
  QuestionFeedback,
  ReportStepId,
  ReportWorkflow,
  StepOverride,
  StepResult,
  StructuredSuggestions,
  WorkflowDefaults,
} from '../core/types';
import { parseStructuredSuggestions } from '../core/suggestions';
import { adminApiClient } from '../services/adminApiClient';

type PipelineTab = 'answer' | 'report';

// ── Editable per-step state ───────────────────────────────────────────────────

interface EditableStep {
  systemPrompt: string;
  userContent: string;
  model: string;
  temperature: number;
}

function payloadToEditable(payload: ChatPayload | null): EditableStep | null {
  if (!payload) return null;
  const sys = payload.messages.find((m) => m.role === 'system')?.content ?? '';
  const usr = payload.messages.find((m) => m.role === 'user')?.content ?? '';
  return { systemPrompt: sys, userContent: usr, model: payload.model, temperature: payload.temperature };
}

function editableToPayload(editable: EditableStep): ChatPayload {
  return {
    model: editable.model,
    temperature: editable.temperature,
    messages: [
      { role: 'system', content: editable.systemPrompt },
      { role: 'user', content: editable.userContent },
    ],
  };
}

function editableToOverride(editable: EditableStep): StepOverride {
  const payload = editableToPayload(editable);
  return { model: payload.model, temperature: payload.temperature, messages: payload.messages };
}

interface PromptPreviewState {
  title: string;
  payload: ChatPayload | null;
  note?: string;
}

// ── Small shared UI pieces ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, mb: 0.5, display: 'block' }}
    >
      {children}
    </Typography>
  );
}

function formatDbOutput(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function DbOutput({ text }: { text: unknown }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider sx={{ mb: 1.5 }} />
      <SectionLabel>Current DB output</SectionLabel>
      <Box
        component="pre"
        sx={{ m: 0, p: 1.5, bgcolor: '#F5F5F5', borderRadius: 1, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto' }}
      >
        {formatDbOutput(text)}
      </Box>
    </Box>
  );
}

function StepOutput({ result, label }: { result: StepResult | null | undefined; label: string }) {
  if (!result) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5 }} />
      <SectionLabel>{`${label} output`}</SectionLabel>
      {result.error ? (
        <Alert severity="error" sx={{ fontSize: 12 }}>{result.error}</Alert>
      ) : (
        <Box
          component="pre"
          sx={{ m: 0, p: 1.5, bgcolor: '#1E272E', color: '#B0BEC5', borderRadius: 1, fontSize: 12, fontFamily: '"Roboto Mono", monospace', whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto' }}
        >
          {result.output ?? '(empty)'}
        </Box>
      )}
    </Box>
  );
}

// ── Structured suggestions output ────────────────────────────────────────────

interface QScores { structure: number; native: number; wording: number; }

function scoreColor(v: number): 'error' | 'warning' | 'success' {
  if (v <= 2) return 'error';
  if (v <= 3) return 'warning';
  return 'success';
}

function QuestionReferencePanel({
  assessments,
}: {
  assessments: ReportWorkflow['assessments'];
}) {
  if (assessments.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Questions in this report (source text for question_snippet)
      </Typography>
      <Stack spacing={1}>
        {assessments.map((a, i) => (
          <Box key={a.id}>
            <Typography variant="caption" fontWeight={700}>Question {i + 1}</Typography>
            <Typography variant="body2" color="text.secondary">
              {a.question_text ?? '(question text unavailable)'}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function StructuredSuggestionsView({
  data,
  questionTexts,
}: {
  data: StructuredSuggestions;
  questionTexts?: string[];
}) {
  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      {data.questions.map((q) => (
        <QuestionFeedbackCard key={q.question_index} feedback={q} sourceQuestion={questionTexts?.[q.question_index - 1]} />
      ))}
    </Stack>
  );
}

function QuestionFeedbackCard({
  feedback,
  sourceQuestion,
}: {
  feedback: QuestionFeedback;
  sourceQuestion?: string;
}) {
  const autoFilled = feedback.question_snippet === `Question ${feedback.question_index}`;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" fontWeight={700}>Question {feedback.question_index}</Typography>
            {autoFilled && (
              <Chip size="small" label="snippet auto-filled" variant="outlined" color="default" sx={{ height: 20, fontSize: 10 }} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontStyle: 'italic' }}>
            {feedback.question_snippet}
          </Typography>
          {sourceQuestion && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Source: {sourceQuestion}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {(['structure', 'native', 'wording'] as (keyof QScores)[]).map((k) => (
            <Chip key={k} size="small" variant="outlined" color={scoreColor(feedback.scores[k])}
              label={`${k.charAt(0).toUpperCase() + k.slice(1)}: ${feedback.scores[k]}/5`} />
          ))}
        </Stack>
      </Stack>

      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
        {(['structure', 'native', 'wording'] as (keyof QScores)[]).map((k) => (
          <Box key={k}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{k === 'native' ? 'Native fluency' : k}</Typography>
              <Typography variant="caption" fontWeight={700}>{feedback.scores[k]}/5</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(feedback.scores[k] / 5) * 100}
              color={scoreColor(feedback.scores[k])} sx={{ height: 6, borderRadius: 999 }} />
          </Box>
        ))}
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box flex={1}>
          <Typography variant="caption" fontWeight={700} color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <CheckCircleOutlineIcon fontSize="inherit" /> Strengths
          </Typography>
          <Stack spacing={0.5}>
            {feedback.positive_points.map((p, i) => (
              <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {p}</Typography>
            ))}
          </Stack>
        </Box>
        <Box flex={1}>
          <Typography variant="caption" fontWeight={700} color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <TipsAndUpdatesOutlinedIcon fontSize="inherit" /> Needs improvement
          </Typography>
          <Stack spacing={0.5}>
            {feedback.need_improvement_points.map((p, i) => (
              <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {p}</Typography>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function SuggestionsOutput({
  value,
  label,
  questionTexts,
}: {
  value: unknown;
  label: string;
  questionTexts?: string[];
}) {
  const [view, setView] = useState<'structured' | 'raw'>('structured');
  const structured = parseStructuredSuggestions(value);
  const rawText = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  if (!value) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <SectionLabel>{label}</SectionLabel>
        {structured && (
          <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => v && setView(v)} sx={{ height: 24 }}>
            <ToggleButton value="structured" sx={{ px: 1, fontSize: 11 }}>
              <DashboardIcon sx={{ fontSize: 13, mr: 0.5 }} /> Structured
            </ToggleButton>
            <ToggleButton value="raw" sx={{ px: 1, fontSize: 11 }}>
              <CodeIcon sx={{ fontSize: 13, mr: 0.5 }} /> Raw JSON
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
      {view === 'structured' && structured ? (
        <StructuredSuggestionsView data={structured} questionTexts={questionTexts} />
      ) : (
        <Box component="pre"
          sx={{ m: 0, p: 1.5, bgcolor: '#1E272E', color: '#B0BEC5', borderRadius: 1, fontSize: 12, fontFamily: '"Roboto Mono", monospace', whiteSpace: 'pre-wrap', maxHeight: 340, overflowY: 'auto' }}>
          {rawText}
        </Box>
      )}
    </Box>
  );
}

function StepControls({
  edit,
  onChange,
  onReset,
  onRunSingle,
  onRunFromHere,
  onViewPrompt,
  singleKey,
  fromHereKey,
  running,
  showFromHere = true,
}: {
  edit: EditableStep;
  onChange: (e: EditableStep) => void;
  onReset: () => void;
  onRunSingle: () => void;
  onRunFromHere?: () => void;
  onViewPrompt: () => void;
  singleKey: string;
  fromHereKey?: string;
  running: Set<string>;
  showFromHere?: boolean;
}) {
  const anyRunning = singleKey ? running.has(singleKey) : false;
  const fromHereRunning = fromHereKey ? running.has(fromHereKey) : false;
  const disabled = anyRunning || fromHereRunning;

  return (
    <>
      <PromptEditor
        label="System prompt"
        value={edit.systemPrompt}
        onChange={(v) => onChange({ ...edit, systemPrompt: v })}
        onReset={onReset}
        minRows={8}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Model"
          value={edit.model}
          onChange={(e) => onChange({ ...edit, model: e.target.value })}
          sx={{ width: 280 }}
        />
        <Box sx={{ width: 180, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Temperature: {edit.temperature}
          </Typography>
          <Slider
            size="small"
            min={0} max={1} step={0.05}
            value={edit.temperature}
            onChange={(_, v) => onChange({ ...edit, temperature: v as number })}
          />
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Preview the exact LLM request payload for this step">
            <Button size="small" variant="text" startIcon={<VisibilityIcon />} onClick={onViewPrompt}>
              View prompt
            </Button>
          </Tooltip>
          <Tooltip title="Run only this step">
            <span>
              <Button
                size="small"
                variant={showFromHere ? 'outlined' : 'contained'}
                startIcon={anyRunning ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                disabled={disabled}
                onClick={onRunSingle}
              >
                Run step
              </Button>
            </span>
          </Tooltip>
          {showFromHere && onRunFromHere && (
            <Tooltip title="Run this step and all downstream steps">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={fromHereRunning ? <CircularProgress size={14} /> : <SkipNextIcon />}
                  disabled={disabled}
                  onClick={onRunFromHere}
                >
                  Run from here
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PromptLabPage() {
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<PipelineTab>((searchParams.get('type') as PipelineTab) ?? 'answer');
  const [entityId, setEntityId] = useState(searchParams.get('id') ?? '');

  const [answerWorkflow, setAnswerWorkflow] = useState<AnswerWorkflow | null>(null);
  const [reportWorkflow, setReportWorkflow] = useState<ReportWorkflow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [defaults, setDefaults] = useState<WorkflowDefaults | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Answer pipeline editable state
  const [labelEdit, setLabelEdit] = useState<EditableStep | null>(null);
  const [rephraseEdit, setRephraseEdit] = useState<EditableStep | null>(null);
  const [transcriptOverride, setTranscriptOverride] = useState('');

  // Report pipeline editable state
  const [summaryEdit, setSummaryEdit] = useState('');
  const [suggestionsEdit, setSuggestionsEdit] = useState<EditableStep | null>(null);

  // Run results
  const [answerResults, setAnswerResults] = useState<Partial<Record<AnswerStepId, StepResult>>>({});
  const [reportResults, setReportResults] = useState<Partial<Record<ReportStepId, StepResult>>>({});
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [promptPreview, setPromptPreview] = useState<PromptPreviewState | null>(null);

  useEffect(() => {
    adminApiClient.get<WorkflowDefaults>('/admin/workflows/defaults').then(setDefaults).catch(() => {});
  }, []);

  const loadWorkflow = useCallback(async () => {
    if (!entityId.trim()) return;
    setLoading(true);
    setLoadError(null);
    setAnswerResults({});
    setReportResults({});

    try {
      if (tab === 'answer') {
        const data = await adminApiClient.get<AnswerWorkflow>(`/admin/workflows/answer/${entityId.trim()}`);
        setAnswerWorkflow(data);
        setReportWorkflow(null);
        setLabelEdit(payloadToEditable(data.default_payloads.label));
        setRephraseEdit(payloadToEditable(data.default_payloads.rephrase));
        setTranscriptOverride(data.current_outputs.transcribe ?? '');
      } else {
        const data = await adminApiClient.get<ReportWorkflow>(`/admin/workflows/report/${entityId.trim()}`);
        setReportWorkflow(data);
        setAnswerWorkflow(null);
        setSummaryEdit(data.current_outputs.build_summary ?? '');
        setSuggestionsEdit(payloadToEditable(data.default_payloads.generate_suggestions));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tab, entityId]);

  // Auto-load when deep-linked from DB browser (?type=&id=)
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    const typeFromUrl = searchParams.get('type') as PipelineTab | null;
    if (idFromUrl && typeFromUrl) {
      setEntityId(idFromUrl);
      setTab(typeFromUrl);
      // loadWorkflow depends on entityId/tab state; trigger via a small timeout
      setTimeout(() => loadWorkflow(), 50);
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Answer runners ────────────────────────────────────────────────────────

  const runAnswerSteps = async (steps: AnswerStepId[]) => {
    if (!answerWorkflow) return;
    const key = steps.join(',');
    setRunning((s) => new Set(s).add(key));

    const overrides: Record<string, StepOverride> = {};
    if (steps.includes('label')) {
      const override = buildLabelOverride();
      if (override) overrides.label = override;
    }
    if (steps.includes('rephrase')) {
      const override = buildRephraseOverride();
      if (override) overrides.rephrase = override;
    }

    try {
      const data = await adminApiClient.post<{ steps: Record<AnswerStepId, StepResult> }>(
        `/admin/workflows/answer/${answerWorkflow.assessment.id}/run`,
        { steps, transcript_override: transcriptOverride || null, overrides },
      );
      setAnswerResults((prev) => ({ ...prev, ...data.steps }));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setAnswerResults((prev) => ({
        ...prev,
        ...Object.fromEntries(steps.map((s) => [s, { output: null, error }])),
      }));
    } finally {
      setRunning((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  // ── Report runners ────────────────────────────────────────────────────────

  const runReportSteps = async (steps: ReportStepId[]) => {
    if (!reportWorkflow) return;
    const key = steps.join(',');
    setRunning((s) => new Set(s).add(key));

    const overrides: Record<string, StepOverride> = {};
    if (steps.includes('generate_suggestions')) {
      const override = buildSuggestionsOverride();
      if (override) overrides.generate_suggestions = override;
    }

    try {
      const data = await adminApiClient.post<{ steps: Record<ReportStepId, StepResult> }>(
        `/admin/workflows/report/${reportWorkflow.report.id}/run`,
        { steps, summary_override: summaryEdit || null, overrides },
      );
      setReportResults((prev) => ({ ...prev, ...data.steps }));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setReportResults((prev) => ({
        ...prev,
        ...Object.fromEntries(steps.map((s) => [s, { output: null, error }])),
      }));
    } finally {
      setRunning((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const switchTab = (newTab: PipelineTab) => {
    setTab(newTab);
    setEntityId('');
    setAnswerWorkflow(null);
    setReportWorkflow(null);
    setLoadError(null);
    setAnswerResults({});
    setReportResults({});
    setPromptPreview(null);
  };

  const buildLabelOverride = (): StepOverride | null => {
    if (!labelEdit) return null;
    return editableToOverride({
      ...labelEdit,
      userContent: transcriptOverride || labelEdit.userContent,
    });
  };

  const buildRephraseOverride = (): StepOverride | null => {
    if (!rephraseEdit || !answerWorkflow) return null;
    const transcript = transcriptOverride || rephraseEdit.userContent;
    const questionText = answerWorkflow.question?.text ?? '';
    return editableToOverride({
      ...rephraseEdit,
      userContent: `Question: ${questionText}\n\nOriginal answer:\n${transcript}`,
    });
  };

  const buildSuggestionsOverride = (): StepOverride | null => {
    if (!suggestionsEdit) return null;
    return editableToOverride({
      ...suggestionsEdit,
      userContent: summaryEdit || suggestionsEdit.userContent,
    });
  };

  const buildLabelPayloadPreview = (): ChatPayload | null => {
    const override = buildLabelOverride();
    if (!override?.messages) return null;
    return {
      model: override.model ?? labelEdit!.model,
      temperature: override.temperature ?? labelEdit!.temperature,
      messages: override.messages,
    };
  };

  const buildRephrasePayloadPreview = (): ChatPayload | null => {
    const override = buildRephraseOverride();
    if (!override?.messages) return null;
    return {
      model: override.model ?? rephraseEdit!.model,
      temperature: override.temperature ?? rephraseEdit!.temperature,
      messages: override.messages,
    };
  };

  const buildSuggestionsPayloadPreview = (): ChatPayload | null => {
    const override = buildSuggestionsOverride();
    if (!override?.messages) return null;
    return {
      model: override.model ?? suggestionsEdit!.model,
      temperature: override.temperature ?? suggestionsEdit!.temperature,
      messages: override.messages,
    };
  };

  const reportQuestionTexts = reportWorkflow?.assessments.map((a) => a.question_text ?? '') ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Prompt Lab
      </Typography>

      <Tabs value={tab} onChange={(_, v) => switchTab(v)} sx={{ mb: 2 }}>
        <Tab label="Answer Pipeline" value="answer" />
        <Tab label="Report Pipeline" value="report" />
      </Tabs>

      {/* Entity picker */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          label={tab === 'answer' ? 'Answer Assessment ID (UUID)' : 'Report ID (UUID)'}
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          sx={{ width: 360 }}
          onKeyDown={(e) => { if (e.key === 'Enter') loadWorkflow(); }}
        />
        <Button
          variant="contained"
          onClick={loadWorkflow}
          disabled={loading || !entityId.trim()}
          sx={{ height: 40 }}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Load'}
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {/* ── ANSWER PIPELINE ─────────────────────────────────────────────────── */}
      {tab === 'answer' && answerWorkflow && (
        <>
          <Box sx={{ p: 2, mb: 2, bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Topic:</strong> {answerWorkflow.topic?.name ?? 'unknown'} &nbsp;|&nbsp;
              <strong>Status:</strong> {answerWorkflow.assessment.status} &nbsp;|&nbsp;
              <strong>Question:</strong> {answerWorkflow.question?.text ?? '(no question)'}
            </Typography>
          </Box>

          <WorkflowStepper>
            {/* Step 1: Transcribe */}
            <StepCard stepId="transcribe" title="Step 1: Transcribe" subtitle="Audio → raw transcript (runs in worker; audio is deleted after processing)" defaultExpanded>
              <Alert severity="info" sx={{ mb: 1.5, fontSize: 12 }}>
                Audio is deleted after the worker finishes. Edit the transcript below to supply custom
                input for the Label and Rephrase steps.
              </Alert>
              <PromptEditor
                label="Raw transcript (editable — used as input for downstream steps)"
                value={transcriptOverride}
                onChange={setTranscriptOverride}
                minRows={4}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                <Tooltip title="This step does not call an LLM">
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setPromptPreview({
                      title: 'Step 1: Transcribe — LLM prompt',
                      payload: null,
                      note: 'This step does not send a prompt to an LLM. Audio is transcribed by the background worker. The transcript above is used as the user message for the Label and Rephrase steps.',
                    })}
                  >
                    View prompt
                  </Button>
                </Tooltip>
              </Box>
            </StepCard>

            {/* Step 2: Label */}
            <StepCard
              stepId="label"
              title="Step 2: Label"
              subtitle="Transcript → XML-labeled transcript"
              result={answerResults.label}
              defaultExpanded
            >
              {labelEdit && (
                <StepControls
                  edit={labelEdit}
                  onChange={setLabelEdit}
                  onReset={() => setLabelEdit(payloadToEditable(answerWorkflow.default_payloads.label))}
                  onRunSingle={() => runAnswerSteps(['label'])}
                  onRunFromHere={() => runAnswerSteps(['label', 'rephrase'])}
                  onViewPrompt={() => setPromptPreview({
                    title: 'Step 2: Label — LLM prompt',
                    payload: buildLabelPayloadPreview(),
                  })}
                  singleKey="label"
                  fromHereKey="label,rephrase"
                  running={running}
                  showFromHere
                />
              )}
              {answerWorkflow.current_outputs.label && !answerResults.label && (
                <DbOutput text={answerWorkflow.current_outputs.label} />
              )}
              <StepOutput result={answerResults.label} label="Label" />
            </StepCard>

            {/* Step 3: Rephrase */}
            <StepCard
              stepId="rephrase"
              title="Step 3: Rephrase"
              subtitle="Question + transcript → rephrased XML"
              result={answerResults.rephrase}
              defaultExpanded
            >
              {rephraseEdit && (
                <StepControls
                  edit={rephraseEdit}
                  onChange={setRephraseEdit}
                  onReset={() => setRephraseEdit(payloadToEditable(answerWorkflow.default_payloads.rephrase))}
                  onRunSingle={() => runAnswerSteps(['rephrase'])}
                  onViewPrompt={() => setPromptPreview({
                    title: 'Step 3: Rephrase — LLM prompt',
                    payload: buildRephrasePayloadPreview(),
                  })}
                  singleKey="rephrase"
                  fromHereKey="label,rephrase"
                  running={running}
                  showFromHere={false}
                />
              )}
              {answerWorkflow.current_outputs.rephrase && !answerResults.rephrase && (
                <DbOutput text={answerWorkflow.current_outputs.rephrase} />
              )}
              <StepOutput result={answerResults.rephrase} label="Rephrase" />
            </StepCard>
          </WorkflowStepper>
        </>
      )}

      {/* ── REPORT PIPELINE ─────────────────────────────────────────────────── */}
      {tab === 'report' && reportWorkflow && (
        <>
          <Box sx={{ p: 2, mb: 2, bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Status:</strong> {reportWorkflow.report.status} &nbsp;|&nbsp;
              <strong>Answers:</strong> {reportWorkflow.report.answer_ids.length} &nbsp;|&nbsp;
              <strong>Created:</strong> {new Date(reportWorkflow.report.created_at).toLocaleString()}
            </Typography>
          </Box>

          <WorkflowStepper>
            {/* Step 1: Build Summary */}
            <StepCard
              stepId="build_summary"
              title="Step 1: Build Assessment Summary"
              subtitle="Assemble Q&A pairs into LLM prompt text (pure Python, no LLM call)"
              result={reportResults.build_summary}
              defaultExpanded
            >
              <Alert severity="info" sx={{ mb: 1.5, fontSize: 12 }}>
                Edit the assembled text below to customize what the Generate Suggestions step receives.
              </Alert>
              <PromptEditor
                label="Assembled assessments text (editable)"
                value={summaryEdit}
                onChange={setSummaryEdit}
                onReset={() => setSummaryEdit(reportWorkflow.current_outputs.build_summary ?? '')}
                minRows={10}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5, gap: 1 }}>
                <Tooltip title="Preview the text passed as the user message to Generate Suggestions">
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setPromptPreview({
                      title: 'Step 1: Build Assessment Summary — downstream input',
                      payload: buildSuggestionsPayloadPreview(),
                      note: 'This step does not call an LLM directly. The payload below shows the Generate Suggestions request that would use the assembled summary as the user message.',
                    })}
                  >
                    View prompt
                  </Button>
                </Tooltip>
                <Tooltip title="Re-assemble from DB data (overwrites edits)">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={running.has('build_summary') ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                      disabled={running.has('build_summary') || running.has('build_summary,generate_suggestions')}
                      onClick={() => runReportSteps(['build_summary'])}
                    >
                      Re-assemble
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Run this step then generate suggestions">
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={running.has('build_summary,generate_suggestions') ? <CircularProgress size={14} /> : <SkipNextIcon />}
                      disabled={running.has('build_summary') || running.has('build_summary,generate_suggestions')}
                      onClick={() => runReportSteps(['build_summary', 'generate_suggestions'])}
                    >
                      Run from here
                    </Button>
                  </span>
                </Tooltip>
              </Box>
              <StepOutput result={reportResults.build_summary} label="Build Summary" />
            </StepCard>

            {/* Step 2: Generate Suggestions */}
            <StepCard
              stepId="generate_suggestions"
              title="Step 2: Generate Suggestions"
              subtitle="Assessment summary → structured per-question feedback (JSON)"
              result={reportResults.generate_suggestions}
              defaultExpanded
            >
              <QuestionReferencePanel assessments={reportWorkflow.assessments} />
              <Alert severity="info" icon={false} sx={{ mb: 1.5, fontSize: 12 }}>
                Model: <strong>{defaults?.generate_suggestions.model ?? suggestionsEdit?.model ?? '—'}</strong> &nbsp;·&nbsp;
                Output format: <strong>json_object</strong> &nbsp;·&nbsp;
                Fields per question: <strong>question_index</strong>, <strong>question_snippet</strong>, <strong>positive_points</strong>, <strong>need_improvement_points</strong>, <strong>scores</strong> (structure / native / wording, 1–5)
              </Alert>
              {defaults?.generate_suggestions.note && (
                <Alert severity="info" sx={{ mb: 1.5, fontSize: 12 }}>
                  {defaults.generate_suggestions.note}
                </Alert>
              )}
              {suggestionsEdit && (
                <StepControls
                  edit={suggestionsEdit}
                  onChange={setSuggestionsEdit}
                  onReset={resetReportStep}
                  onRunSingle={() => runReportSteps(['generate_suggestions'])}
                  onViewPrompt={() => setPromptPreview({
                    title: 'Step 2: Generate Suggestions — LLM prompt',
                    payload: buildSuggestionsPayloadPreview(),
                  })}
                  singleKey="generate_suggestions"
                  fromHereKey="build_summary,generate_suggestions"
                  running={running}
                  showFromHere={false}
                />
              )}
              {reportWorkflow.current_outputs.generate_suggestions && !reportResults.generate_suggestions && (
                <SuggestionsOutput
                  value={reportWorkflow.current_outputs.generate_suggestions}
                  label="Current DB output"
                  questionTexts={reportQuestionTexts}
                />
              )}
              {reportResults.generate_suggestions && (
                reportResults.generate_suggestions.error ? (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Alert severity="error" sx={{ fontSize: 12 }}>{reportResults.generate_suggestions.error}</Alert>
                  </Box>
                ) : (
                  <SuggestionsOutput
                    value={reportResults.generate_suggestions.output}
                    label="Suggestions output"
                    questionTexts={reportQuestionTexts}
                  />
                )
              )}
            </StepCard>
          </WorkflowStepper>
        </>
      )}

      {/* Empty states */}
      {tab === 'answer' && !answerWorkflow && !loading && !loadError && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <Typography>Enter an Answer Assessment ID above and click Load.</Typography>
        </Box>
      )}
      {tab === 'report' && !reportWorkflow && !loading && !loadError && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <Typography>Enter a Report ID above and click Load.</Typography>
        </Box>
      )}

      <QueryPromptDialog
        open={promptPreview !== null}
        onClose={() => setPromptPreview(null)}
        title={promptPreview?.title ?? ''}
        payload={promptPreview?.payload}
        note={promptPreview?.note}
      />
    </Box>
  );

  function resetReportStep() {
    if (reportWorkflow) {
      setSuggestionsEdit(payloadToEditable(reportWorkflow.default_payloads.generate_suggestions));
    }
  }
}
