#!/usr/bin/env python3
"""
EduSpark Desktop Uploader - GUI Version
Interfaz gráfica moderna con CustomTkinter para procesar PDFs.
"""

import os
import sys
import json
import time
import hashlib
import threading
import tempfile
import re
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import urlparse

# GUI
import customtkinter as ctk
from tkinter import filedialog, messagebox

# Reuse core logic from ingest.py
import requests
from supabase import create_client, Client
from pypdf import PdfReader
from google import genai
from google.genai import types
from dotenv import load_dotenv

# ============================================
# CONFIGURACIÓN
# ============================================

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mckfscukxcqwntpjagar.supabase.co")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8")
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY", "AIzaSyAusGEsO9EtJjOUuHJwIdnFDBG599BHD-4")

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 50  # Optimizado: aumentado de 2 a 50

# ============================================
# COLORES Y TEMA
# ============================================

COLORS = {
    "bg_dark": "#0f0f1a",
    "bg_card": "#1a1a2e",
    "bg_input": "#16213e",
    "accent": "#00d2ff",
    "accent_hover": "#00a8cc",
    "accent_green": "#00e676",
    "accent_red": "#ff5252",
    "accent_yellow": "#ffc107",
    "text_primary": "#e0e0e0",
    "text_secondary": "#a0a0b0",
    "text_muted": "#666680",
    "border": "#2a2a4a",
    "success": "#00c853",
    "error": "#ff1744",
    "drop_zone": "#1e1e3a",
    "drop_zone_hover": "#2a2a5a",
}

# ============================================
# UTILIDADES DE PROCESAMIENTO (del ingest.py)
# ============================================

supabase_admin = None
if SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except:
        pass


def get_credentials_path() -> Path:
    return Path.home() / ".eduspark" / "credentials.json"

def save_session(access_token, user_id, email, role):
    creds_path = get_credentials_path()
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    with open(creds_path, "w") as f:
        json.dump({"access_token": access_token, "user_id": user_id, "email": email, "role": role}, f)

def load_session() -> Optional[Dict[str, str]]:
    creds_path = get_credentials_path()
    if not creds_path.exists():
        return None
    with open(creds_path, "r") as f:
        return json.load(f)

def retry_operation(func, max_retries=10, delay=2, backoff=1.5):
    last_exception = None
    for i in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exception = e
            msg = str(e).lower()
            transient = [
                "503", "502", "504", "57014", "timeout", "ssl", "connection", "unavailable", "10054", "10060",
                "429", "resource_exhausted", "rate limit", "quota"
            ]
            if any(err in msg for err in transient):
                wait_time = delay * (backoff ** i)
                # Cuando hay límite de cuota/rate limit conviene esperar más.
                if "429" in msg or "resource_exhausted" in msg or "quota" in msg:
                    wait_time = max(5, wait_time)
                time.sleep(min(wait_time, 60))
            else:
                raise e
    raise Exception(f"Falló después de {max_retries} intentos: {last_exception}")


def generate_embedding(text_or_list, client: genai.Client) -> list:
    """Genera embeddings usando Gemini. Soporta un solo texto o una lista (batch)."""
    if not text_or_list:
        return []
    
    def _call():
        result = client.models.embed_content(
            model="gemini-embedding-2-preview",
            contents=text_or_list,
            config=types.EmbedContentConfig(output_dimensionality=512),
        )
        if isinstance(text_or_list, list):
            return [emb.values for emb in result.embeddings]
        return result.embeddings[0].values
    
    return retry_operation(_call, max_retries=12, delay=3, backoff=2.0)


def read_pdf_pages(pdf_path):
    reader = PdfReader(pdf_path)
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        # Eliminar caracteres nulos (\u0000) que no son compatibles con Postgres/Supabase
        text = text.replace('\u0000', '')
        yield {"page_num": page_num, "total_pages": len(reader.pages), "text": text.strip()}


def create_chunks(text, page_num):
    if not text:
        return
    start = 0
    chunk_index = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end]
        chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        yield {"text": chunk_text, "hash": chunk_hash, "page": page_num, "chunk_index": chunk_index}
        start += CHUNK_SIZE - CHUNK_OVERLAP
        chunk_index += 1


