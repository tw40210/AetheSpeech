import type { StructuredSuggestions } from './types';

export function normalizeStoredSuggestions(value: unknown): StructuredSuggestions | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as StructuredSuggestions;
  if (!Array.isArray(obj.questions)) return null;

  return {
    questions: obj.questions.map((q) => ({
      ...q,
      question_snippet: q.question_snippet?.trim() || `Question ${q.question_index}`,
    })),
  };
}

export function parseStructuredSuggestions(value: unknown): StructuredSuggestions | null {
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    return normalizeStoredSuggestions(obj);
  } catch {
    return null;
  }
}
