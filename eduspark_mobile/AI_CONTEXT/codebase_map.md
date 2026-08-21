# Mapa de la Base de Código: EduSpark Mobile 🗺️

## 📍 Puntos de Entrada
- `lib/main.dart`: Inicialización de la app y Supabase.

## 📁 Estructura de Directorios
- `lib/config/`: Ajustes globales y constantes.
- `lib/services/`: Capa de datos y lógica de negocio.
  - `auth_service.dart`: Manejo de sesiones con Supabase.
- `lib/screens/`: Pantallas de la aplicación (Legacy/Core).
  - `login_screen.dart`: Pantalla de inicio de sesión.
- `lib/native_v2/`: Nueva capa de componentes con diseño premium.
  - `app_theme.dart`: Definición del sistema de diseño (Dark Mode).
  - `screens/dashboard_screen.dart`: Panel principal moderno.
- `lib/widgets/`: Componentes UI reutilizables.
- `assets/`: Recursos estáticos (imágenes, iconos, fuentes).

## ⚙️ Configuración
- `pubspec.yaml`: Manifiesto de dependencias y configuración de Flutter.
- `analysis_options.yaml`: Reglas de linting de Dart.
- `android/`, `ios/`: Configuraciones nativas específicas por plataforma.

## 🛠️ Herramientas de Desarrollo
- `test/`: Unit tests y Widget tests.
- `scripts/`: (Si existen) Scripts de automatización.
