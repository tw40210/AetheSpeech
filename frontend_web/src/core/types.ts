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

export interface Report {
  id: string;
  status: 'pending' | 'done' | 'failed';
  suggestions?: string;
  assessments: AnswerAssessment[];
  created_at: string;
}

export interface ReportSummary {
  id: string;
  status: 'pending' | 'done' | 'failed';
  suggestions?: string;
  answer_count: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AnswerSubmitResponse {
  answer_id: string;
  status: string;
}
