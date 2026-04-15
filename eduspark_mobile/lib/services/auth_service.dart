import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  static final SupabaseClient client = Supabase.instance.client;
  static const storage = FlutterSecureStorage();

  static Future<AuthResponse> signIn(String email, String password) async {
    final response = await client.auth.signInWithPassword(
      email: email,
      password: password,
    );
    
    if (response.session != null) {
      // Optativamente podemos guardar el token para el webview bridge
      await storage.write(key: 'supabase_token', value: response.session!.accessToken);
    }
    
    return response;
  }

  static Future<void> signOut() async {
    await client.auth.signOut();
    await storage.delete(key: 'supabase_token');
  }

  static Session? get currentSession => client.auth.currentSession;
}
