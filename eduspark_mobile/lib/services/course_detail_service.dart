import 'package:supabase_flutter/supabase_flutter.dart';

/// Modelos de datos para la vista de detalle de curso
class CourseDetail {
  final int id;
  final String title;
  final String? description;
  final String? startDate;
  final String? endDate;

  const CourseDetail({
    required this.id,
    required this.title,
    this.description,
    this.startDate,
    this.endDate,
  });

  factory CourseDetail.fromMap(Map<String, dynamic> m) => CourseDetail(
        id: (m['id'] as num).toInt(),
        title: m['title'] as String? ?? 'Sin título',
        description: m['description'] as String?,
        startDate: m['start_date'] as String?,
        endDate: m['end_date'] as String?,
      );
}

class CourseUnit {
  final String id;
  final String title;
  final String? description;
  final int? number;
  final int? orderIndex;
  final String? availableFrom;
  final String? availableUntil;
  final List<String> learningObjectives;

  const CourseUnit({
    required this.id,
    required this.title,
    this.description,
    this.number,
    this.orderIndex,
    this.availableFrom,
    this.availableUntil,
    this.learningObjectives = const [],
  });

  factory CourseUnit.fromMap(Map<String, dynamic> m) {
    final objRaw = m['learning_objectives'];
    List<String> objs = [];
    if (objRaw is List) {
      objs = objRaw.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
    }
    return CourseUnit(
      id: m['id'] as String,
      title: m['title'] as String? ?? 'Unidad sin título',
      description: m['description'] as String?,
      number: (m['number'] as num?)?.toInt(),
      orderIndex: (m['order_index'] as num?)?.toInt(),
      availableFrom: m['available_from'] as String?,
      availableUntil: m['available_until'] as String?,
      learningObjectives: objs,
    );
  }
}

class CourseSession {
  final String id;
  final String title;
  final String? unitId;
  final int? orderIndex;
  final String? availableFrom;
  final String? availableUntil;
  final String? startsAt;
  final String? endsAt;
  // Campos de contenido rico
  final String? description;
  final String? contentHtml;
  final String? contentMarkdown;
  final int? durationMinutes;
  final String? googleMeetLink;
  final List<Map<String, dynamic>> resources; // videos, links, docs

  const CourseSession({
    required this.id,
    required this.title,
    this.unitId,
    this.orderIndex,
    this.availableFrom,
    this.availableUntil,
    this.startsAt,
    this.endsAt,
    this.description,
    this.contentHtml,
    this.contentMarkdown,
    this.durationMinutes,
    this.googleMeetLink,
    this.resources = const [],
  });

  factory CourseSession.fromMap(Map<String, dynamic> m) {
    List<Map<String, dynamic>> resources = [];
    final raw = m['resources'];
    if (raw is List) {
      resources = raw
          .where((e) => e is Map)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }
    return CourseSession(
      id: m['id'] as String,
      title: m['title'] as String? ?? 'Sesión sin título',
      unitId: m['unit_id'] as String?,
      orderIndex: (m['order_index'] as num?)?.toInt(),
      availableFrom: m['available_from'] as String?,
      availableUntil: m['available_until'] as String?,
      startsAt: m['starts_at'] as String?,
      endsAt: m['ends_at'] as String?,
      description: m['description'] as String?,
      contentHtml: m['content_html'] as String?,
      contentMarkdown: m['content_markdown'] as String?,
      durationMinutes: (m['duration_minutes'] as num?)?.toInt(),
      googleMeetLink: m['google_meet_link'] as String?,
      resources: resources,
    );
  }
}

class CourseAssessment {
  final String id;
  final String title;
  final String assessmentType;
  final String? unitId;
  final String? sessionId;
  final bool isFinalExam;
  final String? availableFrom;
  final String? availableUntil;

  const CourseAssessment({
    required this.id,
    required this.title,
    required this.assessmentType,
    this.unitId,
    this.sessionId,
    this.isFinalExam = false,
    this.availableFrom,
    this.availableUntil,
  });

