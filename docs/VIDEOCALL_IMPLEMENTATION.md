# 📹 Implementación de Videollamadas con Google Meet

## Resumen

Este documento describe cómo implementar el backend necesario para integrar videollamadas sincrónicas usando Google Calendar API y Google Meet API.

## Requisitos Previos

1. **Cuenta de Google Workspace** con acceso a Google Calendar API
2. **Credenciales OAuth 2.0** configuradas en Google Cloud Console
3. **Backend API** (Node.js/Express, Python/FastAPI, etc.)
4. **Base de datos** para almacenar tokens OAuth

## Paso 1: Configuración en Google Cloud Console

### 1.1 Crear Proyecto y Habilitar APIs

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - **Google Calendar API**
   - **Google Meet API** (si está disponible en tu región)

### 1.2 Configurar OAuth 2.0

1. Ve a **APIs & Services > Credentials**
2. Crea **OAuth 2.0 Client ID**
3. Configura:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://tu-dominio.com/api/auth/google/callback`
   - **Authorized JavaScript origins**: `https://tu-dominio.com`

4. Descarga las credenciales (client_id, client_secret)

### 1.3 Configurar Consent Screen

1. Ve a **APIs & Services > OAuth consent screen**
2. Configura la información de la aplicación
3. Agrega los scopes necesarios:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/meetings.space.readonly` (si está disponible)

## Paso 2: Estructura de Base de Datos

### Tabla: `user_oauth_tokens`

```sql
CREATE TABLE user_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user ON user_oauth_tokens(user_id);
```

## Paso 3: Implementación del Backend

### 3.1 Endpoint: POST /api/video-calls/create

```javascript
// Ejemplo en Node.js/Express
const { google } = require('googleapis');

