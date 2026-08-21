/**
 * Session Monitor Hook
 * Monitorea la sesión activa del usuario y cierra automáticamente
 * si otro dispositivo inicia sesión
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deviceService } from '@/services/deviceService';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

const CHECK_INTERVAL = 30000; // 30 segundos
const ACTIVITY_UPDATE_INTERVAL = 60000; // 1 minuto

export const useSessionMonitor = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const lastCheckRef = useRef<Date>(new Date());
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔐 Session Monitor: Iniciando monitoreo para usuario', user.id);

    // Función para verificar si la sesión sigue activa
    const checkSession = async () => {
      if (isCheckingRef.current) {
        console.log('⏭️ Session Monitor: Ya hay una verificación en curso, saltando...');
        return;
      }

      try {
        isCheckingRef.current = true;
        console.log('🔍 Session Monitor: Verificando dispositivo activo...');

        const isActive = await deviceService.isDeviceActive(user.id);

        if (!isActive) {
          console.warn('⚠️ Session Monitor: Sesión cerrada en otro dispositivo');

          // Mostrar alerta al usuario
          alert('Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo.');

          // Cerrar sesión local
          await logout();

          // Siempre redirigir a / después del logout
          navigate('/');
        } else {
          console.log('✅ Session Monitor: Dispositivo activo');
        }

        lastCheckRef.current = new Date();
      } catch (error) {
        console.error('❌ Session Monitor: Error verificando sesión:', error);
        // No hacer nada en caso de error, intentar en el próximo intervalo
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Función para actualizar actividad
    const updateActivity = async () => {
      try {
        console.log('📊 Session Monitor: Actualizando actividad...');
        await deviceService.updateDeviceActivity(user.id);
      } catch (error) {
        console.warn('⚠️ Session Monitor: Error actualizando actividad:', error);
      }
    };

    // Verificación inicial
    checkSession();

    // Intervalo para verificar sesión
    const checkIntervalId = setInterval(checkSession, CHECK_INTERVAL);

    // Intervalo para actualizar actividad
    const activityIntervalId = setInterval(updateActivity, ACTIVITY_UPDATE_INTERVAL);

    // Listener para detectar cambios en tiempo real (opcional, usando Supabase Realtime)
    const setupRealtimeListener = () => {
      const channel = supabase
        .channel(`user_devices:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_devices',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 Session Monitor: Cambio detectado en dispositivos:', payload);
            // Verificar inmediatamente si nuestra sesión sigue activa
            checkSession();
          }
        )
        .subscribe((status) => {
          console.log('📡 Session Monitor: Realtime status:', status);
        });

      return channel;
    };

    const realtimeChannel = setupRealtimeListener();

    // Cleanup
    return () => {
      console.log('🛑 Session Monitor: Deteniendo monitoreo');
      clearInterval(checkIntervalId);
      clearInterval(activityIntervalId);
      realtimeChannel.unsubscribe();
    };
  }, [user?.id, logout, navigate]);
};
