class TopicLabel {
  final String key;
  final String name;

  const TopicLabel({required this.key, required this.name});

  factory TopicLabel.fromJson(Map<String, dynamic> json) =>
      TopicLabel(key: json['key'] as String, name: json['name'] as String);
}

class Topic {
  final String id;
  final String name;
  final String? description;
  final List<TopicLabel> labels;

  const Topic({
    required this.id,
    required this.name,
    this.description,
    required this.labels,
  });

  factory Topic.fromJson(Map<String, dynamic> json) => Topic(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        labels: (json['labels'] as List<dynamic>)
            .map((l) => TopicLabel.fromJson(l as Map<String, dynamic>))
            .toList(),
      );
}