  factory CourseAssessment.fromMap(Map<String, dynamic> m) => CourseAssessment(
        id: m['id'] as String,
        title: m['title'] as String? ?? 'Evaluación',
        assessmentType: m['assessment_type'] as String? ?? 'quiz',
        unitId: m['unit_id'] as String?,
        sessionId: m['session_id'] as String?,
        isFinalExam: m['is_final_exam'] == true,
        availableFrom: m['available_from'] as String?,
        availableUntil: m['available_until'] as String?,
      );
}

class CourseMaterial {
  final String id;
  final String title;
  final String kind; // 'pdf', 'video', 'link', 'other', 'markdown'
  final String? url;
  final String? unitId;
  final String? sessionId;
  final String? category;

  const CourseMaterial({
    required this.id,
    required this.title,
    required this.kind,
    this.url,
    this.unitId,
    this.sessionId,
    this.category,
  });

  factory CourseMaterial.fromMap(Map<String, dynamic> m) => CourseMaterial(
        id: m['id'] as String,
        title: m['title'] as String? ?? 'Material',
        kind: m['kind'] as String? ?? 'other',
        url: m['url'] as String?,
        unitId: m['unit_id'] as String?,
        sessionId: m['session_id'] as String?,
        category: m['category'] as String?,
      );
}

/// Resultado completo del detalle de un curso
class CourseDetailData {
  final CourseDetail course;
  final double completionPercentage;
  final String enrollmentStatus;
  final List<CourseUnit> units;
  final Map<String, List<CourseSession>> sessionsByUnit;
  final Map<String, List<CourseAssessment>> quizzesByUnit;
  final List<CourseAssessment> generalQuizzes;
  final CourseAssessment? finalExam;
  final List<CourseMaterial> materials;
  final Set<String> completedUnitIds;
  final Set<String> completedSessionIds;
  final Set<String> completedQuizIds;

  const CourseDetailData({
    required this.course,
    required this.completionPercentage,
    required this.enrollmentStatus,
    required this.units,
    required this.sessionsByUnit,
    required this.quizzesByUnit,
    required this.generalQuizzes,
    this.finalExam,
    required this.materials,
    required this.completedUnitIds,
    required this.completedSessionIds,
    required this.completedQuizIds,
  });
}

/// Servicio de datos para la pantalla de detalle de curso
class CourseDetailService {
  static final _supabase = Supabase.instance.client;

