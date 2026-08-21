import 'package:supabase_flutter/supabase_flutter.dart';

class DataService {
  static final _supabase = Supabase.instance.client;

  /// Obtener el perfil del usuario actual
  static Future<Map<String, dynamic>?> getCurrentUserProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    final response = await _supabase
        .from('users')
        .select('first_name, last_name, email, avatar_url')
        .eq('id', user.id)
        .single();
    
    return response;
  }

  /// Obtener los cursos activos del estudiante
  static Future<List<Map<String, dynamic>>> getActiveCourses() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      // Nota: Usamos una consulta join de Supabase
      // Si la relación no está explícitamente definida en PostgREST, 
      // podríamos necesitar una vista o un RPC, pero probaremos con select anidado.
      final response = await _supabase
          .from('course_enrollments')
          .select('''
            completion_percentage,
            status,
            courses (
              id,
              title,
              subject_id,
              subjects (
                name,
                subject_assignments (
                  teacher:users!subject_assignments_teacher_id_fkey (
                    first_name,
                    last_name
                  )
                )
              )
            )
          ''')
          .eq('student_id', user.id)
          .eq('status', 'active');

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching active courses: $e');
      return [];
    }
  }

  /// Obtener estadísticas generales (cursos completados, etc.)
  static Future<Map<String, dynamic>> getStudentStats() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return {'completed': 0, 'active': 0, 'certificates': 0};

    try {
      final response = await _supabase
          .from('course_enrollments')
          .select('status');
      
      final active = response.where((e) => e['status'] == 'active').length;
      final completed = response.where((e) => e['status'] == 'completed').length;

      return {
        'active': active,
        'completed': completed,
        'certificates': completed, // Asumimos por ahora
      };
    } catch (e) {
      return {'active': 0, 'completed': 0, 'certificates': 0};
    }
  }
}
