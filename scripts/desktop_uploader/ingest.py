#!/usr/bin/env python3
"""
EduSpark Desktop Uploader - Script de Ingesta de PDFs Grandes
Procesa PDFs localmente y sube los vectores a Supabase.

Uso:
    EduSparkUploader.exe                  # Abre modo interactivo
    EduSparkUploader.exe archivo.pdf      # Procesar un PDF
"""

import os
import sys
import json
import time
import hashlib
import argparse
import tempfile
import re
from pathlib import Path
from typing import Generator, Dict, Any, Optional
from urllib.parse import urlparse, parse_qs

# Rich para UI bonita en terminal
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, DownloadColumn
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich.table import Table

# HTTP requests
import requests

# Supabase
from supabase import create_client, Client

# PDF Processing
from pypdf import PdfReader

# Gemini para embeddings (nuevo SDK google-genai)
from google import genai
from dotenv import load_dotenv


console = Console()

# ============================================
# CONFIGURACIÓN EMBEBIDA (El docente no configura nada)
# ============================================

# Cargar variables de entorno si existen (para desarrollo)
load_dotenv()

# IMPORTANTE: Estas credenciales se incluyen en el .exe
# Solo permiten acceso autenticado (el usuario debe hacer login)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mckfscukxcqwntpjagar.supabase.co")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8")
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY", "AIzaSyAusGEsO9EtJjOUuHJwIdnFDBG599BHD-4")

CHUNK_SIZE = 1000  # Caracteres por chunk
CHUNK_OVERLAP = 200  # Overlap entre chunks
BATCH_SIZE = 2  # Reducido de 5 a 2 para máxima estabilidad en conexiones inestables

# Cliente Admin para operaciones de escritura (Bypass RLS)
supabase_admin = None
if SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        console.print("[dim]⚡ Cliente Admin inicializado (Bypass RLS activado)[/dim]")
    except Exception as e:
        console.print(f"[yellow]⚠️ Advertencia: No se pudo crear cliente admin: {e}[/yellow]")



# ============================================
# AUTENTICACIÓN
# ============================================

def get_credentials_path() -> Path:
    """Retorna la ruta del archivo de credenciales."""
    return Path.home() / ".eduspark" / "credentials.json"

def save_session(access_token: str, user_id: str, email: str, role: str):
    """Guarda la sesión del usuario."""
    creds_path = get_credentials_path()
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(creds_path, "w") as f:
        json.dump({
            "access_token": access_token,
            "user_id": user_id,
            "email": email,
            "role": role
        }, f)
    
    console.print(f"[green]✓ Sesión guardada en {creds_path}[/green]")

def load_session() -> Optional[Dict[str, str]]:
    """Carga la sesión guardada."""
    creds_path = get_credentials_path()
    if not creds_path.exists():
        return None
    
    with open(creds_path, "r") as f:
        return json.load(f)

def login(supabase: Client) -> Dict[str, str]:
    """Inicia sesión con credenciales de EduSpark."""
    console.print(Panel("🔐 [bold]Iniciar Sesión en EduSpark[/bold]"))
    
    email = Prompt.ask("Email")
    password = Prompt.ask("Contraseña", password=True)
    
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        user = response.user
        session = response.session
        
        # Obtener rol del usuario
        role_data = supabase.table("users").select("role_id, roles(name)").eq("id", user.id).single().execute()
        role = role_data.data.get("roles", {}).get("name", "unknown")
        
        # Validar que sea admin o teacher
        if role not in ["admin", "admin-campus", "teacher"]:
            console.print(f"[red]❌ Error: Tu rol ({role}) no tiene permisos para usar esta herramienta.[/red]")
            sys.exit(1)
        
        save_session(session.access_token, user.id, email, role)
        
        console.print(f"[green]✓ Bienvenido, {email} (Rol: {role})[/green]")
        return {"user_id": user.id, "email": email, "role": role, "token": session.access_token}
        
    except Exception as e:
        console.print(f"[red]❌ Error de autenticación: {e}[/red]")
        sys.exit(1)

# ============================================
# DESCARGA DESDE URLS Y GOOGLE DRIVE
# ============================================