def upload_file_to_storage(filepath, supabase_client):
    try:
        filename = os.path.basename(filepath)
        storage_path = f"{int(time.time())}_{filename}"
        file_size = os.path.getsize(filepath)
        with open(filepath, 'rb') as f:
            file_bytes = f.read()
            supabase_client.storage.from_("course-documents").upload(
                path=storage_path, file=file_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            public_url = supabase_client.storage.from_("course-documents").get_public_url(storage_path)
            if hasattr(public_url, 'publicURL'):
                public_url = public_url.publicURL
            return str(public_url), file_size
    except Exception as e:
        return "", 0


def extract_google_drive_id(url: str):
    patterns = [r'/file/d/([a-zA-Z0-9_-]+)', r'/document/d/([a-zA-Z0-9_-]+)', r'id=([a-zA-Z0-9_-]+)', r'/d/([a-zA-Z0-9_-]+)']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def download_from_google_drive(file_id, dest_dir, access_token=None, suggested_filename=None):
    """
    Descarga un archivo de Google Drive. 
    Si se proporciona access_token, usa el API v3 oficial (soporta archivos privados).
    Si no, usa el enlace público (solo archivos públicos).
    """
    try:
        if access_token:
            # Método oficial: API v3 (Soporta archivos privados)
            url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(url, headers=headers, stream=True)
            
            if response.status_code != 200:
                print(f"Error API Drive: {response.status_code}")
                return None
        else:
            # Método público (Legacy)
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
            session = requests.Session()
            response = session.get(url, stream=True)
            for key, value in response.cookies.items():
                if key.startswith('download_warning'):
                    url = f"https://drive.google.com/uc?export=download&confirm={value}&id={file_id}"
                    response = session.get(url, stream=True)
                    break
        
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' in content_type and not access_token:
            return None
        
        filename = suggested_filename or "documento.pdf"
        cd = response.headers.get('content-disposition', '')
        if cd:
            d = dict(re.findall(r'(?i)(filename)=["\']?([^"\';]+)["\']?', cd))
            if 'filename' in d:
                filename = d['filename']
        filename = filename.strip('\"\';')
        
        dest_path = os.path.join(dest_dir, filename)
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return dest_path
    except Exception as e:
        print(f"Error descarga Drive: {e}")
        return None


# ============================================
# CLASE PRINCIPAL: APP GUI
# ============================================

class EduSparkUploaderApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Config ventana
        self.title("📚 EduSpark Uploader")
        self.geometry("800x700")
        self.minsize(700, 600)
        self.configure(fg_color=COLORS["bg_dark"])

        # Estado
        self.session = load_session()
        self.supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        self.db_client = supabase_admin if supabase_admin else self.supabase
        self.google_token = None
        self.drive_folder_id = None
        self.courses = []
        self.selected_files = []
        self.gdrive_links = {} # Mapeo de path local -> ID de Google Drive
        self.is_processing = False
        self.processing_start_time = 0

        # Construir UI
        self._build_ui()

        # Verificar sesión
        if self.session:
            self.log(f"✅ Sesión activa: {self.session['email']} ({self.session['role']})")
            self._load_courses()
            self._update_user_label()
        else:
            self.log("⚠️ No hay sesión activa. Haz clic en 'Iniciar Sesión'.")
            self._show_login_required()

    # ============================================
    # CONSTRUCCIÓN DE UI
    # ============================================

    def _build_ui(self):
        # --- Header ---
        header = ctk.CTkFrame(self, fg_color=COLORS["bg_card"], corner_radius=0, height=70)
        header.pack(fill="x", padx=0, pady=0)
        header.pack_propagate(False)

        title_label = ctk.CTkLabel(
            header, text="📚  EduSpark Uploader",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color=COLORS["accent"]
        )
        title_label.pack(side="left", padx=20, pady=15)

        # User info + login button
        user_frame = ctk.CTkFrame(header, fg_color="transparent")
        user_frame.pack(side="right", padx=20)

        self.user_label = ctk.CTkLabel(
            user_frame, text="No conectado",
            font=ctk.CTkFont(size=12),
            text_color=COLORS["text_secondary"]
        )
        self.user_label.pack(side="left", padx=(0, 10))

        self.login_btn = ctk.CTkButton(
            user_frame, text="Iniciar Sesión", width=120, height=32,
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            text_color="#000000", font=ctk.CTkFont(size=12, weight="bold"),
            corner_radius=8, command=self._show_login_dialog
        )
        self.login_btn.pack(side="left")

        # --- Main content ---
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=20, pady=15)

        # --- Course selector ---
        course_frame = ctk.CTkFrame(main, fg_color=COLORS["bg_card"], corner_radius=12, height=60)
        course_frame.pack(fill="x", pady=(0, 12))
        course_frame.pack_propagate(False)

        ctk.CTkLabel(
            course_frame, text="📖 Curso:",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=COLORS["text_primary"]
        ).pack(side="left", padx=(15, 10), pady=15)

        self.course_var = ctk.StringVar(value="Selecciona un curso...")
        self.course_dropdown = ctk.CTkComboBox(
            course_frame, variable=self.course_var,
            values=["Cargando cursos..."], width=400, height=35,
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            button_color=COLORS["accent"], button_hover_color=COLORS["accent_hover"],
            dropdown_fg_color=COLORS["bg_card"], dropdown_hover_color=COLORS["bg_input"],
            text_color=COLORS["text_primary"],
            font=ctk.CTkFont(size=13), corner_radius=8,
            state="readonly"
        )
        self.course_dropdown.pack(side="left", padx=10, pady=15)

        # --- Drop zone ---
        self.drop_frame = ctk.CTkFrame(
            main, fg_color=COLORS["drop_zone"],
            corner_radius=16, border_width=2,
            border_color=COLORS["border"], height=180
        )
        self.drop_frame.pack(fill="x", pady=(0, 12))
        self.drop_frame.pack_propagate(False)
        self.drop_frame.bind("<Button-1>", lambda e: self._select_files())

        # Icono y texto del drop zone
        drop_content = ctk.CTkFrame(self.drop_frame, fg_color="transparent")
        drop_content.place(relx=0.5, rely=0.5, anchor="center")

        self.drop_icon = ctk.CTkLabel(
            drop_content, text="☁️",
            font=ctk.CTkFont(size=48),
            text_color=COLORS["accent"]
        )
        self.drop_icon.pack(pady=(0, 5))

        self.drop_text = ctk.CTkLabel(
            drop_content, text="Haz clic aquí para seleccionar PDFs",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=COLORS["text_primary"]
        )
        self.drop_text.pack()

        self.drop_subtext = ctk.CTkLabel(
            drop_content, text="Soporta: PDF, múltiples archivos, Google Drive links",
            font=ctk.CTkFont(size=11),
            text_color=COLORS["text_muted"]
        )
        self.drop_subtext.pack(pady=(2, 0))

        # Bind click on all children
        for widget in [drop_content, self.drop_icon, self.drop_text, self.drop_subtext]:
            widget.bind("<Button-1>", lambda e: self._select_files())

        # --- Files list ---
        self.files_frame = ctk.CTkFrame(main, fg_color=COLORS["bg_card"], corner_radius=12, height=0)
        # Hidden initially, shown when files are selected

        # --- Google Drive link input ---
        gdrive_frame = ctk.CTkFrame(main, fg_color=COLORS["bg_card"], corner_radius=12, height=50)
        gdrive_frame.pack(fill="x", pady=(0, 12))
        gdrive_frame.pack_propagate(False)

        ctk.CTkLabel(
            gdrive_frame, text="☁️",
            font=ctk.CTkFont(size=16),
            text_color=COLORS["text_secondary"]
        ).pack(side="left", padx=(15, 5), pady=10)

        self.gdrive_entry = ctk.CTkEntry(
            gdrive_frame, placeholder_text="O pega un link de Google Drive aquí...",
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            text_color=COLORS["text_primary"], placeholder_text_color=COLORS["text_muted"],
            font=ctk.CTkFont(size=12), corner_radius=8, height=32, width=450
        )
        self.gdrive_entry.pack(side="left", padx=5, pady=10, fill="x", expand=True)

        self.gdrive_btn = ctk.CTkButton(
            gdrive_frame, text="Descargar", width=100, height=32,
            fg_color=COLORS["bg_input"], hover_color=COLORS["accent_hover"],
            border_color=COLORS["accent"], border_width=1,
            text_color=COLORS["accent"], font=ctk.CTkFont(size=12),
            corner_radius=8, command=self._download_from_gdrive
        )
        self.gdrive_btn.pack(side="right", padx=(5, 15), pady=10)

        self.browser_btn = ctk.CTkButton(
            gdrive_frame, text="📁 Ver Carpeta", width=100, height=32,
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            text_color="#000000", font=ctk.CTkFont(size=12, weight="bold"),
            corner_radius=8, command=self._show_drive_browser
        )
        self.browser_btn.pack(side="right", pady=10)

        # --- Progress ---
        progress_frame = ctk.CTkFrame(main, fg_color=COLORS["bg_card"], corner_radius=12)
        progress_frame.pack(fill="x", pady=(0, 12))

        progress_top = ctk.CTkFrame(progress_frame, fg_color="transparent")
        progress_top.pack(fill="x", padx=15, pady=(12, 5))

        self.progress_label = ctk.CTkLabel(
            progress_top, text="Listo para procesar",
            font=ctk.CTkFont(size=13), text_color=COLORS["text_secondary"]
        )
        self.progress_label.pack(side="left")

        self.progress_pct = ctk.CTkLabel(
            progress_top, text="0%",
            font=ctk.CTkFont(size=13, weight="bold"), text_color=COLORS["accent"]
        )
        self.progress_pct.pack(side="right")

        self.progress_bar = ctk.CTkProgressBar(
            progress_frame, height=8, corner_radius=4,
            fg_color=COLORS["bg_input"], progress_color=COLORS["accent"]
        )
        self.progress_bar.pack(fill="x", padx=15, pady=(0, 5))
        self.progress_bar.set(0)

        # --- Action buttons ---
        btn_frame = ctk.CTkFrame(progress_frame, fg_color="transparent")
        btn_frame.pack(fill="x", padx=15, pady=(5, 12))

        self.process_btn = ctk.CTkButton(
            btn_frame, text="🚀  Procesar PDFs", height=40, width=200,
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            text_color="#000000", font=ctk.CTkFont(size=14, weight="bold"),
            corner_radius=10, command=self._start_processing
        )
        self.process_btn.pack(side="left")

        self.cancel_btn = ctk.CTkButton(
            btn_frame, text="⏹ Cancelar", height=40, width=120,
            fg_color=COLORS["accent_red"], hover_color="#cc0000",
            text_color="#ffffff", font=ctk.CTkFont(size=13),
            corner_radius=10, command=self._cancel_processing, state="disabled"
        )
        self.cancel_btn.pack(side="left", padx=(10, 0))

        self.sync_btn = ctk.CTkButton(
            btn_frame, text="☁️ Sincronizar Web", height=40, width=160,
            fg_color="#2563eb", hover_color="#1d4ed8",
            text_color="#ffffff", font=ctk.CTkFont(size=13, weight="bold"),
            corner_radius=10, command=self._sync_cloud_jobs
        )
        self.sync_btn.pack(side="left", padx=(10, 0))

        self.file_count_label = ctk.CTkLabel(
            btn_frame, text="0 archivos seleccionados",
            font=ctk.CTkFont(size=12), text_color=COLORS["text_muted"]
        )
        self.file_count_label.pack(side="right")

        # --- Log panel ---
        log_frame = ctk.CTkFrame(main, fg_color=COLORS["bg_card"], corner_radius=12)
        log_frame.pack(fill="both", expand=True)

        log_header = ctk.CTkFrame(log_frame, fg_color="transparent")
        log_header.pack(fill="x", padx=15, pady=(10, 5))

        ctk.CTkLabel(
            log_header, text="📋 Log de Procesamiento",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=COLORS["text_primary"]
        ).pack(side="left")

        ctk.CTkButton(
            log_header, text="Limpiar", width=70, height=26,
            fg_color="transparent", hover_color=COLORS["bg_input"],
            text_color=COLORS["text_muted"], font=ctk.CTkFont(size=11),
            corner_radius=6, command=self._clear_log
        ).pack(side="right")

        self.log_text = ctk.CTkTextbox(
            log_frame, height=150,
            fg_color=COLORS["bg_dark"], text_color=COLORS["text_secondary"],
            font=ctk.CTkFont(family="Consolas", size=11),
            corner_radius=8, border_width=1, border_color=COLORS["border"],
            wrap="word"
        )
        self.log_text.pack(fill="both", expand=True, padx=15, pady=(0, 12))

    # ============================================
    # AUTENTICACIÓN
    # ============================================

    def _refresh_google_token(self, refresh_token):
        """Usa el refresh_token para obtener un nuevo access_token de Google."""
        client_id = os.getenv("VITE_GOOGLE_CLIENT_ID")
        client_secret = os.getenv("VITE_GOOGLE_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            return None
            
        try:
            url = "https://oauth2.googleapis.com/token"
            data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
            response = requests.post(url, data=data)
            if response.status_code == 200:
                new_token_data = response.json()
                new_access_token = new_token_data.get("access_token")
                
                # Actualizar en la base de datos para no tener que refrescar todo el tiempo
                self.db_client.table("user_google_tokens").update({
                    "access_token": new_access_token,
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }).eq("user_id", self.session["user_id"]).execute()
                
                self.google_token = new_access_token
                return new_access_token
        except Exception as e:
            self.log(f"⚠️ Falló el refresco de token: {e}")
        return None

    def _get_google_token(self, force_refresh=False):
        """Busca el token de Google del usuario en la base de datos."""
        if not self.session:
            return None
        try:
            res = self.db_client.table("user_google_tokens").select("*").eq("user_id", self.session["user_id"]).execute()
            if res.data:
                tokens = res.data
                token_record = next((t for t in tokens if t["service_type"] in ["drive", "both"]), tokens[0])
                
                self.google_token = token_record["access_token"]
                self.refresh_token = token_record.get("refresh_token")
                
                # Si forzamos o si detectamos que podría estar viejo (opcional: comparar updated_at)
                if force_refresh and self.refresh_token:
                    return self._refresh_google_token(self.refresh_token)
                
                # Buscar carpeta
                user_res = self.db_client.table("users").select("google_drive_folder_id").eq("id", self.session["user_id"]).single().execute()
                if user_res.data:
                    self.drive_folder_id = user_res.data.get("google_drive_folder_id")
                
                return self.google_token
        except Exception as e:
            self.log(f"⚠️ Error recuperando token de Google: {e}")
        return None

    def _update_user_label(self):
        if self.session:
            self.user_label.configure(
                text=f"👤 {self.session['email']}",
                text_color=COLORS["accent_green"]
            )
            self.login_btn.configure(text="Cambiar cuenta")
            self.process_btn.configure(state="normal")
            self.sync_btn.configure(state="normal")
            self.course_dropdown.configure(state="readonly")
            self.browser_btn.configure(state="normal")
            # Cargar token de Google en segundo plano
            threading.Thread(target=self._get_google_token, daemon=True).start()
        else:
            self.user_label.configure(text="No conectado", text_color=COLORS["text_secondary"])
            self.login_btn.configure(text="Iniciar Sesión")
            self._show_login_required()

    def _show_login_dialog(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("🔐 Iniciar Sesión")
        dialog.geometry("400x300")
        dialog.configure(fg_color=COLORS["bg_dark"])
        dialog.transient(self)
        dialog.grab_set()

        # Center
        dialog.update_idletasks()
        x = self.winfo_x() + (self.winfo_width() - 400) // 2
        y = self.winfo_y() + (self.winfo_height() - 300) // 2
        dialog.geometry(f"400x300+{x}+{y}")

        frame = ctk.CTkFrame(dialog, fg_color=COLORS["bg_card"], corner_radius=16)
        frame.pack(fill="both", expand=True, padx=20, pady=20)

        ctk.CTkLabel(
            frame, text="🔐 EduSpark Login",
            font=ctk.CTkFont(size=18, weight="bold"), text_color=COLORS["accent"]
        ).pack(pady=(20, 15))

        email_entry = ctk.CTkEntry(
            frame, placeholder_text="Email", width=280, height=38,
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            text_color=COLORS["text_primary"], corner_radius=8
        )
        email_entry.pack(pady=(0, 10))

        pass_entry = ctk.CTkEntry(
            frame, placeholder_text="Contraseña", show="●", width=280, height=38,
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            text_color=COLORS["text_primary"], corner_radius=8
        )
        pass_entry.pack(pady=(0, 15))

        error_label = ctk.CTkLabel(frame, text="", text_color=COLORS["accent_red"], font=ctk.CTkFont(size=11))
        error_label.pack()

        def do_login():
            email = email_entry.get().strip()
            password = pass_entry.get().strip()
            if not email or not password:
                error_label.configure(text="⚠️ Completa todos los campos")
                return

            try:
                response = self.supabase.auth.sign_in_with_password({"email": email, "password": password})
                user = response.user
                session = response.session

                role_data = self.supabase.table("users").select("role_id, roles(name)").eq("id", user.id).single().execute()
                role = role_data.data.get("roles", {}).get("name", "unknown")

                if role not in ["admin", "admin-campus", "teacher"]:
                    error_label.configure(text=f"❌ Rol '{role}' sin permisos")
                    return

                save_session(session.access_token, user.id, email, role)
                self.session = load_session()
                self._update_user_label()
                self._load_courses()
                self.log(f"✅ Sesión iniciada: {email} ({role})")
                dialog.destroy()

            except Exception as e:
                error_label.configure(text=f"❌ {str(e)[:50]}")

        ctk.CTkButton(
            frame, text="Ingresar", width=200, height=38,
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            text_color="#000000", font=ctk.CTkFont(size=14, weight="bold"),
            corner_radius=10, command=do_login
        ).pack(pady=(5, 20))

    # ============================================
    # CURSOS
    # ============================================

    def _load_courses(self):
        try:
            res = self.supabase.table("courses").select("id, title, code").limit(30).execute()
            self.courses = res.data or []
            course_names = [f"[{c['id']}] {c['code'] or ''} - {c['title']}" for c in self.courses]
            if course_names:
                self.course_dropdown.configure(values=course_names)
                self.course_var.set(course_names[0])
            else:
                self.course_dropdown.configure(values=["No hay cursos disponibles"])
            self.log(f"📖 {len(self.courses)} cursos cargados")
        except Exception as e:
            self.log(f"❌ Error cargando cursos: {e}")

    def _get_selected_course_id(self) -> Optional[int]:
        val = self.course_var.get()
        match = re.match(r'\[(\d+)\]', val)
        return int(match.group(1)) if match else None

    # ============================================
    # SELECCIÓN DE ARCHIVOS
    # ============================================

    def _select_files(self):
        files = filedialog.askopenfilenames(
            title="Seleccionar PDFs",
            filetypes=[("PDF files", "*.pdf"), ("Todos", "*.*")]
        )
        if files:
            self.selected_files = list(files)
            self._update_file_count()
            for f in files:
                name = Path(f).name
                size_mb = os.path.getsize(f) / (1024 * 1024)
                self.log(f"📄 Seleccionado: {name} ({size_mb:.1f} MB)")

    def _update_file_count(self):
        n = len(self.selected_files)
        self.file_count_label.configure(
            text=f"{n} archivo{'s' if n != 1 else ''} seleccionado{'s' if n != 1 else ''}",
            text_color=COLORS["accent"] if n > 0 else COLORS["text_muted"]
        )
        if n > 0:
            self.drop_text.configure(text=f"{n} archivo{'s' if n != 1 else ''} listo{'s' if n != 1 else ''}")
            self.drop_icon.configure(text="✅")
        else:
            self.drop_text.configure(text="Haz clic aquí para seleccionar PDFs")
            self.drop_icon.configure(text="☁️")

    def _sync_cloud_jobs(self):
        if self.is_processing:
            return
            
        def task():
            try:
                self.after(0, lambda: self.sync_btn.configure(state="disabled", text="Buscando..."))
                self.after(0, lambda: self.log("☁️ Buscando archivos pesados delegados desde la Web..."))
                
                res = retry_operation(lambda: self.db_client.table("materials").select("id, title, course_id, metadata, size_bytes").eq("rag_status", "pending").execute())
                
                desktop_jobs = [r for r in res.data if isinstance(r.get("metadata"), dict) and r["metadata"].get("ragProcessingType") == "desktop" and r["metadata"].get("sourceFileId")]
                
                if not desktop_jobs:
                    self.after(0, lambda: self.log("ℹ️ No hay archivos delegados en espera."))
                    self.after(0, lambda: self.sync_btn.configure(state="normal", text="☁️ Sincronizar Web"))
                    return
                
                self.after(0, lambda: self.log(f"🌩️ Se encontraron {len(desktop_jobs)} archivos en cola. Preparando descargas..."))
                
                for job in desktop_jobs:
                    file_id = job["metadata"]["sourceFileId"]
                    # Check if already downloaded/queued
                    found = any(f_id == file_id for f_id in self.gdrive_links.values())
                    if found:
                        continue
                        
                    pdf_name = job["title"]
                    self.after(0, lambda n=pdf_name: self.log(f"📥 Descargando PDF delegado (Drive): {n}"))
                    
                    temp_dir = tempfile.mkdtemp()
                    dest_path = download_from_google_drive(file_id, temp_dir, self.google_token, suggested_filename=pdf_name)
                    if dest_path:
                        self.selected_files.append(dest_path)
                        self.gdrive_links[dest_path] = file_id # Register drive link
                        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
                        self.after(0, lambda f=pdf_name, s=size_mb: self.log(f"✅ Anexado a cola local: {f} ({s:.1f} MB)"))
                        
                        self.after(0, self._update_file_count)
                    else:
                        self.after(0, lambda n=pdf_name: self.log(f"❌ Error descargando {n}. Archivo no accesible."))
                
                self.after(0, lambda: self.sync_btn.configure(state="normal", text="☁️ Sincronizar Web"))
                self.after(0, lambda: self.log("✅ Servidor Sincronizado. Debes seleccionar MÁS ARRIBA 👆 un curso cualquiera temporal (se respetará el curso original) y presionar 'Procesar PDFs'."))
                
            except Exception as e:
                self.after(0, lambda err=str(e): self.log(f"❌ Error sincronizando: {err}"))
                self.after(0, lambda: self.sync_btn.configure(state="normal", text="☁️ Sincronizar Web"))
                
        threading.Thread(target=task, daemon=True).start()

    # ============================================
    # GOOGLE DRIVE
    # ============================================

    def _download_from_gdrive(self):
        url = self.gdrive_entry.get().strip()
        if not url:
            return

        file_id = extract_google_drive_id(url)
        if not file_id:
            self.log("❌ No se pudo extraer el ID del archivo de Google Drive")
            return

        self.log(f"☁️ Descargando desde Google Drive: {file_id}...")
        self.gdrive_btn.configure(state="disabled", text="Descargando...")

        def download():
            temp_dir = tempfile.mkdtemp()
            dest_path = download_from_google_drive(file_id, temp_dir, self.google_token, suggested_filename=None)
            if dest_path:
                self.selected_files.append(dest_path)
                self.gdrive_links[dest_path] = file_id # Guardar el ID de Drive
                filename = os.path.basename(dest_path)
                
                size_mb = os.path.getsize(dest_path) / (1024 * 1024)
                self.after(0, lambda f=filename, s=size_mb: self.log(f"✅ Descarga lista: {f} ({s:.1f} MB)"))
                self.after(0, self._update_file_count)
            else:
                self.after(0, lambda: self.log("❌ Error descargando. El archivo puede ser privado."))
            self.after(0, lambda: self.gdrive_btn.configure(state="normal", text="Descargar"))
            self.after(0, lambda: self.gdrive_entry.delete(0, "end"))

        threading.Thread(target=download, daemon=True).start()

    # ============================================
    # PROCESAMIENTO
    # ============================================

    def _start_processing(self):
        if not self.session:
            messagebox.showwarning("EduSpark", "Debes iniciar sesión primero.")
            return

        if not self.selected_files:
            messagebox.showwarning("EduSpark", "Selecciona al menos un archivo PDF.")
            return

        course_id = self._get_selected_course_id()
        if not course_id:
            messagebox.showwarning("EduSpark", "Selecciona un curso.")
            return

        self.is_processing = True
        self.process_btn.configure(state="disabled", text="⏳ Procesando...")
        self.cancel_btn.configure(state="normal")
        self.course_dropdown.configure(state="disabled")

        threading.Thread(
            target=self._process_files,
            args=(list(self.selected_files), course_id),
            daemon=True
        ).start()

    def _cancel_processing(self):
        self.is_processing = False
        self.log("⏹ Cancelación solicitada...")

    def _process_files(self, files, course_id):
        total_files = len(files)
        self.processing_start_time = time.time()

        for file_idx, pdf_path in enumerate(files):
            if not self.is_processing:
                self.after(0, lambda: self.log("⏹ Procesamiento cancelado."))
                break

            pdf_name = Path(pdf_path).name
            self.after(0, lambda n=pdf_name, i=file_idx: self.log(f"\n{'='*50}\n📄 [{i+1}/{total_files}] Procesando: {n}"))

            try:
                self._process_single_pdf(pdf_path, course_id, file_idx, total_files)
            except Exception as e:
                self.after(0, lambda err=str(e): self.log(f"❌ Error: {err}"))

        self.after(0, self._processing_finished)

    def _process_single_pdf(self, pdf_path, course_id, file_idx, total_files):
        pdf_name = Path(pdf_path).name
        user_id = self.session["user_id"]

        # Count pages
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        del reader
        self.after(0, lambda tp=total_pages: self.log(f"📊 {tp} páginas detectadas"))

        file_size = os.path.getsize(pdf_path)
        file_url = ""
        gdrive_file_id = self.gdrive_links.get(pdf_path)

        # Upload to storage ONLY if it's not from Google Drive
        if gdrive_file_id:
            self.after(0, lambda: self.log("☁️ Documento de Google Drive detectado."))
            self.after(0, lambda: self.progress_label.configure(text=f"Vinculando Drive {pdf_name}..."))
            file_url = f"https://drive.google.com/file/d/{gdrive_file_id}/view"
            self.after(0, lambda: self.log(f"✅ Enlazado directo a Drive (se omite subida al servidor para ahorrar tiempo y espacio)"))
        else:
            self.after(0, lambda: self.progress_label.configure(text=f"Subiendo {pdf_name}..."))
            file_url, _ = upload_file_to_storage(pdf_path, self.db_client)
            if file_url:
                self.after(0, lambda: self.log(f"☁️ Subido archivo físico a Storage"))
            else:
                self.after(0, lambda: self.log(f"⚠️ Aviso: Archivo demasiado pesado para Storage (>50MB). Se omitió la subida de archivo físico pero se continuará con Inteligencia Artificial."))

        # Register in materials OR find existing
        material_id = None
        try:
            # Check if this file was delegated from web (sync)
            is_delegated = False
            if gdrive_file_id:
                # Find if material already exists (pending + desktop)
                self.after(0, lambda: self.log(f"Buscando si el ID {gdrive_file_id} ya existe delegado..."))
                existing_res = self.db_client.table("materials").select("id, metadata").eq("rag_status", "pending").execute()
                for mat in existing_res.data:
                    if isinstance(mat.get("metadata"), dict) and mat["metadata"].get("sourceFileId") == gdrive_file_id:
                        material_id = mat["id"]
                        is_delegated = True
                        break
                    
            if not is_delegated:
                metadata = {
                    "uploadedVia": "desktop_uploader_gui_v2", 
                    "fileSize": file_size, 
                    "totalPages": total_pages, 
                    "uploadedBy": user_id
                }
                if gdrive_file_id:
                    metadata["sourceFileId"] = gdrive_file_id
                    metadata["source"] = "google_drive"
                else:
                    metadata["source"] = "bucket"

                mat_data = {
                    "course_id": course_id, "title": pdf_name, "kind": "pdf",
                    "url": file_url or "", "rag_status": "processing", "size_bytes": file_size,
                    "metadata": metadata
                }
                mat_res = retry_operation(lambda: self.db_client.table("materials").insert(mat_data).execute())
                if mat_res.data:
                    material_id = mat_res.data[0]["id"]
                    self.after(0, lambda mid=material_id: self.log(f"📋 Material registrado: {mid}"))
            else:
                self.after(0, lambda mid=material_id: self.log(f"📋 Material delegado de Web encontrado ({mid}), procesando..."))
                self.db_client.table("materials").update({"rag_status": "processing"}).eq("id", material_id).execute()
        except Exception as e:
            self.after(0, lambda err=str(e): self.log(f"⚠️ No se pudo registrar/buscar material: {err[:60]}"))

        # Register in processed_documents
        document_id = None
        try:
            doc_data = {
                "institution_id": 1, "title": pdf_name, "file_type": "application/pdf",
                "file_url": file_url, "file_size_bytes": file_size,
                "total_chunks": total_pages, "processing_status": "processing", "processed_by": user_id
            }
            if course_id:
                try:
                    course_res = self.supabase.table("courses").select("institution_id").eq("id", course_id).single().execute()
                    if course_res.data:
                        doc_data["institution_id"] = course_res.data["institution_id"]
                except:
                    pass
            doc_res = retry_operation(lambda: self.db_client.table("processed_documents").insert(doc_data).execute())
            if doc_res.data:
                document_id = doc_res.data[0]["id"]
        except:
            pass

        # Process pages
        chunks_to_insert = []
        processed_hashes = set()
        processed_pages = 0

        for page_data in read_pdf_pages(pdf_path):
            if not self.is_processing:
                return

            page_num = page_data["page_num"]
            page_text = page_data["text"]

            # Generar chunks locales para esta página
            page_chunks = []
            for chunk in create_chunks(page_text, page_num):
                if chunk["hash"] in processed_hashes:
                    continue
                processed_hashes.add(chunk["hash"])
                page_chunks.append(chunk)

            if page_chunks:
                page_start_time = time.time()
                # 1. BATCH EMBEDDING para toda la página (Mucho más rápido)
                try:
                    all_embeddings = []
                    # Sub-lotes más pequeños para reducir 429/RESOURCE_EXHAUSTED.
                    SUB_BATCH_SIZE = 8
                    for i in range(0, len(page_chunks), SUB_BATCH_SIZE):
                        sub_batch = page_chunks[i:i + SUB_BATCH_SIZE]
                        texts_to_embed = [c["text"] for c in sub_batch]
                        try:
                            embeddings = generate_embedding(texts_to_embed, self.gemini_client)
                            if embeddings:
                                all_embeddings.extend(embeddings)
                        except Exception as batch_error:
                            # Fallback: intentar chunk por chunk para no perder toda la página.
                            self.after(0, lambda err=str(batch_error), p=page_num: self.log(
                                f"⚠️ Sub-lote con error en pág {p}, fallback individual: {err[:80]}"
                            ))
                            for chunk in sub_batch:
                                try:
                                    emb = generate_embedding(chunk["text"], self.gemini_client)
                                    if emb:
                                        all_embeddings.append(emb)
                                except Exception as chunk_error:
                                    self.after(0, lambda err=str(chunk_error), p=page_num: self.log(
                                        f"⚠️ Chunk omitido en pág {p} por límite API: {err[:70]}"
                                    ))
                        # Micro pausa para bajar picos de rate limit.
                        time.sleep(0.2)
                    
                    if len(all_embeddings) == len(page_chunks):
                        for i, chunk in enumerate(page_chunks):
                            chunks_to_insert.append({
                                "content": chunk["text"],
                                "embedding": all_embeddings[i],
                                "metadata": {
                                    "sourceFileName": pdf_name, "source": pdf_name,
                                    "pageStart": chunk["page"], "pageEnd": chunk["page"],
                                    "page_start": chunk["page"], "page_end": chunk["page"],
                                    "chunkIndex": chunk["chunk_index"], "chunk_index": chunk["chunk_index"],
                                    "hash": chunk["hash"], "course_id": course_id,
                                    "material_id": material_id, "uploaded_by": user_id
                                }
                            })
                except Exception as e:
                    self.after(0, lambda err=str(e), p=page_num: self.log(f"⚠️ Error embedding (pág {p}): {err[:100]}"))

                # Medir tiempo por página
                page_elapsed = time.time() - page_start_time
                if page_elapsed > 30:
                    self.after(0, lambda el=page_elapsed, p=page_num: self.log(f"⏳ La página {p} está demorando ({el:.1f} seg). API ocupada."))

                # 2. BATCH INSERT en base de datos
                if len(chunks_to_insert) >= BATCH_SIZE:
                    db_chunks = [{"course_id": course_id, "content": c["content"], "embedding": c["embedding"],
                                  "chunk_index": c["metadata"]["chunk_index"], "metadata": c["metadata"]} for c in chunks_to_insert]
                    try:
                        retry_operation(lambda batch=db_chunks: self.db_client.table("course_content_chunks").insert(batch).execute())
                        chunks_to_insert = []
                    except Exception as e:
                        self.after(0, lambda err=str(e): self.log(f"❌ Error DB batch: {err[:60]}"))

            processed_pages += 1
            progress = processed_pages / total_pages
            overall = (file_idx + progress) / total_files

            self.after(0, lambda p=progress, o=overall, pn=page_num, tp=total_pages, fn=pdf_name:
                self._update_progress(o, f"{fn}: página {pn}/{tp}"))

            # Eliminado time.sleep(0.8) para máxima velocidad

        # Final batch
        if chunks_to_insert:
            db_chunks = [{"course_id": course_id, "content": c["content"], "embedding": c["embedding"],
                          "chunk_index": c["metadata"]["chunk_index"], "metadata": c["metadata"]} for c in chunks_to_insert]
            try:
                retry_operation(lambda: self.db_client.table("course_content_chunks").insert(db_chunks).execute())
            except:
                pass

        # Update statuses
        if document_id:
            try:
                self.db_client.table("processed_documents").update(
                    {"processing_status": "completed", "total_chunks": len(processed_hashes)}
                ).eq("id", document_id).execute()
            except:
                pass

        if material_id:
            try:
                curr_mat = self.db_client.table("materials").select("metadata").eq("id", material_id).single().execute()
                meta = curr_mat.data.get("metadata") or {}
                meta.update({
                    "ragProcessed": True,
                    "lastProcessedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "totalChunks": len(processed_hashes),
                    "totalPages": total_pages
                })
                self.db_client.table("materials").update({
                    "rag_status": "completed",
                    "metadata": meta
                }).eq("id", material_id).execute()
            except Exception as update_err:
                self.after(0, lambda err=str(update_err): self.log(f"⚠️ Aviso: fallo al actualizar la metadata: {err}"))

        total_elapsed = time.time() - self.processing_start_time
        mins, secs = divmod(int(total_elapsed), 60)
        
        self.after(0, lambda n=pdf_name, c=len(processed_hashes), m=mins, s=secs: self.log(f"✅ {n} completado: {c} chunks creados en {m}m {s}s"))

    def _update_progress(self, value, text):
        self.progress_bar.set(value)
        self.progress_pct.configure(text=f"{int(value * 100)}%")
        self.progress_label.configure(text=text)

    def _processing_finished(self):
        self.is_processing = False
        self.process_btn.configure(state="normal", text="🚀  Procesar PDFs")
        self.cancel_btn.configure(state="disabled")
        self.course_dropdown.configure(state="readonly")
        self.progress_bar.set(1.0)
        self.progress_pct.configure(text="100%")
        self.progress_label.configure(text="✅ Procesamiento completado")
        self.selected_files = []
        self._update_file_count()
        self.log("\n🎉 ¡Procesamiento completado!")

    # ============================================
    # LOG
    # ============================================

    def log(self, text):
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.insert("end", f"[{timestamp}] {text}\n")
        self.log_text.see("end")

    def _clear_log(self):
        self.log_text.delete("1.0", "end")

    # ============================================
    # NAVEGADOR DE DRIVE
    # ============================================

    def _show_drive_browser(self):
        if not self.google_token:
            token = self._get_google_token()
            if not token:
                messagebox.showinfo("EduSpark", "Primero vincula tu cuenta de Google Drive en la aplicación web.")
                return

        browser = ctk.CTkToplevel(self)
        browser.title("📁 Explorador de Google Drive")
        browser.geometry("600x600")
        browser.configure(fg_color=COLORS["bg_dark"])
        browser.transient(self)
        browser.grab_set()

        # Center
        browser.update_idletasks()
        x = self.winfo_x() + (self.winfo_width() - 600) // 2
        y = self.winfo_y() + (self.winfo_height() - 600) // 2
        browser.geometry(f"600x600+{x}+{y}")

        # State for navigation
        self.browser_path = [{"id": self.drive_folder_id or 'root', "name": "EduSpark"}]
        
        path_label = ctk.CTkLabel(
            browser, text="📁 EduSpark",
            font=ctk.CTkFont(size=14, weight="bold"), text_color=COLORS["accent"]
        )
        path_label.pack(pady=(15, 5))

        list_frame = ctk.CTkScrollableFrame(browser, fg_color=COLORS["bg_card"], corner_radius=12)
        list_frame.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        def add_to_queue(file_id, name):
            self.log(f"📥 Seleccionado desde navegador: {name}")
            temp_dir = tempfile.mkdtemp()
            
            loading = ctk.CTkLabel(browser, text=f"Descargando {name}...", text_color=COLORS["accent_yellow"])
            loading.pack(pady=5)
            browser.update()
            
            # Quitar extensión .pdf del nombre si llega duplicada o para el sugerido
            clean_name = name if name.lower().endswith(".pdf") else f"{name}.pdf"

            dest_path = download_from_google_drive(file_id, temp_dir, self.google_token, suggested_filename=clean_name)
            if dest_path:
                self.selected_files.append(dest_path)
                self.gdrive_links[dest_path] = file_id
                self._update_file_count()
                self.log(f"✅ Listo para procesar: {name}")
                loading.destroy()
                browser.destroy()
            else:
                loading.configure(text=f"❌ Error al descargar {name}", text_color=COLORS["accent_red"])

        def navigate_to(folder_id, folder_name):
            self.browser_path.append({"id": folder_id, "name": folder_name})
            update_list()

        def go_back():
            if len(self.browser_path) > 1:
                self.browser_path.pop()
                update_list()

        def update_list():
            # Clear current list
            for widget in list_frame.winfo_children():
                widget.destroy()
            
            current = self.browser_path[-1]
            path_text = " / ".join([p["name"] for p in self.browser_path])
            path_label.configure(text=f"📁 {path_text}")

            # Add "Back" button if not at root
            if len(self.browser_path) > 1:
                back_btn = ctk.CTkButton(
                    list_frame, text="⬅️ Volver",
                    fg_color="transparent", hover_color=COLORS["bg_input"],
                    text_color=COLORS["accent"], anchor="w",
                    command=go_back
                )
                back_btn.pack(fill="x", pady=2)

            loading_label = ctk.CTkLabel(list_frame, text="Cargando contenido...", text_color=COLORS["text_muted"])
            loading_label.pack(pady=20)
            
            def load_task():
                try:
                    folder_id = current["id"]
                    # Buscar CARPETAS y PDFs
                    query = f"'{folder_id}' in parents and (mimeType='application/vnd.google-apps.folder' or mimeType='application/pdf') and trashed=false"
                    url = f"https://www.googleapis.com/drive/v3/files?q={requests.utils.quote(query)}&fields=files(id,name,mimeType,size)&orderBy=folder,name"
                    headers = {"Authorization": f"Bearer {self.google_token}"}
                    
                    response = requests.get(url, headers=headers)
                    
                    if response.status_code == 401 and hasattr(self, 'refresh_token') and self.refresh_token:
                        # Intentar refrescar una vez si da 401
                        new_token = self._refresh_google_token(self.refresh_token)
                        if new_token:
                            headers["Authorization"] = f"Bearer {new_token}"
                            response = requests.get(url, headers=headers)

                    loading_label.destroy()
                    
                    if response.status_code == 200:
                        files = response.json().get('files', [])
                        if not files:
                            ctk.CTkLabel(list_frame, text="Carpeta vacía").pack(pady=20)
                        
                        for f in files:
                            is_folder = f['mimeType'] == 'application/vnd.google-apps.folder'
                            icon = "📁" if is_folder else "📄"
                            text_color = COLORS["accent"] if is_folder else COLORS["text_primary"]
                            
                            # Mostrar tamaño si es archivo
                            size_str = ""
                            if not is_folder and 'size' in f:
                                size_mb = int(f['size']) / (1024 * 1024)
                                size_str = f" ({size_mb:.1f} MB)"
                            
                            cmd = (lambda fid=f['id'], fn=f['name']: navigate_to(fid, fn)) if is_folder \
                                  else (lambda fid=f['id'], fn=f['name']: add_to_queue(fid, fn))
                            
                            btn = ctk.CTkButton(
                                list_frame, text=f"{icon} {f['name']}{size_str}",
                                fg_color="transparent", hover_color=COLORS["bg_input"],
                                text_color=text_color, anchor="w",
                                font=ctk.CTkFont(weight="bold" if is_folder else "normal"),
                                command=cmd
                            )
                            btn.pack(fill="x", pady=1)
                    else:
                        ctk.CTkLabel(list_frame, text=f"Error: {response.status_code}", text_color=COLORS["accent_red"]).pack(pady=20)
                except Exception as e:
                    if loading_label.winfo_exists(): loading_label.destroy()
                    ctk.CTkLabel(list_frame, text=f"Error: {str(e)[:50]}", text_color=COLORS["accent_red"]).pack(pady=20)

            threading.Thread(target=load_task, daemon=True).start()

        update_list()


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
    app = EduSparkUploaderApp()
    app.mainloop()
