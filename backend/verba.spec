# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Verba application
Properly includes faster-whisper ONNX model assets and all dependencies
"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files

# Determine the base directory
block_cipher = None
base_path = os.path.abspath(os.path.join(SPECPATH, '..'))

# Collect faster-whisper data files (ONNX models)
# This ensures silero_encoder_v5.onnx, silero_decoder_v5.onnx are included
faster_whisper_datas = collect_data_files('faster_whisper', include_py_files=False)

# Add frontend build files
frontend_dist = os.path.join(base_path, 'frontend', 'dist')
datas = [
    (frontend_dist, 'frontend/dist'),
]

# Add faster-whisper ONNX models
datas += faster_whisper_datas

# Hidden imports for uvicorn and other dependencies
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    # faster-whisper dependencies
    'faster_whisper',
    'ctranslate2',
    'onnxruntime',
    # Audio processing
    'pydub',
    'av',
]

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False for --windowed on Windows
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
