// ── Domain models (mirror backend Pydantic schemas) ──────────

export interface TopicLabel {
  key: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  labels: TopicLabel[];
  is_own: boolean;
}

export interface Question {
  id: string;
  topic_id: string;
  text: string;
  context?: string;
}

export interface AnswerAssessment {
  id: string;
  question_id: string;
  raw_transcript?: string;
  labeled_transcript?: string;
  rephrased_transcript?: string;
  status: string;
  created_at: string;
}

export interface QuestionScores {
  structure: number;
  native: number;
  wording: number;
}

export interface QuestionFeedback {
  question_index: number;
  question_snippet: string;
  positive_points: string[];
  need_improvement_points: string[];
  scores: QuestionScores;
}

export interface StructuredSuggestions {
  questions: QuestionFeedback[];
}

export interface Report {
  id: string;
  status: 'pending' | 'done' | 'failed';
  suggestions?: StructuredSuggestions | null;
  assessments: AnswerAssessment[];
  created_at: string;
}

export interface ReportSummary {
  id: string;
  status: 'pending' | 'done' | 'failed';
  suggestions?: StructuredSuggestions | null;
  answer_count: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Topic generator wizard ──────────────────────────────────

export interface FrameworkSuggestion {
  key: string;
  name: string;
  rationale: string;
  is_preset: boolean;
}

export interface TopicQuestion {
  text: string;
  context?: string | null;
}

export interface SampleQuestionResponse {
  text: string;
  context?: string | null;
  rationale: string;
}

/** Matches the TopicIn shape returned by POST /topic-generator/generate */
export interface GeneratedTopic {
  name: string;
  description?: string | null;
  labels: TopicLabel[];
  questions: TopicQuestion[];
}

export interface AnswerSubmitResponse {
  answer_id: string;
  status: string;
}
