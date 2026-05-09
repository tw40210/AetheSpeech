import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../core/constants.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String _baseUrl;
  String? _token;

  ApiClient({String? baseUrl}) : _baseUrl = baseUrl ?? AppConstants.baseUrl;

  void setToken(String? token) => _token = token;

  Map<String, String> _headers({bool json = true}) => {
        if (json) 'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  void _handleError(http.Response response) {
    if (response.statusCode >= 400) {
      String message;
      try {
        final body = jsonDecode(response.body);
        message = body['detail'] ?? response.body;
      } catch (_) {
        message = response.body;
      }
      throw ApiException(response.statusCode, message.toString());
    }
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(),
      body: jsonEncode(body),
    );
    _handleError(resp);
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: queryParams);
    final resp = await http.get(uri, headers: _headers(json: false));
    _handleError(resp);
    return jsonDecode(resp.body);
  }

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required Map<String, String> fields,
    required File audioFile,
    String audioFieldName = 'audio',
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$_baseUrl$path'));
    request.headers.addAll(_headers(json: false));
    request.fields.addAll(fields);
    request.files.add(await http.MultipartFile.fromPath(
      audioFieldName,
      audioFile.path,
      filename: '${fields['question_id']}.m4a',
    ));
    final streamed = await request.send();
    final resp = await http.Response.fromStream(streamed);
    _handleError(resp);
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }
}
