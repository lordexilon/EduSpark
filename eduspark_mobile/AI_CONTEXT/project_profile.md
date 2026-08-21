# Perfil del Proyecto: EduSpark Mobile 📱

## 🏷️ Información General
- **Nombre:** EduSpark Mobile
- **Stack Principal:** Flutter + Supabase
- **Tipo de Proyecto:** Aplicación Móvil Multiplataforma (Android/iOS)
- **Versión SCA:** v2.6 (Gatekeeper Edition)

## 🔧 Stack Tecnológico
- **Lenguaje:** Dart (^3.11.0)
- **Framework:** Flutter
- **Backend-as-a-Service:** Supabase (Auth, Database)
- **Almacenamiento Seguro:** flutter_secure_storage
- **UI/UX:** 
  - Google Fonts (Tipografía)
  - Glass Kit (Efectos Glassmorphism)
  - Flutter Animate (Micro-animaciones)
  - Material Design Icons
  - Shimmer (Carga visual)

## 🏗️ Arquitectura y Patrones
- **Estructura:** Separación por capas (screens, services, widgets, config).
- **Gestión de Estado:** Basado en `StreamBuilder` para autenticación reactiva (directamente desde Supabase).
- **Diseño:** Tema Oscuro nativo (`native_v2/app_theme.dart`).

## 📂 Archivos Críticos
1. `lib/main.dart`: Punto de entrada e inicialización de Supabase.
2. `pubspec.yaml`: Gestión de dependencias y assets.
3. `lib/services/`: Lógica de integración con Supabase.
4. `lib/native_v2/`: Nueva arquitectura de componentes y temas.

## 🔍 Estrategia de Búsqueda Recomendada
- Usar `grep_search` para buscar por clases de servicios en `lib/services/`.
- Priorizar `lib/native_v2/` para cambios relacionados con la UI moderna.
- Verificar `pubspec.yaml` antes de añadir nuevas funcionalidades que requieran paquetes externos.

## 🚨 Requisitos de Entorno y Troubleshooting
### Prerrequisitos de Windows
- **Developer Mode (Modo Desarrollador):** DEBE estar activado para permitir la creación de enlaces simbólicos (symlinks) necesarios para los plugins de Flutter. 
  - Comando: `start ms-settings:developers`.
- **Permisos de SDK:** Evitar instalar Flutter en `C:\Program Files` para prevenir errores de escritura en el cache.

### Errores Comunes Desbloqueados
- **Directory Locking (build/ o .pub-preload-cache):** Si Flutter falla al borrar directorios, es probable que otro proceso los esté bloqueando. 
  - Solución: Cerrar editores, ejecutar `Remove-Item -Recurse -Force` desde PowerShell y luego `flutter clean`.
- **Symlink Support:** Si aparece el error "Building with plugins requires symlink support", activar el Modo Desarrollador en Windows.
