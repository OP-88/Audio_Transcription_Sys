/**
 * Recorder component - handles audio recording and transcription
 */
import { useState, useRef } from 'react'
import { transcribeAudio } from '../api'

function Recorder({ onTranscriptComplete, onTranscribing, onError }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSourceDialog, setShowSourceDialog] = useState(false)
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedSource, setSelectedSource] = useState(null) // Track selected device
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = async (deviceId = null) => {
    try {
      // Build constraints - use exact only for non-default devices
      let constraints
      if (deviceId && deviceId !== 'default') {
        constraints = {
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000
          }
        }
      } else {
        constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Use better options for MediaRecorder to ensure quality
      let options = { mimeType: 'audio/webm' }
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk received:', event.data.size, 'bytes')
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped. Total chunks:', chunksRef.current.length)
        const audioBlob = new Blob(chunksRef.current, { type: options.mimeType })
        console.log('Final audio blob size:', audioBlob.size, 'bytes')

        if (audioBlob.size < 1000) {
          onError('Recording too short. Please record for at least 2-3 seconds.', 'warning')
          setIsRecording(false)
          stream.getTracks().forEach(track => track.stop())
          return
        }

        await handleTranscribe(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      // Start recording with timeslice to collect data in chunks every 100ms
      mediaRecorder.start(100)
      setIsRecording(true)
      console.log('Recording started with device:', deviceId || 'default')
    } catch (error) {
      console.error('Error starting recording:', error)
      onError('Failed to access microphone: ' + error.message)
    }
  }

  const startScreenRecording = async () => {
    try {
      // Use getDisplayMedia to capture screen/window/tab with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // Required for getDisplayMedia
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      })

      // Extract only the audio track (we don't need video)
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        onError('No audio track selected. Make sure to enable "Share audio" when sharing.', 'warning')
        return
      }

      // Create a new stream with only audio
      const audioStream = new MediaStream(audioTracks)

      // Stop video track (we don't need it)
      stream.getVideoTracks().forEach(track => track.stop())

      // Use better options for MediaRecorder
      let options = { mimeType: 'audio/webm' }
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(audioStream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio chunk received:', event.data.size, 'bytes')
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped. Total chunks:', chunksRef.current.length)
        const audioBlob = new Blob(chunksRef.current, { type: options.mimeType })
        console.log('Final audio blob size:', audioBlob.size, 'bytes')

        if (audioBlob.size < 1000) {
          onError('Recording too short. Please record for at least 2-3 seconds.', 'warning')
          setIsRecording(false)
          audioStream.getTracks().forEach(track => track.stop())
          return
        }

        await handleTranscribe(audioBlob)

        // Stop all tracks
        audioStream.getTracks().forEach(track => track.stop())
      }

      // Start recording
      mediaRecorder.start(100)
      setIsRecording(true)
      setSelectedSource('System Audio')
      console.log('Screen recording started with audio')
    } catch (error) {
      console.error('Error starting screen recording:', error)
      if (error.name === 'NotAllowedError') {
        onError('Screen sharing was cancelled or denied')
      } else {
        onError('Failed to start screen recording: ' + error.message)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const loadAudioDevices = async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()))

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')

      console.log('=== ALL AUDIO DEVICES ===')
      audioInputs.forEach((d, i) => {
        console.log(`${i}: ${d.label} (${d.deviceId})`)
      })
      console.log('========================')

      setAudioDevices(audioInputs)
      setShowSourceDialog(true)
    } catch (err) {
      onError('Failed to load audio devices: ' + err.message)
    }
  }

  const handleDeviceSelect = async (deviceId, sourceName) => {
    setShowSourceDialog(false)
    setSelectedSource(sourceName)
    console.log('Selected audio source:', sourceName, 'Device ID:', deviceId)
    await startRecording(deviceId)
  }

  const handleTranscribe = async (audioBlob) => {
    setIsProcessing(true)
    setIsRecording(false) // Reset recording state immediately
    onTranscribing(true)

    try {
      const data = await transcribeAudio(audioBlob)

      if (data.warning) {
        onError(data.warning, 'info')
      }

      onTranscriptComplete(data.transcript)
    } catch (error) {
      onError(error.message || 'Failed to transcribe audio. Please try again.')
      onTranscribing(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Audio Source Selection Dialog */}
      {showSourceDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in">
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl border-2 border-white/30 shadow-2xl p-10 max-w-lg w-full mx-4 animate-scale-in">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">🎹️ Choose Your Audio Source</h3>
              <p className="text-gray-300 text-sm">Select where you want to record audio from</p>
            </div>
            <div className="space-y-4">
              {(() => {
                // Find the Verba system audio device
                const systemAudioDevice = audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return (
                    (label.includes('monitor') && label.includes('verba')) ||
                    label.includes('verba_combined') ||
                    (label.includes('combined') && label.includes('audio'))
                  )
                })

                // Find any monitor device as fallback
                const monitorDevices = audioDevices.filter(d => {
                  const label = d.label?.toLowerCase() || ''
                  return label.includes('monitor') || label.includes('stereo mix')
                })

                // Determine which device to use for System Audio
                const systemDeviceToUse = systemAudioDevice || monitorDevices[0]

                // Find default microphone (exclude monitor devices)
                const micDevice = audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return d.deviceId === 'default' && !label.includes('monitor')
                }) || audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return !label.includes('monitor') && !label.includes('verba')
                }) || audioDevices[0]

                const handleSystemAudioClick = () => {
                  // Try to find a monitor device, otherwise fallback to default
                  // This ensures it works even if browser hides the specific monitor label
                  const monitorDevice = monitorDevices[0] || systemDeviceToUse || audioDevices[0]

                  if (monitorDevice) {
                    console.log('Selecting system audio device:', monitorDevice.label)
                    handleDeviceSelect(monitorDevice.deviceId, 'System Audio')
                  } else {
                    onError('No audio device available for System Audio', 'warning')
                  }
                }

                return (
                  <>
                    <div className="space-y-4">
                      {/* System Audio Option */}
                      <button
                        onClick={handleSystemAudioClick}
                        className="w-full px-7 py-6 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 border-2 border-purple-400/40 hover:border-purple-300/70 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] group"
                      >
                        <div className="flex items-center space-x-5">
                          <div className="text-5xl group-hover:scale-110 transition-transform">🔊</div>
                          <div className="text-left flex-1">
                            <div className="text-white font-bold text-2xl mb-1">System Audio</div>
                            <div className="text-purple-200 text-base">Record videos, music, browser audio</div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                            <span className="text-4xl text-white">→</span>
                          </div>
                        </div>
                      </button>

                      {/* Microphone Option */}
                      <button
                        onClick={() => handleDeviceSelect(micDevice?.deviceId, 'Microphone')}
                        className="w-full px-7 py-6 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 hover:from-green-600/50 hover:to-emerald-600/50 border-2 border-green-400/40 hover:border-green-300/70 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] group"
                      >
                        <div className="flex items-center space-x-5">
                          <div className="text-5xl group-hover:scale-110 transition-transform">🎤</div>
                          <div className="text-left flex-1">
                            <div className="text-white font-bold text-2xl mb-1">Microphone</div>
                            <div className="text-green-200 text-base">Record your voice or sounds around you</div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                            <span className="text-4xl text-white">→</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
            <button
              onClick={() => setShowSourceDialog(false)}
              className="mt-6 w-full px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white transition-all duration-300 hover:scale-105 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        {/* Glassmorphism Card - Dark Blue Theme */}
        <div className="bg-slate-900/60 rounded-3xl border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] p-10 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                {isRecording ? 'Recording...' : 'Record Audio'}
              </h2>
              <p className="text-blue-200/70 text-sm font-medium tracking-wide">
                {isRecording ? 'Listening to audio source' : 'Click the button to start recording'}
              </p>
            </div>

            {/* Realistic Waveform Visualizer */}
            {isRecording && (
              <div className="flex items-center justify-center space-x-1 h-16 mb-6">
                {/* Mirrored bars for realistic waveform look */}
                {[...Array(20)].map((_, i) => {
                  // Calculate height based on sine wave for smoother look + random noise
                  // Center bars are taller
                  const centerDist = Math.abs(i - 9.5);
                  const baseHeight = Math.max(20, 100 - (centerDist * 8));

                  return (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full"
                      style={{
                        height: '30%',
                        animation: `wave ${0.8 + Math.random() * 0.4}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    ></div>
                  )
                })}
                <style>{`
                  @keyframes wave {
                    0% { height: 20%; opacity: 0.5; }
                    50% { height: 50%; opacity: 0.8; }
                    100% { height: 100%; opacity: 1; }
                  }
                `}</style>
              </div>
            )}

            {/* Recording Button with Blue Glow */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 bg-red-500/30 rounded-full blur-3xl animate-pulse"></div>
              )}
              {!isRecording && !isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-indigo-600/40 to-cyan-500/40 rounded-full blur-2xl animate-pulse"></div>
              )}

              <button
                onClick={isRecording ? stopRecording : loadAudioDevices}
                disabled={isProcessing}
                className={`
                relative w-40 h-40 rounded-full font-bold text-white text-xl
                transition-all duration-500 shadow-2xl flex flex-col items-center justify-center
                ${isRecording
                    ? 'bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 scale-110 ring-4 ring-red-500/20'
                    : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500'
                  }
                ${isProcessing ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 hover:shadow-[0_0_50px_rgba(59,130,246,0.6)]'}
                border-4 border-white/10
              `}
              >
                <span className="drop-shadow-lg flex flex-col items-center">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                      <span className="text-sm font-medium tracking-wide">Processing</span>
                    </>
                  ) : isRecording ? (
                    <>
                      <div className="h-8 w-8 bg-white rounded-md mb-2 shadow-lg"></div>
                      <span className="text-sm font-bold tracking-widest">STOP</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl mb-2 filter drop-shadow-md">🎙️</span>
                      <span className="text-lg font-bold tracking-wider">RECORD</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Status Messages */}
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-red-400 bg-red-500/20 px-6 py-3 rounded-full border border-red-500/30 animate-pulse">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  <span className="font-semibold text-lg">Recording in progress...</span>
                </div>
                {selectedSource && (
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <span className="text-gray-400">Using:</span>
                    <span className={`font-bold ${selectedSource === 'System Audio' ? 'text-purple-400' : 'text-green-400'}`}>
                      {selectedSource === 'System Audio' ? '🔊' : '🎤'} {selectedSource}
                    </span>
                  </div>
                )}
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center space-x-3 text-blue-400 bg-blue-500/20 px-6 py-3 rounded-full border border-blue-500/30">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-semibold">Transcribing with Whisper AI...</span>
              </div>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-gray-400 text-sm italic">
                ✨ Your audio stays private and never leaves your device
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Recorder
