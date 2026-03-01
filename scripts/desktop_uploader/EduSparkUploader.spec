# -*- mode: python ; coding: utf-8 -*-
# EduSpark Desktop Uploader - PyInstaller Spec

from PyInstaller.utils.hooks import collect_submodules

# Recopilar TODOS los submódulos de rich._unicode_data
# Rich los carga dinámicamente con importlib.import_module(),
# por lo que PyInstaller no los detecta automáticamente.
rich_unicode_imports = collect_submodules('rich._unicode_data')

a = Analysis(
    ['ingest.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'supabase',
        'google.genai',
        'pypdf',
        'rich',
        'rich.console',
        'rich.panel',
        'rich.table',
        'rich.progress',
        'rich.prompt',
        'tqdm',
    ] + rich_unicode_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='EduSparkUploader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Agregar icono: icon='eduspark.ico'
)
