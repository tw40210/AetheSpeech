import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:aethespeech/services/api_client.dart';
import 'package:aethespeech/services/audio_service.dart';
import 'package:aethespeech/state/interview_state.dart';
import 'package:aethespeech/models/topic.dart';

@GenerateMocks([ApiClient, AudioService])
import 'interview_state_test.mocks.dart';

void main() {
  late MockApiClient mockApi;
  late MockAudioService mockAudio;
  late InterviewState state;

  setUp(() {
    mockApi = MockApiClient();
    mockAudio = MockAudioService();
    state = InterviewState(mockApi, mockAudio);
  });

  tearDown(() {
    state.dispose();
  });

  group('InterviewState', () {
    test('initial state is idle', () {
      expect(state.phase, InterviewPhase.idle);
      expect(state.questions, isEmpty);
      expect(state.currentIndex, 0);
      expect(state.answerIds, isEmpty);
    });

    test('setTopic updates selectedTopic', () {
      const topic = Topic(id: 't1', name: 'Test', labels: []);
      state.setTopic(topic);
      expect(state.selectedTopic?.id, 't1');
    });

    test('loadQuestions populates questions list', () async {
      when(mockApi.get('/questions',
              queryParams: {'topic_id': 't1', 'amount': '10'}))
          .thenAnswer((_) async => [
                {
                  'id': 'q1',
                  'topic_id': 't1',
                  'text': 'Q1?',
                  'context': null,
                },
                {
                  'id': 'q2',
                  'topic_id': 't1',
                  'text': 'Q2?',
                  'context': null,
                },
              ]);

      await state.loadQuestions('t1', 10);
      expect(state.questions.length, 2);
      expect(state.currentIndex, 0);
    });

    test('loadQuestions sets error on failure', () async {
      when(mockApi.get(any, queryParams: anyNamed('queryParams')))
          .thenThrow(ApiException(500, 'Server error'));

      await state.loadQuestions('t1', 10);
      expect(state.error, isNotNull);
    });

    test('currentQuestion returns null when no questions', () {
      expect(state.currentQuestion, isNull);
    });

    test('isLastQuestion is true when at last question', () async {
      when(mockApi.get(any, queryParams: anyNamed('queryParams')))
          .thenAnswer((_) async => [
                {'id': 'q1', 'topic_id': 't1', 'text': 'Q1?', 'context': null},
              ]);
      await state.loadQuestions('t1', 1);
      expect(state.isLastQuestion, isTrue);
    });

    test('advanceQuestion increments currentIndex', () async {
      when(mockApi.get(any, queryParams: anyNamed('queryParams')))
          .thenAnswer((_) async => [
                {'id': 'q1', 'topic_id': 't1', 'text': 'Q1?', 'context': null},
                {'id': 'q2', 'topic_id': 't1', 'text': 'Q2?', 'context': null},
              ]);
      await state.loadQuestions('t1', 2);
      state.advanceQuestion();
      expect(state.currentIndex, 1);
    });

    test('reset clears all state', () async {
      when(mockApi.get(any, queryParams: anyNamed('queryParams')))
          .thenAnswer((_) async => [
                {'id': 'q1', 'topic_id': 't1', 'text': 'Q1?', 'context': null},
              ]);
      await state.loadQuestions('t1', 1);
      state.reset();
      expect(state.questions, isEmpty);
      expect(state.currentIndex, 0);
      expect(state.phase, InterviewPhase.idle);
    });

    test('checkPermission delegates to AudioService', () async {
      when(mockAudio.hasPermission()).thenAnswer((_) async => true);
      expect(await state.checkPermission(), isTrue);

      when(mockAudio.hasPermission()).thenAnswer((_) async => false);
      expect(await state.checkPermission(), isFalse);
    });
  });
}
