// ── Database browser ──────────────────────────────────────────────────────────

export interface TableInfo {
  name: string;
  count: number;
}

export interface TablePage {
  table: string;
  columns: string[];
  masked_columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
}

// ── Workflow / Prompt Lab ─────────────────────────────────────────────────────

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatPayload {
  model: string;
  temperature: number;
  messages: ChatMessage[];
}

export interface StepResult {
  output: string | null;
  attempts?: number;
  error: string | null;
}

export interface AnswerWorkflow {
  assessment: {
    id: string;
    status: string;
    audio_path: string | null;
    raw_transcript: string | null;
    labeled_transcript: string | null;
    rephrased_transcript: string | null;
    error_message: string | null;
    created_at: string;
  };
  question: {
    id: string;
    text: string;
    context: string | null;
  } | null;
  topic: {
    id: string;
    name: string;
    labels: { key: string; name: string }[];
  } | null;
  default_payloads: {
    transcribe: null;
    label: ChatPayload | null;
    rephrase: ChatPayload | null;
  };
  current_outputs: {
    transcribe: string | null;
    label: string | null;
    rephrase: string | null;
  };
}

export interface ReportWorkflow {
  report: {
    id: string;
    status: string;
    answer_ids: string[];
    suggestions: Record<string, unknown> | null;
    error_message: string | null;
    created_at: string;
  };
  assessments: Array<{
    id: string;
    status: string;
    raw_transcript: string | null;
    labeled_transcript: string | null;
    rephrased_transcript: string | null;
    question_text: string | null;
  }>;
  default_payloads: {
    build_summary: { assessments_text: string };
    generate_suggestions: ChatPayload;
  };
  current_outputs: {
    build_summary: string;
    generate_suggestions: Record<string, unknown> | null;
  };
}

export interface WorkflowDefaults {
  label: { system_prompt: string; model: string; temperature: number; note: string };
  rephrase: { system_prompt: string; model: string; temperature: number; note: string };
  generate_suggestions: { system_prompt: string; model: string; temperature: number };
}

export type AnswerStepId = 'transcribe' | 'label' | 'rephrase';
export type ReportStepId = 'build_summary' | 'generate_suggestions';

export interface StepOverride {
  model?: string;
  temperature?: number;
  messages?: ChatMessage[];
}