def upload_file_to_storage(filepath: str, supabase_client: Client) -> tuple[str, int]:
    """Sube el archivo al bucket 'course-documents' y retorna (url_publica, size_bytes)."""
    try:
        filename = os.path.basename(filepath)
        # Crear nombre único para evitar colisiones: timestamp_filename
        storage_path = f"{int(time.time())}_{filename}"
        
        # Verificar tamaño del archivo
        file_size = os.path.getsize(filepath)
        
        with open(filepath, 'rb') as f:
            file_bytes = f.read()
            
            # Usar 'upsert' para sobrescribir si existe (aunque el timestamp lo hace único)
            res = supabase_client.storage.from_("course-documents").upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            
            # Obtener URL pública
            public_url = supabase_client.storage.from_("course-documents").get_public_url(storage_path)
            
            # Ajuste por versiones de la librería
            if hasattr(public_url, 'publicURL'): 
                 public_url = public_url.publicURL # type: ignore
            
            console.print(f"[green]☁️ Archivo subido a Storage: {filename}[/green]")
            return str(public_url), file_size

    except Exception as e:
        console.print(f"[red]⚠️ Error subiendo archivo a Storage: {e}[/red]")
        # Retornamos vacío para no bloquear, pero es ideal que suba
        return "", 0

def extract_google_drive_id(url: str) -> Optional[str]:
    """Extrae el ID del archivo de una URL de Google Drive."""
    # Formatos soportados:
    # https://drive.google.com/file/d/FILE_ID/view
    # https://drive.google.com/open?id=FILE_ID
    # https://docs.google.com/document/d/FILE_ID/edit
    
    patterns = [
        r'/file/d/([a-zA-Z0-9_-]+)',
        r'/document/d/([a-zA-Z0-9_-]+)',
        r'id=([a-zA-Z0-9_-]+)',
        r'/d/([a-zA-Z0-9_-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def download_from_google_drive(file_id: str, dest_path: str) -> bool:
    """Descarga un archivo desde Google Drive usando link de descarga directa."""
    console.print(f"[blue]☁️ Descargando desde Google Drive...[/blue]")
    
    # URL de descarga directa (funciona para archivos públicos o con link compartido)
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    try:
        session = requests.Session()
        
        # Primera solicitud (puede pedir confirmación para archivos grandes)
        response = session.get(url, stream=True)
        
        # Buscar token de confirmación para archivos grandes
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                url = f"https://drive.google.com/uc?export=download&confirm={value}&id={file_id}"
                response = session.get(url, stream=True)
                break
        
        # Verificar que sea un PDF (o al menos no HTML)
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' in content_type:
            console.print("[red]❌ Error: El link de Google Drive devolvió una página web (HTML) en lugar del archivo.[/red]")
            console.print("[yellow]Posibles causas:\n1. El archivo es privado (debes hacerlo público: 'Cualquiera con el link').\n2. Requiere confirmación de virus (archivo muy grande).[/yellow]")
            console.print("[cyan]Solución: Descarga el archivo manualmente y usa la opción 2 (Archivo Local).[/cyan]")
            return False
            
        if 'application/pdf' not in content_type and 'octet-stream' not in content_type:
            console.print(f"[yellow]⚠️ El archivo puede no ser un PDF válido (Type: {content_type})[/yellow]")
        
        # Descargar con barra de progreso
        total_size = int(response.headers.get('content-length', 0))
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            DownloadColumn(),
            console=console
        ) as progress:
            task = progress.add_task("Descargando...", total=total_size)
            
            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        progress.update(task, advance=len(chunk))
        
        console.print(f"[green]✓ Descarga completada: {Path(dest_path).name}[/green]")
        return True
        
    except Exception as e:
        console.print(f"[red]❌ Error descargando desde Google Drive: {e}[/red]")
        return False

def download_from_url(url: str, dest_path: str) -> bool:
    """Descarga un archivo desde una URL directa."""
    console.print(f"[blue]🔗 Descargando desde URL...[/blue]")
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            DownloadColumn(),
            console=console
        ) as progress:
            task = progress.add_task("Descargando...", total=total_size)
            
            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        progress.update(task, advance=len(chunk))
        
        console.print(f"[green]✓ Descarga completada[/green]")
        return True
        
    except Exception as e:
        console.print(f"[red]❌ Error descargando: {e}[/red]")
        return False

