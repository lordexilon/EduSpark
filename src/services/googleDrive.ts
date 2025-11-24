// services/googleDrive.ts
// Servicio para usar Google Drive Picker con tokens OAuth persistentes

import { googleOAuthService } from './googleOAuthService';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let gapiReady = false;
let pickerReady = false;

export async function initDrive(): Promise<void> {
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((res) => (window as any).gapi.load('client:auth2', () => res()));
  await (window as any).gapi.client.init({ apiKey: API_KEY, clientId: CLIENT_ID, scope: SCOPES.join(' ') });
  gapiReady = true;

  await loadScript('https://apis.google.com/js/api.js?onload=__pickerLoaded');
  await new Promise<void>((res) => {
    (window as any).__pickerLoaded = () => res();
    (window as any).gapi.load('picker', () => {
      pickerReady = true;
      res();
    });
  });
}

/**
 * Abre el selector de Google Drive usando tokens OAuth persistentes
 * @param userId - ID del usuario autenticado
 * @param onPicked - Callback cuando se selecciona un archivo/carpeta
 */
export async function openDrivePicker(
  userId: string,
  onPicked: (files: { id: string; name: string; url: string }[]) => void
) {
  try {
    // Obtener token de acceso OAuth persistente
    const accessToken = await googleOAuthService.getAccessToken(userId, 'drive');
    
    if (!accessToken) {
      throw new Error('No hay token de acceso de Google Drive. Por favor, conecta tu cuenta en el perfil primero.');
    }

    // Inicializar Google Picker si no está listo
    if (!pickerReady) {
      await loadScript('https://apis.google.com/js/api.js?onload=__pickerLoaded');
      await new Promise<void>((res) => {
        (window as any).__pickerLoaded = () => res();
        (window as any).gapi.load('picker', () => {
          pickerReady = true;
          res();
        });
      });
    }

    const view = new (window as any).google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);

    const picker = new (window as any).google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setCallback((data: any) => {
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const files = (data.docs || []).map((d: any) => ({
            id: d.id,
            name: d.name || d.id,
            url: d.url || `https://drive.google.com/file/d/${d.id}/view`,
          }));
          onPicked(files);
        }
      })
      .setSize(880, 600)
      .build();

    picker.setVisible(true);
  } catch (error: any) {
    console.error('Error abriendo Google Drive Picker:', error);
    alert(error.message || 'Error al abrir Google Drive. Por favor, verifica que tengas tu cuenta conectada.');
  }
}

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Script load error'));
    document.head.appendChild(s);
  });
}


