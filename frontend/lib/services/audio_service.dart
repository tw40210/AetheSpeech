import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AudioService {
  final AudioRecorder _recorder = AudioRecorder();

  bool _isRecording = false;
  String? _currentPath;

  bool get isRecording => _isRecording;

  Future<bool> hasPermission() async {
    return await _recorder.hasPermission();
  }

  Future<void> startRecording(String filename) async {
    if (_isRecording) return;
    final dir = await getTemporaryDirectory();
    _currentPath = '${dir.path}/$filename.m4a';
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 16000,
        bitRate: 64000,
        numChannels: 1,
        androidConfig: AndroidRecordConfig(
          useLegacy: true,
          manageBluetooth: false,
          audioSource: AndroidAudioSource.mic,
        ),
      ),
      path: _currentPath!,
    );
    _isRecording = true;
  }

  Future<File?> stopRecording() async {
    if (!_isRecording) return null;
    final path = await _recorder.stop();
    _isRecording = false;
    if (path == null) return null;
    final file = File(path);
    return file.existsSync() ? file : null;
  }

  Future<void> cancelRecording() async {
    if (_isRecording) {
      await _recorder.cancel();
      _isRecording = false;
    }
  }

  Future<void> dispose() async {
    await _recorder.dispose();
  }
}
