const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
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

export async function openDrivePicker(onPicked: (files: { id: string; name: string; url: string }[]) => void) {
  if (!gapiReady || !pickerReady) {
    await initDrive();
  }
  const auth = (window as any).gapi.auth2.getAuthInstance();
  if (!auth.isSignedIn.get()) {
    await auth.signIn();
  }
  const token = auth.currentUser.get().getAuthResponse(true).access_token;

  const view = new (window as any).google.picker.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);

  const picker = new (window as any).google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(token)
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


