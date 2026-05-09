import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/question.dart';
import '../models/topic.dart';
import '../services/api_client.dart';
import '../services/audio_service.dart';

enum InterviewPhase { idle, preparing, recording, uploading, done }

class InterviewState extends ChangeNotifier {
  final ApiClient _api;
  final AudioService _audio;

  InterviewPhase _phase = InterviewPhase.idle;
  List<Question> _questions = [];
  int _currentIndex = 0;
  final List<String> _answerIds = [];
  Topic? _selectedTopic;
  String? _error;

  // Timers
  Timer? _countdownTimer;
  int _remainingSeconds = 0;

  InterviewPhase get phase => _phase;
  List<Question> get questions => _questions;
  int get currentIndex => _currentIndex;
  List<String> get answerIds => List.unmodifiable(_answerIds);
  Topic? get selectedTopic => _selectedTopic;
  String? get error => _error;
  int get remainingSeconds => _remainingSeconds;
  bool get isLastQuestion => _currentIndex >= _questions.length - 1;

  Question? get currentQuestion =>
      _questions.isNotEmpty && _currentIndex < _questions.length
          ? _questions[_currentIndex]
          : null;

  InterviewState(this._api, this._audio);

  Future<bool> checkPermission() => _audio.hasPermission();

  void reset() {
    _countdownTimer?.cancel();
    _phase = InterviewPhase.idle;
    _questions = [];
    _currentIndex = 0;
    _answerIds.clear();
    _selectedTopic = null;
    _error = null;
    _remainingSeconds = 0;
    notifyListeners();
  }

  void setTopic(Topic topic) {
    _selectedTopic = topic;
    notifyListeners();
  }

  Future<void> loadQuestions(String topicId, int amount) async {
    try {
      final data = await _api.get(
        '/questions',
        queryParams: {'topic_id': topicId, 'amount': '$amount'},
      ) as List<dynamic>;
      _questions = data
          .map((q) => Question.fromJson(q as Map<String, dynamic>))
          .toList();
      _currentIndex = 0;
      _answerIds.clear();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  // ── Preparation countdown ──────────────────────────────────────────────────

  void startPreparation(int seconds, VoidCallback onComplete) {
    _phase = InterviewPhase.preparing;
    _remainingSeconds = seconds;
    notifyListeners();
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      _remainingSeconds--;
      notifyListeners();
      if (_remainingSeconds <= 0) {
        t.cancel();
        onComplete();
      }
    });
  }

  // ── Recording countdown ────────────────────────────────────────────────────

  Future<void> startRecording(int seconds, VoidCallback onTimeUp) async {
    _phase = InterviewPhase.recording;
    _remainingSeconds = seconds;
    notifyListeners();

    final q = currentQuestion;
    if (q == null) return;
    await _audio.startRecording(q.id);

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      _remainingSeconds--;
      notifyListeners();
      if (_remainingSeconds <= 0) {
        t.cancel();
        onTimeUp();
      }
    });
  }

  Future<String?> stopRecordingAndUpload() async {
    _countdownTimer?.cancel();
    _phase = InterviewPhase.uploading;
    notifyListeners();

    final audioFile = await _audio.stopRecording();
    if (audioFile == null) {
      _error = 'Recording failed — no audio captured';
      _phase = InterviewPhase.idle;
      notifyListeners();
      return null;
    }

    final q = currentQuestion;
    if (q == null) return null;

    try {
      final resp = await _api.postMultipart(
        '/answers',
        fields: {'question_id': q.id},
        audioFile: audioFile,
      );
      final answerId = resp['answer_id'] as String;
      _answerIds.add(answerId);
      return answerId;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void advanceQuestion() {
    _currentIndex++;
    _phase = InterviewPhase.idle;
    notifyListeners();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _audio.dispose();
    super.dispose();
  }
}