# ============================================
# PROCESAMIENTO DE PDF (LAZY LOADING)
# ============================================

def read_pdf_pages(pdf_path: str) -> Generator[Dict[str, Any], None, None]:
    """
    Lee un PDF página por página usando generadores.
    Esto mantiene el uso de RAM constante sin importar el tamaño del archivo.
    """
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        yield {
            "page_num": page_num,
            "total_pages": total_pages,
            "text": text.strip()
        }

def create_chunks(text: str, page_num: int) -> Generator[Dict[str, Any], None, None]:
    """Divide el texto en chunks con overlap."""
    if not text:
        return
    
    start = 0
    chunk_index = 0
    
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end]
        
        # Calcular hash para deduplicación
        chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
        
        yield {
            "text": chunk_text,
            "hash": chunk_hash,
            "page": page_num,
            "chunk_index": chunk_index
        }
        
        start += CHUNK_SIZE - CHUNK_OVERLAP
        chunk_index += 1

# ============================================
# EMBEDDINGS CON GEMINI
# ============================================

from google.genai import types

def retry_operation(func, max_retries=10, delay=2, backoff=1.5):
    """Reintenta una operación con backoff exponencial y mejor manejo de errores de red."""
    last_exception = None
    for i in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exception = e
            msg = str(e).lower()
            
            # Lista ampliada de errores transitorios
            transient_errors = [
                "503", "502", "504", # HTTP Server Errors
                "57014", # Postgres cancel
                "timeout", # Timeouts
                "ssl", "signature", # SSL/Network errors
                "connection", "disconnected", # Connection errors
                "10054", "10060", # Windows sockets errors
                "unavailable"
            ]
            
            is_transient = any(err in msg for err in transient_errors)
            
            if is_transient:
                wait_time = delay * (backoff ** i)
                console.print(f"[yellow]⚠️ Error transitorio ({e}). Reintentando en {wait_time:.1f}s... ({i+1}/{max_retries})[/yellow]")
                time.sleep(wait_time)
            else:
                # Si no es transitorio, fallar inmediatamente
                raise e
                
    raise Exception(f"Falló después de {max_retries} intentos. Último error: {last_exception}")

def generate_embedding(text: str, client: genai.Client) -> list:
    """Genera embedding usando Gemini (nuevo SDK google-genai) con retries."""
    def _call():
        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
        return result.embeddings[0].values
    
    return retry_operation(_call)

def list_courses(supabase: Client) -> list:
    """Lista los cursos disponibles."""
    try:
        res = supabase.table("courses").select("id, title, code").limit(20).execute()
        return res.data
    except Exception as e:
        console.print(f"[red]❌ Error obteniendo cursos: {e}[/red]")
        return []

def select_course(supabase: Client) -> int:
    """Muestra menú para seleccionar un curso."""
    courses = list_courses(supabase)
    
    if not courses:
        console.print("[yellow]⚠️ No se encontraron cursos asignados a tu usuario.[/yellow]")
        manual_id = Prompt.ask("Ingresa el ID del curso manualmente (o Enter para usar 1)", default="1")
        return int(manual_id)
    
    table = Table(title="Selecciona un Curso")
    table.add_column("ID", justify="right", style="cyan")
    table.add_column("Código", style="magenta")
    table.add_column("Título", style="green")
    
    for c in courses:
        table.add_row(str(c["id"]), c["code"] or "", c["title"])
        
    console.print(table)
    
    course_id = Prompt.ask("ID del curso", default=str(courses[0]["id"]))
    return int(course_id)

