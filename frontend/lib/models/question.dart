class Question {
  final String id;
  final String topicId;
  final String text;
  final String? context;

  const Question({
    required this.id,
    required this.topicId,
    required this.text,
    this.context,
  });

  factory Question.fromJson(Map<String, dynamic> json) => Question(
        id: json['id'] as String,
        topicId: json['topic_id'] as String,
        text: json['text'] as String,
        context: json['context'] as String?,
      );
}
