# -*- mode: python ; coding: utf-8 -*-
# EduSpark Desktop Uploader GUI - PyInstaller Spec

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

# Recopilar submódulos de rich y customtkinter
rich_unicode_imports = collect_submodules('rich._unicode_data')
ctk_data = collect_data_files('customtkinter')

a = Analysis(
    ['ingest_gui.py'],
    pathex=[],
    binaries=[],
    datas=ctk_data,
    hiddenimports=[
        'supabase',
        'google.genai',
        'pypdf',
        'customtkinter',
        'darkdetect',
        'rich',
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
    name='EduSparkUploaderGUI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Sin consola! Es una app gráfica
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Agregar icono: icon='eduspark.ico'
)