def ingest_pdf(
    pdf_path: str, 
    supabase: Client,
    user_id: str,
    gemini_client: genai.Client,
    course_id: Optional[int] = None,
    material_id: Optional[int] = None
):
    """Procesa un PDF e inserta los vectores en Supabase."""
    
    pdf_name = Path(pdf_path).name
    console.print(Panel(f"📄 [bold]Procesando: {pdf_name}[/bold]"))
    
    # Obtener total de páginas para la barra de progreso
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    del reader  # Liberar memoria
    
    chunks_to_insert = []
    processed_hashes = set()
    skipped_duplicates = 0
    document_id = None # Para trackear si ya registramos el documento


    # Usar supabase_admin para escrituras si está disponible, sino fallback a usuario normal
    # (aunque fallará por RLS si no es admin, esto es mejor que nada)
    db_client = supabase_admin if supabase_admin else supabase

    # 1. Subir al bucket primero
    file_url = ""
    file_size = 0
    with console.status("[bold green]Subiendo archivo a Storage...[/bold green]"):
        try:
            file_url, file_size = upload_file_to_storage(pdf_path, db_client)
        except Exception:
            pass # Ya manejado dentro, retorna vacío

    # Si falló la subida (URL vacía), pedir link de respaldo
    if not file_url:
        console.print("[yellow]⚠️ La subida al almacenamiento falló (probablemente por tamaño).[/yellow]")
        external_link = Prompt.ask("[cyan]¿Deseas ingresar un link de Google Drive/Externo para este archivo? (Enter para omitir)[/cyan]")
        if external_link:
            file_url = external_link.strip()
            # Estimamos size si no se pudo leer antes
            if file_size == 0 and os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:
        
        task = progress.add_task(f"Procesando {total_pages} páginas...", total=total_pages)
        
        for page_data in read_pdf_pages(pdf_path):
            page_num = page_data["page_num"]
            page_text = page_data["text"]
            
            for chunk in create_chunks(page_text, page_num):
                # Deduplicación local
                if chunk["hash"] in processed_hashes:
                    skipped_duplicates += 1
                    continue
                
                processed_hashes.add(chunk["hash"])
                
                # Generar embedding
                try:
                    embedding = generate_embedding(chunk["text"], gemini_client)
                except Exception as e:
                    console.print(f"[yellow]⚠️ Error en embedding (página {page_num}): {e}[/yellow]")
                    continue
                
                chunks_to_insert.append({
                    "content": chunk["text"],
                    "embedding": embedding,
                    "metadata": {
                        "source": pdf_name,
                        "page": chunk["page"],
                        "chunk_index": chunk["chunk_index"],
                        "hash": chunk["hash"],
                        "course_id": course_id,
                        "material_id": material_id,
                        "uploaded_by": user_id
                    }
                })
                
                # Insertar en processed_documents primero si aún no se ha hecho
                if document_id is None:
                     # Crear registro en processed_documents
                    try:
                        doc_data = {
                            "institution_id": 1, # Default si no encontramos match
                            "title": pdf_name,
                            "file_type": "application/pdf",
                            "file_url": file_url, # URL del bucket
                            "file_size_bytes": file_size,
                            "total_chunks": total_pages, # Inicial
                            "processing_status": "processing",
                            "processed_by": user_id
                        }
                        # Si tenemos course_id, intentamos buscar la institución del curso
                        if course_id:
                             try:
                                 # Para lectura usamos cliente normal (o admin, da igual)
                                 course_res = supabase.table("courses").select("institution_id").eq("id", course_id).single().execute()
                                 if course_res.data:
                                     doc_data["institution_id"] = course_res.data["institution_id"]
                             except Exception:
                                 pass

                        # USAR CLIENTE ADMIN PARA INSERT (con retry)
                        def _insert_doc():
                            return db_client.table("processed_documents").insert(doc_data).execute()
                        
                        doc_res = retry_operation(_insert_doc)
                        
                        if doc_res.data:
                            document_id = doc_res.data[0]["id"]
                            console.print(f"[green]✓ Documento registrado: {document_id}[/green]")
                            
                            # Crear asignación al curso (USAR CLIENTE ADMIN)
                            if course_id:
                                try:
                                    def _insert_assignment():
                                        db_client.table("document_course_assignments").insert({
                                            "document_id": document_id,
                                            "course_id": course_id,
                                            "assigned_by": user_id
                                        }).execute()
                                    retry_operation(_insert_assignment)
                                except Exception as e:
                                    console.print(f"[yellow]⚠️ No se pudo asignar al curso: {e}[/yellow]")
                    except Exception as e:
                        console.print(f"[red]❌ Error creando registro de documento (continuando sin registrar): {e}[/red]")
                        # No retornamos, permitimos que intente insertar chunks si es posible (aunque fallará si requiere FK)

                # Insertar en batches en course_content_chunks (USAR CLIENTE ADMIN)
                if len(chunks_to_insert) >= BATCH_SIZE:
                    db_chunks = []
                    for c in chunks_to_insert:
                         db_chunks.append({
                            "course_id": course_id,
                            "content": c["content"],
                            "embedding": c["embedding"],
                            "chunk_index": c["metadata"]["chunk_index"],
                            "metadata": c["metadata"]
                         })
                    
                    try:
                        def _insert_batch():
                            db_client.table("course_content_chunks").insert(db_chunks).execute()
                        retry_operation(_insert_batch)
                        chunks_to_insert = []
                    except Exception as e:
                        console.print(f"[red]❌ Error insertando batch: {e}[/red]")
            
            # Rate limiting manual para no saturar APIs
            time.sleep(1.0)
            progress.update(task, advance=1)
        
        # Insertar chunks restantes
        if chunks_to_insert:
            db_chunks = []
            for c in chunks_to_insert:
                    db_chunks.append({
                    "course_id": course_id,
                    "content": c["content"],
                    "embedding": c["embedding"],
                    "chunk_index": c["metadata"]["chunk_index"],
                    "metadata": c["metadata"]
                    })
            try:
                def _insert_rest():
                    db_client.table("course_content_chunks").insert(db_chunks).execute()
                retry_operation(_insert_rest)
            except Exception as e:
                console.print(f"[red]❌ Error insertando últimos chunks: {e}[/red]")
    
    # Actualizar estado a completed (USAR CLIENTE ADMIN)
    if document_id:
         try:
             db_client.table("processed_documents").update({
                 "processing_status": "completed", 
                 "total_chunks": len(processed_hashes)
             }).eq("id", document_id).execute()
         except Exception as e:
             console.print(f"[yellow]⚠️ Error actualizando estado final: {e}[/yellow]")

