# EduSpark Desktop Uploader

Herramienta para procesar libros y documentos grandes (>10MB) en EduSpark.

## 🎯 Para Docentes

### Instalación
1. Descargar `EduSparkUploader.exe`
2. Doble clic para ejecutar
3. Iniciar sesión con tu cuenta de EduSpark

### Uso
1. Ejecutar el programa
2. Seleccionar opción 1 (Procesar un PDF)
3. Arrastrar el archivo PDF a la ventana
4. Esperar a que termine el procesamiento

¡Eso es todo! El documento estará disponible para consultas en el Tutor IA.

---

## 🛠 Para Desarrolladores

### Generar el ejecutable

```bash
cd scripts/desktop_uploader
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pyinstaller EduSparkUploader.spec
```

El ejecutable se genera en `dist/EduSparkUploader.exe`.

### Probar sin empaquetar

```bash
python ingest.py
```

