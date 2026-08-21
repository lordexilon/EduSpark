import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';
import '../../services/auth_service.dart';
import '../../services/data_service.dart';
import '../app_theme.dart';
import '../widgets/glass_card.dart';
import 'course_detail_screen.dart';

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
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

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
      key: _scaffoldKey,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text('EduSpark', style: Theme.of(context).textTheme.headlineMedium),
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          IconButton(
            icon: Icon(MdiIcons.logout),
            onPressed: () => AuthService.signOut(),
            tooltip: 'Cerrar Sesión',
          ),
          const SizedBox(width: 8),
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
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
              : IndexedStack(
                  index: _selectedIndex,
                  children: [
                    _buildHomeTab(),
                    _buildCoursesTab(),
                    _buildTutorTab(),
                    _buildProfileTab(),
                  ],
                ),
        ),
      ),
      drawer: _buildDrawer(),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildHomeTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primaryBlue,
      backgroundColor: AppTheme.darkCard,
      child: ListView(
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
                child: GestureDetector(
                  onTap: () {
                    if (courseData?['id'] != null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => CourseDetailScreen(
                            courseId: courseData!['id'],
                            courseTitle: courseData['title'] ?? 'Detalle del Curso',
                          ),
                        ),
                      );
                    }
                  },
                  child: _buildCourseCard(
                    courseData?['title'] ?? 'Sin título',
                    instructor,
                    (course['completion_percentage'] as num? ?? 0) / 100.0,
                    _getCourseColor(_activeCourses.indexOf(course)),
                  ),
                ),
              );
            }),
          const SizedBox(height: 32),
          _buildSectionHeader('Logros y Estadísticas', ''),
          const SizedBox(height: 16),
          _buildStatsRow(),
          const SizedBox(height: 16),
          _buildBadgeRow(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildCoursesTab() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Mis Cursos', style: Theme.of(context).textTheme.displayLarge),
        const SizedBox(height: 24),
        if (_activeCourses.isEmpty)
          _buildEmptyCourses()
        else
          ..._activeCourses.map((course) {
            final courseData = course['courses'] as Map<String, dynamic>?;
            return GestureDetector(
              onTap: () {
                if (courseData?['id'] != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => CourseDetailScreen(
                        courseId: courseData!['id'],
                        courseTitle: courseData['title'] ?? 'Detalle del Curso',
                      ),
                    ),
                  );
                }
              },
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: _buildCourseCard(
                  courseData?['title'] ?? 'Sin título',
                  'Continua donde lo dejaste',
                  (course['completion_percentage'] as num? ?? 0) / 100.0,
                  _getCourseColor(_activeCourses.indexOf(course)),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildTutorTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(MdiIcons.robot, size: 80, color: AppTheme.primaryBlue.withAlpha(128)),
          const SizedBox(height: 24),
          const Text(
            'Tutor IA Personalizado',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Estamos preparando tu asistente inteligente para ayudarte con tus tareas.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white54),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Center(
          child: Stack(
            children: [
              CircleAvatar(
                radius: 60,
                backgroundColor: AppTheme.primaryBlue.withAlpha(51),
                backgroundImage: (_userData?['avatar_url'] != null)
                    ? NetworkImage(_userData!['avatar_url'])
                    : const NetworkImage('https://api.dicebear.com/7.x/avataaars/png?seed=Felix'),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: AppTheme.primaryBlue, shape: BoxShape.circle),
                  child: const Icon(Icons.edit, size: 20, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Center(
          child: Column(
            children: [
              Text(
                '${_userData?['first_name'] ?? 'Estudiante'} ${_userData?['last_name'] ?? ''}',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              Text(
                _userData?['email'] ?? '',
                style: const TextStyle(color: Colors.white54),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        _buildProfileItem(MdiIcons.accountEdit, 'Editar Perfil'),
        _buildProfileItem(MdiIcons.shieldCheck, 'Privacidad y Seguridad'),
        _buildProfileItem(MdiIcons.bellOutline, 'Notificaciones'),
        const SizedBox(height: 24),
        ListTile(
          leading: Icon(MdiIcons.logout, color: Colors.redAccent),
          title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.redAccent)),
          onTap: () => AuthService.signOut(),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ],
    );
  }

  Widget _buildProfileItem(IconData icon, String title) {
    return ListTile(
      leading: Icon(icon, color: Colors.white70),
      title: Text(title),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white24),
      onTap: () {},
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: AppTheme.darkBg,
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.darkCard),
            currentAccountPicture: CircleAvatar(
              backgroundColor: AppTheme.primaryBlue.withAlpha(51),
              backgroundImage: (_userData?['avatar_url'] != null)
                  ? NetworkImage(_userData!['avatar_url'])
                  : const NetworkImage('https://api.dicebear.com/7.x/avataaars/png?seed=Felix'),
            ),
            accountName: Text('${_userData?['first_name'] ?? 'Estudiante'}'),
            accountEmail: Text(_userData?['email'] ?? 'edu@spark.com'),
          ),
          ListTile(
            leading: Icon(MdiIcons.viewDashboard, color: Colors.white70),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: Icon(MdiIcons.cog, color: Colors.white70),
            title: const Text('Configuración'),
            onTap: () {},
          ),
          const Spacer(),
          const Divider(color: Colors.white10),
          ListTile(
            leading: Icon(MdiIcons.logout, color: Colors.redAccent),
            title: const Text('Cerrar Sesión', style: TextStyle(color: Colors.redAccent)),
            onTap: () async {
              Navigator.pop(context);
              await AuthService.signOut();
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
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