app.post('/api/video-calls/create', async (req, res) => {
  try {
    const { teacherId, config } = req.body;
    
    // 1. Obtener token OAuth del profesor desde la base de datos
    const oauthToken = await getOAuthToken(teacherId, 'google');
    if (!oauthToken) {
      return res.status(401).json({ 
        error: 'Google Calendar no conectado. Por favor conecta tu cuenta.' 
      });
    }

    // 2. Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 3. Configurar credenciales
    oauth2Client.setCredentials({
      access_token: oauthToken.access_token,
      refresh_token: oauthToken.refresh_token,
    });

    // 4. Crear cliente de Calendar
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 5. Crear evento con videollamada
    const event = {
      summary: config.title,
      description: config.description || '',
      start: {
        dateTime: config.startTime,
        timeZone: config.timezone || 'America/Lima',
      },
      end: {
        dateTime: config.endTime,
        timeZone: config.timezone || 'America/Lima',
      },
      conferenceData: {
        createRequest: {
          requestId: generateUUID(), // Generar UUID único
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          },
        },
      },
      attendees: config.attendees?.map(email => ({ email })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 15 }, // 15 minutos antes
        ],
      },
    };

    // 6. Insertar evento en Google Calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
    });

    const createdEvent = response.data;

    // 7. Extraer información de la videollamada
    const meetLink = createdEvent.hangoutLink || 
                     createdEvent.conferenceData?.entryPoints?.[0]?.uri || 
                     null;

    const result = {
      meetLink,
      calendarEventId: createdEvent.id,
      calendarEventUrl: createdEvent.htmlLink,
    };

    res.json(result);
  } catch (error) {
    console.error('Error creando videollamada:', error);
    
    // Manejar errores de token expirado
    if (error.code === 401) {
      // Intentar refrescar el token
      const refreshed = await refreshOAuthToken(teacherId, 'google');
      if (refreshed) {
        // Reintentar la operación
        // ... código de reintento
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'Error al crear la videollamada' 
    });
  }
});
```

### 3.2 Endpoint: GET /api/video-calls/:eventId/attendance

```javascript
app.get('/api/video-calls/:eventId/attendance', async (req, res) => {
  try {
    const { eventId } = req.params;
    const teacherId = req.user.id; // Asumiendo autenticación middleware

    // Obtener token OAuth
    const oauthToken = await getOAuthToken(teacherId, 'google');
    if (!oauthToken) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Configurar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(/* ... */);
    oauth2Client.setCredentials({
      access_token: oauthToken.access_token,
      refresh_token: oauthToken.refresh_token,
    });

    // Obtener evento de Calendar
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    // Intentar obtener información de asistencia desde Google Meet API
    // NOTA: La API de Meet tiene limitaciones y puede requerir permisos especiales
    let attendance = [];
    
    try {
      const meet = google.meet({ version: 'v1', auth: oauth2Client });
      // Llamada a Meet API si está disponible
      // attendance = await meet.conferences.get({ conferenceId: ... });
    } catch (meetError) {
      console.warn('Meet API no disponible:', meetError);
      // Alternativa: usar información de Calendar
      attendance = event.data.attendees?.map(attendee => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus,
      })) || [];
    }

    res.json({
      participantCount: attendance.length,
      attendance,
      recordingUrl: null, // Se puede obtener después si la grabación está habilitada
    });
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3.3 Refresh de Tokens OAuth

```javascript
async function refreshOAuthToken(userId, provider) {
  try {
    const token = await db.query(
      'SELECT * FROM user_oauth_tokens WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );

    if (!token || !token.refresh_token) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(/* ... */);
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Actualizar token en la base de datos
    await db.query(
      `UPDATE user_oauth_tokens 
       SET access_token = $1, expires_at = $2, updated_at = NOW()
       WHERE user_id = $3 AND provider = $4`,
      [
        credentials.access_token,
        new Date(Date.now() + credentials.expiry_date * 1000),
        userId,
        provider
      ]
    );

    return credentials.access_token;
  } catch (error) {
    console.error('Error refrescando token:', error);
    return null;
  }
}
```

## Paso 4: Flujo de Autorización OAuth

### 4.1 Iniciar Autorización

```javascript
app.get('/api/auth/google', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(/* ... */);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent', // Forzar consent para obtener refresh_token
  });
  
  res.redirect(authUrl);
});
```

### 4.2 Callback de Autorización

```javascript
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const userId = req.session.userId; // Obtener desde sesión

    const oauth2Client = new google.auth.OAuth2(/* ... */);
    const { tokens } = await oauth2Client.getToken(code);

    // Guardar tokens en la base de datos
    await db.query(
      `INSERT INTO user_oauth_tokens 
       (user_id, provider, access_token, refresh_token, expires_at, scope)
       VALUES ($1, 'google', $2, $3, $4, $5)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET 
         access_token = $2, 
         refresh_token = $3, 
         expires_at = $4, 
         scope = $5,
         updated_at = NOW()`,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expiry_date * 1000),
        tokens.scope,
      ]
    );

    res.redirect('/teacher/settings?google_connected=true');
  } catch (error) {
    console.error('Error en callback OAuth:', error);
    res.redirect('/teacher/settings?error=auth_failed');
  }
});
```

## Paso 5: Variables de Entorno

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/auth/google/callback
```

## Paso 6: Actualizar Frontend

El frontend ya está preparado. Solo necesitas:

1. **Ejecutar el script SQL**: `76_add_videocall_fields.sql`
2. **Configurar las URLs del backend** en `services/videoCallService.ts`
3. **Agregar el componente VideoCallScheduler** en las páginas de edición de sesiones

## Próximos Pasos (Opcional)

1. **Registro de Asistencia Automático**: Implementar webhook de Google Calendar
2. **Grabaciones Automáticas**: Configurar grabación automática y acceso a URLs
3. **Notificaciones**: Enviar recordatorios a estudiantes antes de la clase
4. **Panel de Asistencia**: Mostrar estadísticas de asistencia por sesión

## Referencias

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Meet API Documentation](https://developers.google.com/meet/api)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
