# GitHub Actions Workflow Update Guide

## Overview
This guide shows how to update `.github/workflows/release.yml` to use the new `verba.spec` file that properly includes ONNX model assets.

## Changes Required

### 1. Windows Build (Lines 50-65)
**Current:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    pyinstaller --onefile --windowed `
      --add-data "../frontend/dist;frontend/dist" `
      --hidden-import=uvicorn.logging `
      --hidden-import=uvicorn.loops `
      --hidden-import=uvicorn.loops.auto `
      --hidden-import=uvicorn.protocols `
      --hidden-import=uvicorn.protocols.http `
      --hidden-import=uvicorn.protocols.http.auto `
      --hidden-import=uvicorn.protocols.websockets `
      --hidden-import=uvicorn.protocols.websockets.auto `
      --hidden-import=uvicorn.lifespan `
      --hidden-import=uvicorn.lifespan.on `
      app.py
```

**New:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    # Modify spec file for windowed mode on Windows
    (Get-Content verba.spec) -replace 'console=True', 'console=False' | Set-Content verba.spec
    pyinstaller verba.spec
```

### 2. Linux Build (Lines 161-176)
**Current:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    pyinstaller --onefile \
      --add-data "../frontend/dist:frontend/dist" \
      --hidden-import=uvicorn.logging \
      --hidden-import=uvicorn.loops \
      --hidden-import=uvicorn.loops.auto \
      --hidden-import=uvicorn.protocols \
      --hidden-import=uvicorn.protocols.http \
      --hidden-import=uvicorn.protocols.http.auto \
      --hidden-import=uvicorn.protocols.websockets \
      --hidden-import=uvicorn.protocols.websockets.auto \
      --hidden-import=uvicorn.lifespan \
      --hidden-import=uvicorn.lifespan.on \
      app.py
```

**New:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    pyinstaller verba.spec
```

### 3. macOS Build (Lines 306-321)
**Current:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    pyinstaller --onefile --windowed \
      --add-data "../frontend/dist:frontend/dist" \
      --hidden-import=uvicorn.logging \
      --hidden-import=uvicorn.loops \
      --hidden-import=uvicorn.loops.auto \
      --hidden-import=uvicorn.protocols \
      --hidden-import=uvicorn.protocols.http \
      --hidden-import=uvicorn.protocols.http.auto \
      --hidden-import=uvicorn.protocols.websockets \
      --hidden-import=uvicorn.protocols.websockets.auto \
      --hidden-import=uvicorn.lifespan \
      --hidden-import=uvicorn.lifespan.on \
      app.py
```

**New:**
```yaml
- name: Bundle backend with PyInstaller
  run: |
    cd backend
    # Modify spec file for windowed mode on macOS
    sed -i '' 's/console=True/console=False/' verba.spec
    pyinstaller verba.spec
```

## Why This Works

### 1. Centralized Configuration
All build settings are now in one place (`verba.spec`) instead of duplicated across three platform builds.

### 2. Automatic Asset Collection
The spec file uses `collect_data_files('faster_whisper')` which automatically:
- Finds all data files in the package
- Includes ONNX models from `faster_whisper/assets/`
- Preserves directory structure
- Works across all platforms

### 3. Easier Maintenance
Adding new dependencies or data files only requires updating `verba.spec` once, not in three separate places.

## Verification Steps

### Before Deploying
1. Test locally on each platform:
   ```bash
   cd backend
   pyinstaller verba.spec
   ./dist/app  # Test the bundle
   ```

2. Verify ONNX files are included:
   ```bash
   # While app is running, check extraction directory
   # Linux/macOS: /tmp/_MEI*/faster_whisper/assets/
   # Windows: %TEMP%\_MEI*\faster_whisper\assets\
   ```

### After CI Build
1. Download artifacts from GitHub Actions
2. Extract and run each installer
3. Test transcription feature
4. Check for ONNX-related errors in logs

## Full Workflow File
The complete updated workflow file is available at:
`.github/workflows/release.yml` (after applying changes)

## Rollback Plan
If the new spec file causes issues:
1. Revert to old workflow (git revert)
2. Add manual ONNX file copying as a temporary fix:
   ```yaml
   - name: Copy ONNX files manually
     run: |
       python -c "import faster_whisper, os, shutil; src=os.path.join(os.path.dirname(faster_whisper.__file__), 'assets'); os.makedirs('backend/dist/faster_whisper/assets', exist_ok=True); [shutil.copy(os.path.join(src, f), 'backend/dist/faster_whisper/assets/') for f in os.listdir(src) if f.endswith('.onnx')]"
   ```

## Additional Improvements

### 1. Cache Dependencies
Add caching to speed up builds:

```yaml
- name: Cache Python dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

### 2. Verify Bundle Contents
Add a verification step after building:

```yaml
- name: Verify ONNX files in bundle
  run: |
    cd backend
    python -c "
    import zipfile
    import sys
    with zipfile.PyZipFile('dist/app', 'r') as zf:
        files = zf.namelist()
        onnx_files = [f for f in files if 'faster_whisper/assets' in f and f.endswith('.onnx')]
        print(f'Found {len(onnx_files)} ONNX files:')
        for f in onnx_files:
            print(f'  - {f}')
        if len(onnx_files) < 2:
            print('ERROR: Missing ONNX files!')
            sys.exit(1)
    "
```

Note: This verification step may not work for all PyInstaller bundle formats. It's primarily for debugging.

## Platform-Specific Notes

### Windows
- Uses PowerShell to modify `console=True` to `console=False` for windowed mode
- No console window appears when launched

### Linux
- Console mode is fine (users expect terminal output)
- Could optionally wrap in a desktop launcher that hides terminal

### macOS
- Uses `sed` to modify `console=True` to `console=False`
- Essential for proper .app bundle behavior

## Testing Checklist
Before merging the workflow update:

- [ ] Test local build on Linux with `verba.spec`
- [ ] Test local build on Windows with `verba.spec`
- [ ] Test local build on macOS with `verba.spec`
- [ ] Verify ONNX files present in each bundle
- [ ] Test transcription feature in each bundle
- [ ] Update workflow file with new commands
- [ ] Create test tag to trigger build (e.g., `v1.0.1-test`)
- [ ] Download and test all three installers
- [ ] Delete test tag and release if successful
- [ ] Create production release tag
