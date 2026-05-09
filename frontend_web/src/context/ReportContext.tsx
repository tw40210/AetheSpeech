import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppConstants } from '../core/constants';
import type { AnswerAssessment, Report, ReportSummary } from '../core/types';
import { apiClient } from '../services/apiClient';

export enum ReportFetchState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  POLLING = 'polling',
  DONE = 'done',
  ERROR = 'error',
}

interface StartPollingOptions {
  onDone?: () => void;
}

interface ReportContextValue {
  fetchState: ReportFetchState;
  report: Report | null;
  liveAssessments: AnswerAssessment[];
  history: ReportSummary[];
  error: string | null;
  submitBatch: (answerIds: string[]) => Promise<string | null>;
  startPolling: (reportId: string, options?: StartPollingOptions) => void;
  loadReport: (reportId: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  reset: () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [fetchState, setFetchState] = useState<ReportFetchState>(ReportFetchState.IDLE);
  const [report, setReport] = useState<Report | null>(null);
  const [liveAssessments, setLiveAssessments] = useState<AnswerAssessment[]>([]);
  const [history, setHistory] = useState<ReportSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPoll(), [clearPoll]);

  /** POST /reports with collected answer IDs. Returns the new report ID or null. */
  const submitBatch = useCallback(
    async (answerIds: string[]): Promise<string | null> => {
      clearPoll();
      setFetchState(ReportFetchState.SUBMITTING);
      setReport(null);
      setLiveAssessments([]);
      setError(null);

      try {
        const resp = await apiClient.post<Report>('/reports', { answer_ids: answerIds });
        setFetchState(ReportFetchState.POLLING);
        return resp.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setFetchState(ReportFetchState.ERROR);
        return null;
      }
    },
    [clearPoll],
  );

  /** Poll GET /reports/:id every pollIntervalMs until done/failed or timeout. */
  const startPolling = useCallback(
    (reportId: string, { onDone }: StartPollingOptions = {}) => {
      clearPoll();
      const deadline = Date.now() + AppConstants.pollTimeoutMs;

      pollTimerRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          clearPoll();
          setError('Timed out waiting for report');
          setFetchState(ReportFetchState.ERROR);
          return;
        }

        try {
          const data = await apiClient.get<Report>(`/reports/${reportId}`);
          setLiveAssessments(data.assessments);

          const isDone = data.status === 'done';
          const isFailed = data.status === 'failed';

          if (isDone || isFailed) {
            clearPoll();
            setReport(data);
            setFetchState(isDone ? ReportFetchState.DONE : ReportFetchState.ERROR);
            if (isFailed) setError('Report generation failed');
            onDone?.();
          }
        } catch {
          // Ignore transient network errors during polling
        }
      }, AppConstants.pollIntervalMs);
    },
    [clearPoll],
  );

  /** Load a single report by ID (used by ReportDetailPage when navigating from history). */
  const loadReport = useCallback(async (reportId: string) => {
    setFetchState(ReportFetchState.IDLE);
    setError(null);
    try {
      const data = await apiClient.get<Report>(`/reports/${reportId}`);
      setReport(data);
      setFetchState(ReportFetchState.DONE);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setFetchState(ReportFetchState.ERROR);
    }
  }, []);

  /** Load report history list for the HistoryPage. */
  const loadHistory = useCallback(async () => {
    try {
      const data = await apiClient.get<ReportSummary[]>('/reports/history');
      setHistory(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }, []);

  const reset = useCallback(() => {
    clearPoll();
    setFetchState(ReportFetchState.IDLE);
    setReport(null);
    setLiveAssessments([]);
    setError(null);
  }, [clearPoll]);

  return (
    <ReportContext.Provider
      value={{
        fetchState,
        report,
        liveAssessments,
        history,
        error,
        submitBatch,
        startPolling,
        loadReport,
        loadHistory,
        reset,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used inside ReportProvider');
  return ctx;
}
