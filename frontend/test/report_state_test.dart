import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:aethespeech/services/api_client.dart';
import 'package:aethespeech/state/report_state.dart';

@GenerateMocks([ApiClient])
import 'report_state_test.mocks.dart';

Map<String, dynamic> _reportJson(String id, String status) => {
      'id': id,
      'status': status,
      'suggestions': status == 'done' ? 'Be more concise.' : null,
      'assessments': [],
      'created_at': '2026-05-09T00:00:00Z',
    };

Map<String, dynamic> _summaryJson(String id) => {
      'id': id,
      'status': 'done',
      'suggestions': 'Good job',
      'answer_count': 3,
      'created_at': '2026-05-09T00:00:00Z',
    };

void main() {
  late MockApiClient mockApi;
  late ReportStateProvider state;

  setUp(() {
    mockApi = MockApiClient();
    state = ReportStateProvider(mockApi);
  });

  tearDown(() {
    state.dispose();
  });

  group('ReportStateProvider', () {
    test('initial state is idle', () {
      expect(state.fetchState, ReportFetchState.idle);
      expect(state.report, isNull);
      expect(state.history, isEmpty);
    });

    test('submitBatch transitions to polling on success', () async {
      when(mockApi.post('/reports', body: anyNamed('body'))).thenAnswer(
        (_) async => {'id': 'r-1', 'status': 'pending', 'assessments': [], 'created_at': '2026-05-09T00:00:00Z'},
      );

      final id = await state.submitBatch(['a1', 'a2', 'a3']);
      expect(id, 'r-1');
      expect(state.fetchState, ReportFetchState.polling);
    });

    test('submitBatch transitions to error on failure', () async {
      when(mockApi.post('/reports', body: anyNamed('body')))
          .thenThrow(ApiException(500, 'Server error'));

      final id = await state.submitBatch(['a1']);
      expect(id, isNull);
      expect(state.fetchState, ReportFetchState.error);
      expect(state.error, isNotNull);
    });

    test('loadReport sets report and state to done', () async {
      when(mockApi.get('/reports/r-1')).thenAnswer(
        (_) async => _reportJson('r-1', 'done'),
      );

      await state.loadReport('r-1');
      expect(state.fetchState, ReportFetchState.done);
      expect(state.report?.id, 'r-1');
      expect(state.report?.isDone, isTrue);
    });

    test('loadReport sets error on failure', () async {
      when(mockApi.get('/reports/r-1'))
          .thenThrow(ApiException(404, 'Not found'));

      await state.loadReport('r-1');
      expect(state.fetchState, ReportFetchState.error);
      expect(state.error, isNotNull);
    });

    test('loadHistory populates history list', () async {
      when(mockApi.get('/reports/history')).thenAnswer(
        (_) async => [_summaryJson('r-1'), _summaryJson('r-2')],
      );

      await state.loadHistory();
      expect(state.history.length, 2);
    });

    test('loadHistory handles empty list', () async {
      when(mockApi.get('/reports/history')).thenAnswer((_) async => []);
      await state.loadHistory();
      expect(state.history, isEmpty);
    });

    test('reset clears state', () async {
      when(mockApi.get('/reports/r-1')).thenAnswer(
        (_) async => _reportJson('r-1', 'done'),
      );
      await state.loadReport('r-1');
      state.reset();
      expect(state.fetchState, ReportFetchState.idle);
      expect(state.report, isNull);
    });
  });
}
