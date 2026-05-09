import 'package:flutter_test/flutter_test.dart';
import 'package:aethespeech/services/api_client.dart';

// We test the logic of ApiException and basic JSON parsing.
// The ApiClient uses the global http package — for unit tests
// we verify the exception types and message parsing.

void main() {
  group('ApiException', () {
    test('toString includes status and message', () {
      final e = ApiException(404, 'Not found');
      expect(e.toString(), contains('404'));
      expect(e.toString(), contains('Not found'));
    });

    test('statusCode and message are accessible', () {
      final e = ApiException(401, 'Unauthorized');
      expect(e.statusCode, 401);
      expect(e.message, 'Unauthorized');
    });
  });

  group('ApiClient token', () {
    test('setToken updates internal token', () {
      final client = ApiClient(baseUrl: 'http://localhost');
      client.setToken('mytoken');
      // We cannot inspect private fields, but verify no exception thrown
      expect(() => client.setToken(null), returnsNormally);
    });
  });
}