# ============================================
# CLI PRINCIPAL (Modo Interactivo)
# ============================================

def show_banner():
    """Muestra el banner de bienvenida."""
    console.print(Panel.fit(
        "[bold cyan]📚 EduSpark Desktop Uploader[/bold cyan]\n"
        "[dim]Herramienta para procesar libros y documentos grandes[/dim]",
        border_style="cyan"
    ))

def interactive_mode(supabase: Client, session: Dict[str, str], gemini_client: genai.Client):
    """Modo interactivo con menú visual."""
    while True:
        console.print()
        table = Table(title="Menú Principal", show_header=False, box=None)
        table.add_row("[1]", "📄 Procesar PDF desde mi PC")
        table.add_row("[2]", "📂 Procesar carpeta completa")
        table.add_row("[3]", "☁️ Procesar desde Google Drive")
        table.add_row("[4]", "🔗 Procesar desde URL directa")
        table.add_row("[5]", "👤 Cambiar usuario")
        table.add_row("[6]", "❌ Salir")
        console.print(table)
        
        choice = Prompt.ask("Selecciona una opción", choices=["1", "2", "3", "4", "5", "6"], default="1")
        
        if choice == "1":
            pdf_path = Prompt.ask("Ruta del PDF (puedes arrastrar el archivo aquí)")
            # Limpiar comillas si arrastra el archivo
            pdf_path = pdf_path.strip().strip('"').strip("'")
            
            if not Path(pdf_path).exists():
                console.print(f"[red]❌ Archivo no encontrado: {pdf_path}[/red]")
                continue
            
            course_id = select_course(supabase)

            ingest_pdf(
                pdf_path=pdf_path,
                supabase=supabase,
                user_id=session["user_id"],
                gemini_client=gemini_client,
                course_id=course_id
            )
            
        elif choice == "2":
            folder_path = Prompt.ask("Ruta de la carpeta")
            folder_path = folder_path.strip().strip('"').strip("'")
            
            if not Path(folder_path).is_dir():
                console.print(f"[red]❌ Carpeta no encontrada: {folder_path}[/red]")
                continue
            
            pdfs = list(Path(folder_path).glob("*.pdf"))
            if not pdfs:
                console.print("[yellow]⚠️ No se encontraron PDFs en la carpeta[/yellow]")
                continue
            
            console.print(f"[blue]📂 Encontrados {len(pdfs)} archivos PDF[/blue]")
            
            course_id = select_course(supabase)

            if Confirm.ask("¿Procesar todos?"):
                for pdf in pdfs:
                    ingest_pdf(
                        pdf_path=str(pdf),
                        supabase=supabase,
                        user_id=session["user_id"],
                        gemini_client=gemini_client,
                        course_id=course_id
                    )
        
        elif choice == "3":
            # Google Drive
            console.print(Panel(
                "[bold]☁️ Procesar desde Google Drive[/bold]\n\n"
                "Pega el link del archivo. Formatos soportados:\n"
                "• https://drive.google.com/file/d/XXXX/view\n"
                "• https://drive.google.com/open?id=XXXX",
                border_style="blue"
            ))
            
            url = Prompt.ask("Link de Google Drive")
            file_id = extract_google_drive_id(url)
            
            if not file_id:
                console.print("[red]❌ No se pudo extraer el ID del archivo. Verifica el link.[/red]")
                continue
            
            # Descargar a carpeta temporal
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, "documento.pdf")
            
            if download_from_google_drive(file_id, temp_path):
                course_id = select_course(supabase)
                ingest_pdf(
                    pdf_path=temp_path,
                    supabase=supabase,
                    user_id=session["user_id"],
                    gemini_client=gemini_client,
                    course_id=course_id
                )
                # Limpiar archivo temporal
                try:
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                except:
                    pass
        
        elif choice == "4":
            # URL directa
            console.print(Panel(
                "[bold]🔗 Procesar desde URL directa[/bold]\n\n"
                "Pega un link directo a un archivo PDF.\n"
                "El link debe terminar en .pdf o ser una descarga directa.",
                border_style="blue"
            ))
            
            url = Prompt.ask("URL del PDF")
            
            # Extraer nombre del archivo de la URL
            parsed = urlparse(url)
            filename = Path(parsed.path).name or "documento.pdf"
            if not filename.endswith(".pdf"):
                filename = "documento.pdf"
            
            # Descargar a carpeta temporal
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, filename)
            
            if download_from_url(url, temp_path):
                course_id = select_course(supabase)
                ingest_pdf(
                    pdf_path=temp_path,
                    supabase=supabase,
                    user_id=session["user_id"],
                    gemini_client=gemini_client,
                    course_id=course_id
                )
                # Limpiar archivo temporal
                try:
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                except:
                    pass
                    
        elif choice == "5":
            login(supabase)
            session = load_session()
            
        elif choice == "6":
            console.print("[green]👋 ¡Hasta pronto![/green]")
            break

