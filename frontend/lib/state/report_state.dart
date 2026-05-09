import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants.dart';
import '../models/report.dart';
import '../services/api_client.dart';

enum ReportFetchState { idle, submitting, polling, done, error }

class ReportStateProvider extends ChangeNotifier {
  final ApiClient _api;

  ReportFetchState _fetchState = ReportFetchState.idle;
  Report? _report;
  List<ReportSummary> _history = [];
  String? _error;
  Timer? _pollTimer;

  ReportFetchState get fetchState => _fetchState;
  Report? get report => _report;
  List<ReportSummary> get history => List.unmodifiable(_history);
  String? get error => _error;

  ReportStateProvider(this._api);

  Future<String?> submitBatch(List<String> answerIds) async {
    _fetchState = ReportFetchState.submitting;
    _report = null;
    _error = null;
    notifyListeners();

    try {
      final resp = await _api.post(
        '/reports',
        body: {'answer_ids': answerIds},
      );
      final reportId = resp['id'] as String;
      _fetchState = ReportFetchState.polling;
      notifyListeners();
      return reportId;
    } catch (e) {
      _error = e.toString();
      _fetchState = ReportFetchState.error;
      notifyListeners();
      return null;
    }
  }

  void startPolling(String reportId, {VoidCallback? onDone}) {
    _pollTimer?.cancel();
    final deadline = DateTime.now().add(AppConstants.pollTimeout);

    _pollTimer = Timer.periodic(AppConstants.pollInterval, (t) async {
      if (DateTime.now().isAfter(deadline)) {
        t.cancel();
        _error = 'Timed out waiting for report';
        _fetchState = ReportFetchState.error;
        notifyListeners();
        return;
      }

      try {
        final data = await _api.get('/reports/$reportId');
        final r = Report.fromJson(data as Map<String, dynamic>);
        if (r.isDone || r.isFailed) {
          t.cancel();
          _report = r;
          _fetchState = r.isDone ? ReportFetchState.done : ReportFetchState.error;
          if (r.isFailed) _error = 'Report generation failed';
          notifyListeners();
          onDone?.call();
        }
      } catch (e) {
        // Ignore transient errors during polling
      }
    });
  }

  Future<void> loadHistory() async {
    try {
      final data = await _api.get('/reports/history') as List<dynamic>;
      _history = data
          .map((r) => ReportSummary.fromJson(r as Map<String, dynamic>))
          .toList();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> loadReport(String reportId) async {
    try {
      final data = await _api.get('/reports/$reportId');
      _report = Report.fromJson(data as Map<String, dynamic>);
      _fetchState = ReportFetchState.done;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _fetchState = ReportFetchState.error;
      notifyListeners();
    }
  }

  void reset() {
    _pollTimer?.cancel();
    _fetchState = ReportFetchState.idle;
    _report = null;
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}
