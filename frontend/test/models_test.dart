import 'package:flutter_test/flutter_test.dart';
import 'package:aethespeech/models/topic.dart';
import 'package:aethespeech/models/question.dart';
import 'package:aethespeech/models/report.dart';

void main() {
  group('Topic model', () {
    final json = {
      'id': 'topic-1',
      'name': 'Business Report',
      'description': 'Test description',
      'labels': [
        {'key': 'WWAD', 'name': 'What we are doing'},
        {'key': 'WWHD', 'name': 'What we have done'},
      ],
    };

    test('fromJson parses correctly', () {
      final topic = Topic.fromJson(json);
      expect(topic.id, 'topic-1');
      expect(topic.name, 'Business Report');
      expect(topic.description, 'Test description');
      expect(topic.labels.length, 2);
      expect(topic.labels.first.key, 'WWAD');
      expect(topic.labels.first.name, 'What we are doing');
    });

    test('fromJson handles null description', () {
      final j = Map<String, dynamic>.from(json)..['description'] = null;
      final topic = Topic.fromJson(j);
      expect(topic.description, isNull);
    });

    test('fromJson handles empty labels', () {
      final j = Map<String, dynamic>.from(json)..['labels'] = [];
      final topic = Topic.fromJson(j);
      expect(topic.labels, isEmpty);
    });
  });

  group('Question model', () {
    test('fromJson parses correctly', () {
      final q = Question.fromJson({
        'id': 'q-1',
        'topic_id': 'topic-1',
        'text': 'What is your plan?',
        'context': 'Some context',
      });
      expect(q.id, 'q-1');
      expect(q.topicId, 'topic-1');
      expect(q.text, 'What is your plan?');
      expect(q.context, 'Some context');
    });

    test('fromJson handles null context', () {
      final q = Question.fromJson({
        'id': 'q-2',
        'topic_id': 'topic-1',
        'text': 'Another question',
        'context': null,
      });
      expect(q.context, isNull);
    });
  });

  group('Report model', () {
    final assessmentJson = {
      'id': 'a-1',
      'question_id': 'q-1',
      'raw_transcript': 'Hello world',
      'labeled_transcript': '<WWAD>Hello world</WWAD>',
      'rephrased_transcript': '<WWAD>Rephrased text</WWAD>',
      'status': 'done',
      'created_at': '2026-05-09T00:00:00Z',
    };

    final reportJson = {
      'id': 'r-1',
      'status': 'done',
      'suggestions': 'Great work! Improve X.',
      'assessments': [assessmentJson],
      'created_at': '2026-05-09T00:00:00Z',
    };

    test('AnswerAssessment fromJson parses correctly', () {
      final a = AnswerAssessment.fromJson(assessmentJson);
      expect(a.id, 'a-1');
      expect(a.questionId, 'q-1');
      expect(a.rawTranscript, 'Hello world');
      expect(a.labeledTranscript, '<WWAD>Hello world</WWAD>');
      expect(a.rephrasedTranscript, '<WWAD>Rephrased text</WWAD>');
      expect(a.status, 'done');
    });

    test('Report fromJson parses correctly', () {
      final r = Report.fromJson(reportJson);
      expect(r.id, 'r-1');
      expect(r.status, 'done');
      expect(r.suggestions, 'Great work! Improve X.');
      expect(r.assessments.length, 1);
      expect(r.isDone, isTrue);
      expect(r.isPending, isFalse);
      expect(r.isFailed, isFalse);
    });

    test('Report isPending for pending status', () {
      final r = Report.fromJson({...reportJson, 'status': 'pending', 'assessments': []});
      expect(r.isPending, isTrue);
      expect(r.isDone, isFalse);
    });

    test('Report isFailed for failed status', () {
      final r = Report.fromJson({...reportJson, 'status': 'failed', 'assessments': []});
      expect(r.isFailed, isTrue);
    });

    test('ReportSummary fromJson parses correctly', () {
      final s = ReportSummary.fromJson({
        'id': 'r-2',
        'status': 'done',
        'suggestions': 'Good job',
        'answer_count': 5,
        'created_at': '2026-05-09T00:00:00Z',
      });
      expect(s.id, 'r-2');
      expect(s.answerCount, 5);
    });

    test('Report fromJson handles empty assessments', () {
      final r = Report.fromJson({...reportJson, 'assessments': null, 'suggestions': null});
      expect(r.assessments, isEmpty);
      expect(r.suggestions, isNull);
    });
  });
}