def main():
    # Configurar clientes con credenciales embebidas
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    
    show_banner()
    
    # Parsear argumentos (por si lo usan desde línea de comandos)
    parser = argparse.ArgumentParser(description="EduSpark Desktop Uploader")
    parser.add_argument("pdf", nargs="?", help="Ruta al archivo PDF (opcional)")
    args = parser.parse_args()
    
    # Verificar sesión
    session = load_session()
    if not session:
        console.print("[yellow]⚠️ No hay sesión activa. Por favor, inicia sesión.[/yellow]")
        login(supabase)
        session = load_session()
        if not session:
            console.print("[red]❌ No se pudo iniciar sesión[/red]")
            sys.exit(1)
    
    console.print(f"[green]✓ Sesión activa: {session['email']} ({session['role']})[/green]")
    
    # Si pasaron un PDF por argumento, procesarlo directamente
    if args.pdf:
        if not Path(args.pdf).exists():
            console.print(f"[red]❌ Archivo no encontrado: {args.pdf}[/red]")
            sys.exit(1)
        
        course_id = select_course(supabase)

        ingest_pdf(
            pdf_path=args.pdf,
            supabase=supabase,
            user_id=session["user_id"],
            gemini_client=gemini_client,
            course_id=course_id
        )
    else:
        # Modo interactivo
        interactive_mode(supabase, session, gemini_client)

if __name__ == "__main__":
    main()

