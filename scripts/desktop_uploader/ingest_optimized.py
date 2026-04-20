#!/usr/bin/env python3
"""
EduSpark Desktop Uploader - VERSIÓN OPTIMIZADA (FAST INGEST)
Procesamiento por batches y eliminación de esperas innecesarias.
"""

import os
import sys
import json
import time
import hashlib
import concurrent.futures
from pathlib import Path
from typing import List, Dict, Any, Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from supabase import create_client, Client
from pypdf import PdfReader
from google import genai
from google.genai import types
from dotenv import load_dotenv

console = Console()
load_dotenv()

# --- CONFIGURACIÓN OPTIMIZADA ---
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 50  # Aumentado de 2 a 50 para eficiencia en DB
THREADS = 4      # Para paralelizar subida/embedding si fuera necesario
# -------------------------------

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mckfscukxcqwntpjagar.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8")
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY", "AIzaSyAusGEsO9EtJjOUuHJwIdnFDBG599BHD-4")

def retry_operation(func, max_retries=5, delay=1):
    for i in range(max_retries):
        try:
            return func()
        except Exception as e:
            if i == max_retries - 1: raise e
            time.sleep(delay * (2 ** i))

def generate_embeddings_batch(texts: List[str], client: genai.Client) -> List[list]:
    """Genera embeddings en batch usando Gemini (Mucho más rápido que uno por uno)."""
    if not texts: return []
    try:
        def _call():
            result = client.models.embed_content(
                model="models/text-embedding-004",
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=768),
            )
            return [emb.values for emb in result.embeddings]
        return retry_operation(_call)
    except Exception as e:
        console.print(f"[red]❌ Error en batch embedding: {e}[/red]")
        # Fallback a uno por uno si el batch falla
        return []

def ingest_pdf_optimized(pdf_path, course_id, user_id):
    pdf_name = Path(pdf_path).name
    console.print(f"[bold cyan]🚀 Iniciando Ingesta Optimizada: {pdf_name}[/bold cyan]")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    gemini = genai.Client(api_key=GEMINI_API_KEY)
    
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    
    chunks_buffer = []
    processed_hashes = set()
    total_inserted = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:
        task = progress.add_task(f"Procesando...", total=total_pages)
        
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            
            # Crear chunks locales
            page_chunks = []
            start = 0
            while start < len(text):
                chunk_text = text[start:start+CHUNK_SIZE]
                chunk_hash = hashlib.md5(chunk_text.encode()).hexdigest()
                
                if chunk_hash not in processed_hashes:
                    processed_hashes.add(chunk_hash)
                    page_chunks.append({
                        "content": chunk_text,
                        "hash": chunk_hash,
                        "page": page_num
                    })
                start += CHUNK_SIZE - CHUNK_OVERLAP

            if not page_chunks:
                progress.update(task, advance=1)
                continue

            # 1. BATCH EMBEDDING para toda la página
            texts_to_embed = [c["content"] for c in page_chunks]
            embeddings = generate_embeddings_batch(texts_to_embed, gemini)
            
            if len(embeddings) == len(page_chunks):
                for i, chunk in enumerate(page_chunks):
                    chunks_buffer.append({
                        "course_id": course_id,
                        "content": chunk["content"],
                        "embedding": embeddings[i],
                        "chunk_index": i,
                        "metadata": {
                            "sourceFileName": pdf_name,
                            "page_start": chunk["page"],
                            "hash": chunk["hash"],
                            "uploaded_by": user_id
                        }
                    })
            
            # 2. BATCH INSERT en Supabase
            if len(chunks_buffer) >= BATCH_SIZE:
                try:
                    retry_operation(lambda: supabase.table("course_content_chunks").insert(chunks_buffer).execute())
                    total_inserted += len(chunks_buffer)
                    chunks_buffer = []
                except Exception as e:
                    console.print(f"[red]❌ Error insertando batch: {e}[/red]")

            progress.update(task, advance=1, description=f"Página {page_num}/{total_pages} | Chunks: {total_inserted}")
            # Ya no hay time.sleep!

        # Insertar remanentes
        if chunks_buffer:
            supabase.table("course_content_chunks").insert(chunks_buffer).execute()
            total_inserted += len(chunks_buffer)

    console.print(f"[bold green]✅ ¡Completado! Total chunks: {total_inserted}[/bold green]")

if __name__ == "__main__":
    # Test rápido si se ejecuta directamente
    if len(sys.argv) > 1:
        ingest_pdf_optimized(sys.argv[1], course_id=12, user_id="502233ed-a7cd-4362-82ce-94ac80e785dd")
