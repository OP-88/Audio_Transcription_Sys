# PyInstaller Packaging Guide for Verba

## Problem
The bundled application was failing with `[ONNXRuntimeError] NO_SUCHFILE` because PyInstaller didn't automatically include the ONNX model files from the `faster-whisper` package.

## Solution
Use the dedicated `verba.spec` file which properly includes all necessary assets.

## Files Included
The spec file ensures these critical assets are bundled:

### faster-whisper ONNX Models
Located in `faster_whisper/assets/`:
- `silero_encoder_v5.onnx` - Voice Activity Detection (VAD) encoder
- `silero_decoder_v5.onnx` - Voice Activity Detection (VAD) decoder

These files are required for the VAD (Voice Activity Detection) feature when transcribing audio with the `vad_filter=True` option.

## Building with the Spec File

### Local Build (Testing)
From the `backend` directory:

```bash
# Install PyInstaller if not already installed
pip install pyinstaller

# Build using the spec file
pyinstaller verba.spec
```

The executable will be created at `backend/dist/app` (or `app.exe` on Windows).

### Production Build (Cross-Platform)
The spec file is designed to work across platforms but needs platform-specific adjustments:

#### Linux
```bash
cd backend
pyinstaller verba.spec
```

#### Windows
```bash
cd backend
pyinstaller verba.spec
```

Note: On Windows, you may want to set `console=False` in the spec file for a windowed application.

#### macOS
```bash
cd backend
pyinstaller verba.spec --windowed
```

## Verifying the Bundle

### 1. Check ONNX Files Are Included
After building, you can verify the ONNX files are included:

**On Linux/macOS:**
```bash
# Extract and check (PyInstaller creates a self-extracting archive)
./dist/app &  # Run in background
# Check the temporary extraction folder
ls -la /tmp/_MEI*/faster_whisper/assets/
```

**On Windows:**
```powershell
# Run the app and check the extraction folder
# PyInstaller extracts to %TEMP%\_MEI*\faster_whisper\assets\
```

### 2. Test Transcription
Run the application and test the transcription feature to ensure no ONNX-related errors occur.

## Technical Details

### How collect_data_files Works
The spec file uses PyInstaller's `collect_data_files` utility:

```python
from PyInstaller.utils.hooks import collect_data_files
faster_whisper_datas = collect_data_files('faster_whisper', include_py_files=False)
```

This automatically:
1. Finds the `faster_whisper` package in your Python environment
2. Collects all non-Python data files (including `.onnx` files)
3. Preserves the directory structure (`faster_whisper/assets/`)
4. Includes them in the bundle

### Alternative Methods (Not Recommended)
You could manually specify the files, but this is fragile:

```python
# Don't use this approach - it breaks if package structure changes
datas = [
    ('path/to/faster_whisper/assets/*.onnx', 'faster_whisper/assets'),
]
```

The `collect_data_files` approach is more robust and future-proof.

## Troubleshooting

### Error: faster_whisper module not found during build
**Solution:** Ensure `faster-whisper` is installed in the build environment:
```bash
pip install faster-whisper==1.1.0
```

### Error: ONNX files still missing
**Solution:** Verify the package data files exist:
```bash
python -c "import faster_whisper; import os; print(os.path.join(os.path.dirname(faster_whisper.__file__), 'assets'))"
ls -la $(python -c "import faster_whisper; import os; print(os.path.join(os.path.dirname(faster_whisper.__file__), 'assets'))")
```

You should see:
- `silero_encoder_v5.onnx`
- `silero_decoder_v5.onnx`

If these files are missing, reinstall faster-whisper:
```bash
pip uninstall faster-whisper
pip install faster-whisper==1.1.0
```

### Error: _MEIPASS not found
**Solution:** This typically means the app is being run incorrectly. Ensure you're running the bundled executable, not the Python script directly.

### Large Bundle Size
The ONNX files add ~1.2 MB to the bundle. This is expected and necessary for VAD functionality.

If you want to reduce bundle size and don't need VAD:
1. In `transcriber.py`, set `vad_filter=False`
2. The ONNX files won't be loaded at runtime (but will still be included in the bundle)

## CI/CD Integration
See `GITHUB_ACTIONS_UPDATE.md` for instructions on updating the GitHub Actions workflow to use this spec file.
