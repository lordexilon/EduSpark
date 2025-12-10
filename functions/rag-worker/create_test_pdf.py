#!/usr/bin/env python3
"""
Crea un PDF sintético de ~60 MB con 5 páginas para probar división con qpdf
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import io

def create_test_pdf():
    filename = "test_harrison_60mb.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Crear imagen grande para inflar tamaño (1MB por imagen)
    img = Image.new('RGB', (2000, 2000), color='white')
    pixels = img.load()
    
    # Patrón para la imagen
    for i in range(2000):
        for j in range(2000):
            pixels[i, j] = ((i * j) % 255, (i + j) % 255, (i - j) % 255)
    
    # Buffer para la imagen
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG', compress_level=0)  # Sin compresión para mayor tamaño
    img_buffer.seek(0)
    
    print(f"Creando PDF de prueba: {filename}")
    print("Esto puede tomar ~2 minutos...")
    
    for page_num in range(1, 6):  # 5 páginas
        print(f"  Página {page_num}/5...")
        
        # Título
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, height - 50, f"Página de Prueba {page_num}")
        
        # Mucho texto
        c.setFont("Helvetica", 10)
        y = height - 100
        for line in range(50):
            text = f"Línea {line + 1}: " + ("Texto de prueba repetido. " * 20)
            c.drawString(50, y, text[:100])  # Truncar para caber
            y -= 12
            if y < 100:
                break
        
        # Agregar ~12 imágenes por página para llegar a 60MB total
        for img_num in range(12):
            img_buffer.seek(0)
            img_reader = ImageReader(img_buffer)
            
            x = 50 + (img_num  % 3) * 150
            y_img = 500 - (img_num // 3) * 150
            
            # Imagen pequeña en pantalla pero grande en bytes
            c.drawImage(img_reader, x, y_img, width=100, height=100, preserveAspectRatio=True)
        
        c.showPage()
    
    c.save()
    
    # Verificar tamaño
    import os
    size_mb = os.path.getsize(filename) / (1024 * 1024)
    print(f"\n✅ PDF creado: {filename}")
    print(f"📊 Tamaño: {size_mb:.2f} MB")
    print(f"📄 Páginas: 5")
    
    if size_mb > 50:
        print(f"✅ Tamaño suficiente para forzar división con qpdf (>50 MB)")
    else:
        print(f"⚠️ Tamaño insuficiente ({size_mb:.2f} MB), intenta agregar más imágenes")

if __name__ == "__main__":
    create_test_pdf()
