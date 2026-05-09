import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants.dart';
import 'api_client.dart';

class AuthService extends ChangeNotifier {
  String? _token;
  String? _email;

  String? get token => _token;
  String? get email => _email;
  bool get isAuthenticated => _token != null;

  final ApiClient _api;

  AuthService(this._api);

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(AppConstants.tokenKey);
    _email = prefs.getString(AppConstants.userEmailKey);
    notifyListeners();
  }

  Future<void> register(String email, String password) async {
    final response = await _api.post(
      '/auth/register',
      body: {'email': email, 'password': password},
    );
    await _saveToken(response['access_token'] as String, email);
  }

  Future<void> login(String email, String password) async {
    final response = await _api.post(
      '/auth/login',
      body: {'email': email, 'password': password},
    );
    await _saveToken(response['access_token'] as String, email);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove(AppConstants.userEmailKey);
    _token = null;
    _email = null;
    notifyListeners();
  }

  Future<void> _saveToken(String token, String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tokenKey, token);
    await prefs.setString(AppConstants.userEmailKey, email);
    _token = token;
    _email = email;
    notifyListeners();
  }
}
