use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Start Python backend
      // Use resource_dir() for correct path resolution in production
      // Tauri v1: path_resolver() returns PathBuf directly (not Result) for resource_dir
      let resource_path = app.path_resolver()
          .resource_dir()
          .unwrap_or_else(|| app.path_resolver().app_data_dir().unwrap());
      
      let backend_child = start_backend(resource_path);
      app.manage(BackendProcess(Mutex::new(backend_child)));

      // Automatically setup system audio on Linux
      #[cfg(target_os = "linux")]
      {
        setup_system_audio();
      }

      // Configure webkit to allow microphone access on Linux
      #[cfg(target_os = "linux")]
      {
        if let Some(window) = app.get_window("main") {
          let _ = window.with_webview(move |webview| {
            #[cfg(target_os = "linux")]
            {
              use webkit2gtk::WebViewExt;
              use webkit2gtk::PermissionRequestExt;
              unsafe {
                let wv = &webview.inner().clone();
                wv.connect_permission_request(move |_, request| {
                  request.allow();
                  true
                });
              }
            }
          });
        }
      }

      Ok(())
    })
    .on_window_event(|event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
        // Stop backend when window closes
        if let Some(backend) = event.window().state::<BackendProcess>().0.lock().unwrap().as_mut() {
          let _ = backend.kill();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn start_backend(app_dir: std::path::PathBuf) -> Option<Child> {
  // Find backend directory using resource_dir logic
  // On macOS/Linux, resources are inside the bundle
  // On Windows, they are in the installation directory
  let mut backend_dir = app_dir.join("backend");
  
  // Try to find the backend in the resource directory if available
  // This is the correct way to find bundled resources in Tauri v2
  if !backend_dir.exists() {
      // In development, it might be relative to the crate
      if let Ok(cwd) = std::env::current_dir() {
          let dev_path = cwd.join("../../backend");
          if dev_path.exists() {
              backend_dir = dev_path;
          }
      }
  }

  // On Linux, try system install path if not found
  #[cfg(target_os = "linux")]
  if !backend_dir.exists() {
    backend_dir = std::path::PathBuf::from("/usr/lib/Verba/backend");
  }
  
  let app_py = backend_dir.join("app.py");

  eprintln!("Starting backend from: {:?}", backend_dir);
  eprintln!("App.py path: {:?}", app_py);

  // On Windows and macOS, use bundled venv
  // On Linux, use system Python (installed via package manager)
  #[cfg(target_os = "windows")]
  let python_cmd = {
    let venv_python = backend_dir.join("venv").join("Scripts").join("python.exe");
    if venv_python.exists() {
      eprintln!("Using bundled venv: {:?}", venv_python);
      venv_python.to_str().unwrap().to_string()
    } else {
      eprintln!("WARNING: Bundled venv not found, trying system Python");
      "python".to_string()
    }
  };

  #[cfg(target_os = "macos")]
  let python_cmd = {
    let venv_python = backend_dir.join("venv").join("bin").join("python3");
    if venv_python.exists() {
      eprintln!("Using bundled venv: {:?}", venv_python);
      venv_python.to_str().unwrap().to_string()
    } else {
      eprintln!("WARNING: Bundled venv not found, trying system Python");
      "python3".to_string()
    }
  };

  #[cfg(target_os = "linux")]
  let python_cmd = {
    eprintln!("Using system Python on Linux");
    "python3".to_string()
  };

  eprintln!("Python command: {}", python_cmd);

  match Command::new(&python_cmd)
    .arg(&app_py)
    .current_dir(&backend_dir)
    .stdout(std::process::Stdio::inherit())
    .stderr(std::process::Stdio::inherit())
    .spawn() {
      Ok(child) => Some(child),
      Err(e) => {
        eprintln!("CRITICAL ERROR: Failed to start backend server: {}", e);
        None
      }
    }
}

#[cfg(target_os = "linux")]
fn setup_system_audio() {
  eprintln!("🎵 Setting up system audio...");
  
  // Check if PulseAudio sink already exists
  let check = Command::new("pactl")
    .args(&["list", "sinks", "short"])
    .output();
    
  if let Ok(output) = check {
    let output_str = String::from_utf8_lossy(&output.stdout);
    if output_str.contains("Verba_Combined_Audio") {
      eprintln!("✅ System audio already configured");
      return;
    }
  }
  
  // Create virtual sink for combined audio
  let _ = Command::new("pactl")
    .args(&[
      "load-module",
      "module-null-sink",
      "sink_name=Verba_Combined_Audio",
      "sink_properties=device.description=Verba_Combined_Audio"
    ])
    .output();
    
  // Get default sink
  let default_sink_output = Command::new("pactl")
    .args(&["get-default-sink"])
    .output();
    
  if let Ok(output) = default_sink_output {
    let default_sink = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    // Create loopback from system audio to combined sink (for recording)
    let _ = Command::new("pactl")
      .args(&[
        "load-module",
        "module-loopback",
        &format!("source={}.monitor", default_sink),
        "sink=Verba_Combined_Audio",
        "latency_msec=20"
      ])
      .output();
      
    // Create loopback from microphone to combined sink (for recording)
    let _ = Command::new("pactl")
      .args(&[
        "load-module",
        "module-loopback",
        "source=@DEFAULT_SOURCE@",
        "sink=Verba_Combined_Audio",
        "latency_msec=20"
      ])
      .output();
      
    // IMPORTANT: Create loopback from combined sink back to speakers
    // This allows you to HEAR the audio while it's being recorded
    let _ = Command::new("pactl")
      .args(&[
        "load-module",
        "module-loopback",
        "source=Verba_Combined_Audio.monitor",
        &format!("sink={}", default_sink),
        "latency_msec=20"
      ])
      .output();
      
    eprintln!("✅ System audio configured successfully (with monitoring)");
  }
}
