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
import type { Question, Topic } from '../core/types';
import { apiClient } from '../services/apiClient';
import { audioService } from '../services/audioService';
import type { AnswerSubmitResponse } from '../core/types';

export enum InterviewPhase {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RECORDING = 'recording',
  UPLOADING = 'uploading',
  DONE = 'done',
}

/** Returned after a successful upload — includes the full batch so far. */
export interface UploadResult {
  answerId: string;
  answerIds: string[];
}

interface InterviewContextValue {
  phase: InterviewPhase;
  questions: Question[];
  currentIndex: number;
  currentQuestion: Question | null;
  answerIds: string[];
  selectedTopic: Topic | null;
  remainingSeconds: number;
  isPrepPaused: boolean;
  error: string | null;
  isLastQuestion: boolean;
  setSelectedTopic: (topic: Topic) => void;
  loadQuestions: (topicId: string, amount: number) => Promise<void>;
  startPreparation: (seconds: number, onComplete: () => void) => void;
  pausePreparation: () => void;
  resumePreparation: () => void;
  startRecording: (
    question: Question,
    seconds: number,
    onTimeUp: () => void,
  ) => Promise<void>;
  stopRecordingAndUpload: (question: Question) => Promise<UploadResult | null>;
  advanceQuestion: () => void;
  clearError: () => void;
  retryRecording: (
    question: Question,
    seconds: number,
    onTimeUp: () => void,
  ) => Promise<void>;
  reset: () => void;
}

const InterviewContext = createContext<InterviewContextValue | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<InterviewPhase>(InterviewPhase.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerIds, setAnswerIds] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPrepPaused, setIsPrepPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const answerIdsRef = useRef<string[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    answerIdsRef.current = answerIds;
  }, [answerIds]);

  const reset = useCallback(() => {
    clearTimer();
    audioService.cancel();
    setPhase(InterviewPhase.IDLE);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswerIds([]);
    answerIdsRef.current = [];
    setSelectedTopic(null);
    setRemainingSeconds(0);
    setError(null);
  }, [clearTimer]);

  const loadQuestions = useCallback(
    async (topicId: string, amount: number) => {
      try {
        const data = await apiClient.get<Question[]>('/questions', {
          topic_id: topicId,
          amount: String(amount),
        });
        setQuestions(data);
        setCurrentIndex(0);
        setAnswerIds([]);
        answerIdsRef.current = [];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [],
  );

  /** Start prep countdown; calls onComplete when timer reaches zero. */
  const startPreparation = useCallback(
    (seconds: number, onComplete: () => void) => {
      clearTimer();
      setPhase(InterviewPhase.PREPARING);
      setIsPrepPaused(false);
      setRemainingSeconds(seconds);
      remainingRef.current = seconds;
      onCompleteRef.current = onComplete;

      timerRef.current = setInterval(() => {
        remainingRef.current -= 1;
        setRemainingSeconds(remainingRef.current);
        if (remainingRef.current <= 0) {
          clearTimer();
          onCompleteRef.current?.();
        }
      }, 1000);
    },
    [clearTimer],
  );

  const pausePreparation = useCallback(() => {
    clearTimer();
    setIsPrepPaused(true);
  }, [clearTimer]);

  const resumePreparation = useCallback(() => {
    if (remainingRef.current <= 0) return;
    setIsPrepPaused(false);
    timerRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemainingSeconds(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearTimer();
        onCompleteRef.current?.();
      }
    }, 1000);
  }, [clearTimer]);

  /** Start recording + countdown; calls onTimeUp when timer reaches zero. */
  const startRecording = useCallback(
    async (question: Question, seconds: number, onTimeUp: () => void) => {
      clearTimer();
      setPhase(InterviewPhase.RECORDING);
      setRemainingSeconds(seconds);

      await audioService.startRecording(question.id);

      let remaining = seconds;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          clearTimer();
          onTimeUp();
        }
      }, 1000);
    },
    [clearTimer],
  );

  /**
   * Stop recording, upload to /answers, store the returned answer_id.
   * Returns the answerId on success, null on failure.
   */
  const stopRecordingAndUpload = useCallback(
    async (question: Question): Promise<UploadResult | null> => {
      clearTimer();
      setPhase(InterviewPhase.UPLOADING);

      let audioFile;
      try {
        audioFile = await audioService.stopRecording();
      } catch {
        audioFile = null;
      }
      if (!audioFile) {
        setError(
          `Could not finalize the recording. Try again — keep answers under ${AppConstants.recordTimeSeconds} seconds.`,
        );
        setPhase(InterviewPhase.IDLE);
        return null;
      }

      try {
        const resp = await apiClient.postMultipart<AnswerSubmitResponse>(
          '/answers',
          { question_id: question.id },
          audioFile,
        );
        const nextIds = [...answerIdsRef.current, resp.answer_id];
        answerIdsRef.current = nextIds;
        setAnswerIds(nextIds);
        return { answerId: resp.answer_id, answerIds: nextIds };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setPhase(InterviewPhase.IDLE);
        return null;
      }
    },
    [clearTimer],
  );

  const advanceQuestion = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    setPhase(InterviewPhase.IDLE);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryRecording = useCallback(
    async (question: Question, seconds: number, onTimeUp: () => void) => {
      clearTimer();
      audioService.cancel();
      setError(null);
      await startRecording(question, seconds, onTimeUp);
    },
    [clearTimer, startRecording],
  );

  const currentQuestion =
    questions.length > 0 && currentIndex < questions.length
      ? questions[currentIndex]
      : null;

  const isLastQuestion = currentIndex >= questions.length - 1;

  return (
    <InterviewContext.Provider
      value={{
        phase,
        questions,
        currentIndex,
        currentQuestion,
        answerIds,
        selectedTopic,
        remainingSeconds,
        isPrepPaused,
        error,
        isLastQuestion,
        setSelectedTopic,
        loadQuestions,
        startPreparation,
        pausePreparation,
        resumePreparation,
        startRecording,
        stopRecordingAndUpload,
        advanceQuestion,
        clearError,
        retryRecording,
        reset,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview(): InterviewContextValue {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error('useInterview must be used inside InterviewProvider');
  return ctx;
}
