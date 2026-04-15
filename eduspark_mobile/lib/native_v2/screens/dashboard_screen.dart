import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';
import '../../services/data_service.dart';
import '../app_theme.dart';
import '../widgets/glass_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  bool _isLoading = true;
  Map<String, dynamic>? _userData;
  List<Map<String, dynamic>> _activeCourses = [];
  Map<String, dynamic> _stats = {'active': 0, 'completed': 0, 'certificates': 0};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final user = await DataService.getCurrentUserProfile();
      final courses = await DataService.getActiveCourses();
      final stats = await DataService.getStudentStats();

      if (mounted) {
        setState(() {
          _userData = user;
          _activeCourses = courses;
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar datos: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text('EduSpark', style: Theme.of(context).textTheme.headlineMedium),
        leading: const Icon(Icons.menu),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.primaryBlue.withAlpha(51),
              backgroundImage: (_userData?['avatar_url'] != null)
                  ? NetworkImage(_userData!['avatar_url'])
                  : const NetworkImage('https://api.dicebear.com/7.x/avataaars/png?seed=Felix'),
            ),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.darkBg,
              Color(0xFF1E1E2C),
              Color(0xFF0F172A),
            ],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _loadData,
            color: AppTheme.primaryBlue,
            backgroundColor: AppTheme.darkCard,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    children: [
                      const SizedBox(height: 16),
                      _buildGreeting(),
                      const SizedBox(height: 32),
                      _buildAIHint(),
                      const SizedBox(height: 32),
                      _buildSectionHeader('Tus Cursos Activos', 'Ver todos'),
                      const SizedBox(height: 16),
                      if (_activeCourses.isEmpty)
                        _buildEmptyCourses()
                      else
                        ..._activeCourses.map((course) {
                          final courseData = course['courses'] as Map<String, dynamic>?;
                          final subjectData = courseData?['subjects'] as Map<String, dynamic>?;
                          final assignments = subjectData?['subject_assignments'] as List?;
                          
                          String instructor = subjectData?['name'] ?? 'Materia general';
                          if (assignments != null && assignments.isNotEmpty) {
                            final teacher = assignments[0]['teacher'];
                            if (teacher != null) {
                              instructor = 'Prof. ${teacher['first_name']} ${teacher['last_name']}';
                            }
                          }
                          
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16.0),
                            child: _buildCourseCard(
                              courseData?['title'] ?? 'Sin título',
                              instructor,
                              (course['completion_percentage'] as num? ?? 0) / 100.0,
                              _getCourseColor(_activeCourses.indexOf(course)),
                            ),
                          );
                        }),
                      const SizedBox(height: 32),
                      _buildSectionHeader('Logros y Estadísticas', ''),
                      const SizedBox(height: 16),
                      _buildStatsRow(),
                      const SizedBox(height: 16),
                      _buildBadgeRow(),
                      const SizedBox(height: 80), // Space for bottom nav
                    ],
                  ),
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Color _getCourseColor(int index) {
    final colors = [AppTheme.primaryBlue, AppTheme.primaryPurple, Colors.orangeAccent, Colors.greenAccent];
    return colors[index % colors.length];
  }

  Widget _buildGreeting() {
    final name = _userData?['first_name'] ?? 'Estudiante';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hola, $name 👋',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 28),
        ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.2),
        const SizedBox(height: 4),
        Text(
          '¿Qué vamos a aprender hoy?',
          style: TextStyle(color: Colors.white.withAlpha(179), fontSize: 16),
        ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
      ],
    );
  }

  Widget _buildEmptyCourses() {
    return GlassCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(MdiIcons.bookOff, color: Colors.white24, size: 48),
          const SizedBox(height: 16),
          const Text(
            'No tienes cursos activos',
            style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            '¡Explora el catálogo y comienza a aprender!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white38, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(child: _buildStatItem('Cursos en curso', _stats['active'].toString(), AppTheme.primaryBlue)),
        const SizedBox(width: 12),
        Expanded(child: _buildStatItem('Completados', _stats['completed'].toString(), Colors.greenAccent)),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(26)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _buildAIHint() {
    return GestureDetector(
      onTap: () {
        // Navegar a Tutor
        setState(() => _selectedIndex = 2);
      },
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withAlpha(51),
                shape: BoxShape.circle,
              ),
              child: Icon(MdiIcons.robot, color: AppTheme.primaryBlue, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tutor AI está listo',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  Text(
                    'Pregúntame sobre tus clases',
                    style: TextStyle(color: Colors.white.withAlpha(179)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white54),
          ],
        ),
      ).animate().scale(delay: 400.ms, duration: 500.ms, curve: Curves.easeOutBack),
    );
  }

  Widget _buildSectionHeader(String title, String action) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        if (action.isNotEmpty)
          Text(action, style: const TextStyle(color: AppTheme.primaryBlue, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildCourseCard(String title, String instructor, double progress, Color accent) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withAlpha(13), width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: accent.withAlpha(30),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(MdiIcons.bookOpenVariant, color: accent),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(instructor, style: const TextStyle(color: Colors.white60, fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${(progress * 100).toInt()}% completado', style: const TextStyle(fontSize: 12, color: Colors.white54)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.white.withAlpha(20),
                    color: accent,
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1);
  }

  Widget _buildBadgeRow() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildBadge(MdiIcons.medal, 'Racha 7 días', Colors.orange),
          const SizedBox(width: 16),
          _buildBadge(MdiIcons.star, 'Top 1% curso', Colors.amber),
          const SizedBox(width: 16),
          _buildBadge(MdiIcons.brain, 'Quiz Master', Colors.green),
        ],
      ),
    );
  }

  Widget _buildBadge(IconData icon, String label, Color color) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.darkCard.withAlpha(204),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(51),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
        child: GNav(
          rippleColor: Colors.grey[800]!,
          hoverColor: Colors.grey[700]!,
          gap: 8,
          activeColor: Colors.white,
          iconSize: 24,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          duration: const Duration(milliseconds: 400),
          tabBackgroundColor: AppTheme.primaryBlue,
          color: Colors.white54,
          tabs: [
            GButton(icon: MdiIcons.homeVariant, text: 'Inicio'),
            GButton(icon: MdiIcons.bookOpenVariant, text: 'Cursos'),
            GButton(icon: MdiIcons.robot, text: 'Tutor'),
            GButton(icon: MdiIcons.accountCircle, text: 'Perfil'),
          ],
          selectedIndex: _selectedIndex,
          onTabChange: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
        ),
      ),
    );
  }
}