  static Future<CourseDetailData> loadCourse(int courseId, String userId) async {
    // 1. Curso base
    final courseRow = await _supabase
        .from('courses')
        .select('id, title, description, start_date, end_date')
        .eq('id', courseId)
        .single();
    final course = CourseDetail.fromMap(courseRow);

    // 2. Inscripción del estudiante
    double completionPct = 0.0;
    String enrollStatus = 'active';
    try {
      final enrollRow = await _supabase
          .from('course_enrollments')
          .select('completion_percentage, status')
          .eq('course_id', courseId)
          .eq('student_id', userId)
          .maybeSingle();
      if (enrollRow != null) {
        completionPct = ((enrollRow['completion_percentage'] as num?) ?? 0).toDouble();
        enrollStatus = enrollRow['status'] as String? ?? 'active';
      }
    } catch (e) {
      print('CourseDetailService: enrollment error: $e');
    }

    // 3. Unidades
    final unitsRaw = await _supabase
        .from('course_units')
        .select('id, title, description, number, order_index, available_from, available_until, learning_objectives')
        .eq('course_id', courseId)
        .order('number', ascending: true)
        .order('order_index', ascending: true);
    final units = (unitsRaw as List).map((u) => CourseUnit.fromMap(u as Map<String, dynamic>)).toList();

    // 4. Sesiones (incluye contenido rico)
    final sessionsRaw = await _supabase
        .from('sessions')
        .select('id, title, unit_id, order_index, available_from, available_until, starts_at, ends_at, description, content_html, content_markdown, resources, duration_minutes, google_meet_link')
        .eq('course_id', courseId)
        .order('order_index', ascending: true);
    final allSessions = (sessionsRaw as List).map((s) => CourseSession.fromMap(s as Map<String, dynamic>)).toList();
    final Map<String, List<CourseSession>> sessionsByUnit = {};
    for (final s in allSessions) {
      final key = s.unitId ?? 'sin-unidad';
      sessionsByUnit.putIfAbsent(key, () => []).add(s);
    }

    // 5. Progress del estudiante
    Set<String> completedUnitIds = {};
    Set<String> completedSessionIds = {};
    try {
      final unitProg = await _supabase
          .from('unit_progress')
          .select('unit_id')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .eq('is_completed', true);
      completedUnitIds = {for (final r in unitProg as List) r['unit_id'] as String};

      final sessProg = await _supabase
          .from('session_progress')
          .select('session_id')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .eq('is_completed', true);
      completedSessionIds = {
        for (final r in sessProg as List)
          if (r['session_id'] != null) r['session_id'] as String
      };
    } catch (e) {
      print('CourseDetailService: progress error: $e');
    }

    // 6. Quizzes/assessments
    final Map<String, List<CourseAssessment>> quizzesByUnit = {};
    final List<CourseAssessment> generalQuizzes = [];
    CourseAssessment? finalExam;
    try {
      final quizzesRaw = await _supabase
          .from('assessments')
          .select('id, title, assessment_type, unit_id, session_id, is_final_exam, available_from, available_until')
          .eq('course_id', courseId)
          .eq('is_published', true);
      for (final q in quizzesRaw as List) {
        final assessment = CourseAssessment.fromMap(q as Map<String, dynamic>);
        if (assessment.isFinalExam && assessment.assessmentType == 'exam') {
          finalExam = assessment;
        } else if (assessment.unitId != null) {
          quizzesByUnit.putIfAbsent(assessment.unitId!, () => []).add(assessment);
        } else if (assessment.sessionId != null) {
          // Buscar unidad de la sesión
          String? foundUnit;
          for (final entry in sessionsByUnit.entries) {
            if (entry.value.any((s) => s.id == assessment.sessionId)) {
              foundUnit = entry.key;
              break;
            }
          }
          if (foundUnit != null && foundUnit != 'sin-unidad') {
            quizzesByUnit.putIfAbsent(foundUnit, () => []).add(assessment);
          } else {
            generalQuizzes.add(assessment);
          }
        } else {
          generalQuizzes.add(assessment);
        }
      }
    } catch (e) {
      print('CourseDetailService: quizzes error: $e');
    }

    // 7. Quiz attempts (completados)
    Set<String> completedQuizIds = {};
    try {
      final allQuizIds = [
        ...quizzesByUnit.values.expand((l) => l).map((q) => q.id),
        ...generalQuizzes.map((q) => q.id),
        if (finalExam != null) finalExam.id,
      ];
      if (allQuizIds.isNotEmpty) {
        final attempts = await _supabase
            .from('assessment_attempts')
            .select('assessment_id')
            .eq('student_id', userId)
            .inFilter('assessment_id', allQuizIds)
            .inFilter('status', ['submitted', 'graded']);
        completedQuizIds = {
          for (final r in attempts as List)
            if (r['assessment_id'] != null) r['assessment_id'] as String
        };
      }
    } catch (e) {
      print('CourseDetailService: quiz attempts error: $e');
    }

    // 8. Materiales
    List<CourseMaterial> materials = [];
    try {
      final mRaw = await _supabase
          .from('materials')
          .select('id, title, kind, url, unit_id, session_id, category, purpose')
          .eq('course_id', courseId)
          .neq('purpose', 'rag');
      materials = (mRaw as List).map((m) => CourseMaterial.fromMap(m as Map<String, dynamic>)).toList();
    } catch (e) {
      print('CourseDetailService: materials error: $e');
    }

    return CourseDetailData(
      course: course,
      completionPercentage: completionPct,
      enrollmentStatus: enrollStatus,
      units: units,
      sessionsByUnit: sessionsByUnit,
      quizzesByUnit: quizzesByUnit,
      generalQuizzes: generalQuizzes,
      finalExam: finalExam,
      materials: materials,
      completedUnitIds: completedUnitIds,
      completedSessionIds: completedSessionIds,
      completedQuizIds: completedQuizIds,
    );
  }
}
