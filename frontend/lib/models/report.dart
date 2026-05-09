class AnswerAssessment {
  final String id;
  final String? questionId;
  final String? rawTranscript;
  final String? labeledTranscript;
  final String? rephrasedTranscript;
  final String status;
  final DateTime createdAt;

  const AnswerAssessment({
    required this.id,
    this.questionId,
    this.rawTranscript,
    this.labeledTranscript,
    this.rephrasedTranscript,
    required this.status,
    required this.createdAt,
  });

  factory AnswerAssessment.fromJson(Map<String, dynamic> json) =>
      AnswerAssessment(
        id: json['id'] as String,
        questionId: json['question_id'] as String?,
        rawTranscript: json['raw_transcript'] as String?,
        labeledTranscript: json['labeled_transcript'] as String?,
        rephrasedTranscript: json['rephrased_transcript'] as String?,
        status: json['status'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}

class Report {
  final String id;
  final String status;
  final String? suggestions;
  final List<AnswerAssessment> assessments;
  final DateTime createdAt;

  bool get isDone => status == 'done';
  bool get isFailed => status == 'failed';
  bool get isPending => status == 'pending' || status == 'processing';

  const Report({
    required this.id,
    required this.status,
    this.suggestions,
    required this.assessments,
    required this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) => Report(
        id: json['id'] as String,
        status: json['status'] as String,
        suggestions: json['suggestions'] as String?,
        assessments: (json['assessments'] as List<dynamic>? ?? [])
            .map((a) => AnswerAssessment.fromJson(a as Map<String, dynamic>))
            .toList(),
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}

class ReportSummary {
  final String id;
  final String status;
  final String? suggestions;
  final int answerCount;
  final DateTime createdAt;

  const ReportSummary({
    required this.id,
    required this.status,
    this.suggestions,
    required this.answerCount,
    required this.createdAt,
  });

  factory ReportSummary.fromJson(Map<String, dynamic> json) => ReportSummary(
        id: json['id'] as String,
        status: json['status'] as String,
        suggestions: json['suggestions'] as String?,
        answerCount: json['answer_count'] as int,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}
