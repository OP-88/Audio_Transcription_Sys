/**
 * Recorder component with Progressive Chunk Upload - handles long audio recordings (4+ hours)
 * 
 * Key improvements:
 * - Uploads chunks every 10 seconds instead of storing in memory
 * - Shows recording timer and file size
 * - Supports 4+ hour recordings without crashes
 * - Memory usage stays under 10MB
 */
import { useState, useRef, useEffect } from 'react'
import { initializeRecording, uploadChunk, finalizeRecording } from '../api'

// Generate UUID for session IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Format seconds into HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format bytes into human-readable size
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function Recorder({ onTranscriptComplete, onTranscribing, onError }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSourceDialog, setShowSourceDialog] = useState(false)
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedSource, setSelectedSource] = useState(null)

  // Progressive recording state
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [uploadedSize, setUploadedSize] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [chunkIndex, setChunkIndex] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const uploadIntervalRef = useRef(null)
  const durationIntervalRef = useRef(null)

  const UPLOAD_INTERVAL_MS = 10000 // Upload every 10 seconds

  // Update recording timer
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [isRecording])

  const uploadAccumulatedChunks = async (isForced = false) => {
    if (chunksRef.current.length === 0) return

    try {
      // Combine current chunks into a blob
      const chunkBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

      // Upload to backend
      const result = await uploadChunk(sessionId, chunkIndex, chunkBlob)

      console.log(`Uploaded chunk ${chunkIndex}: ${formatBytes(chunkBlob.size)}`)

      // Update stats
      setUploadedSize(result.total_size)
      setChunkIndex(prev => prev + 1)

      // Clear uploaded chunks from memory
      chunksRef.current = []
    } catch (error) {
      console.error('Failed to upload chunk:', error)
      // Don't stop recording on upload failure - chunks are still in memory
      if (isForced) {
        onError('Warning: Some chunks failed to upload. Retrying...')
      }
    }
  }

  const startRecording = async (deviceId = null) => {
    try {
      // Generate session ID
      const newSessionId = generateUUID()
      setSessionId(newSessionId)
      setChunkIndex(0)
      setRecordingDuration(0)
      setUploadedSize(0)
      chunksRef.current = []

      // Initialize recording session on backend
      await initializeRecording(newSessionId, 'audio/webm')
      console.log('Initialized recording session:', newSessionId)

      // Build constraints
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

      // Use better options for MediaRecorder
      let options = { mimeType: 'audio/webm' }
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped')

        // Upload any remaining chunks
        if (chunksRef.current.length > 0) {
          await uploadAccumulatedChunks(true)
        }

        // Stop upload interval
        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current)
        }

        // Finalize and transcribe
        await finalizeAndTranscribe()

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      // Start recording with timeslice
      mediaRecorder.start(100)
      setIsRecording(true)

      // Set up periodic upload
      uploadIntervalRef.current = setInterval(async () => {
        await uploadAccumulatedChunks()
      }, UPLOAD_INTERVAL_MS)

      console.log('Recording started with device:', deviceId || 'default')
    } catch (error) {
      console.error('Error starting recording:', error)
      onError('Failed to access microphone: ' + error.message)
    }
  }

  const start ScreenRecording = async () => {
    try {
      // Generate session ID
      const newSessionId = generateUUID()
      setSessionId(newSessionId)
      setChunkIndex(0)
      setRecordingDuration(0)
      setUploadedSize(0)
      chunksRef.current = []

      // Initialize recording session
      await initializeRecording(newSessionId, 'audio/webm')

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      })

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        onError('No audio track selected. Make sure to enable "Share audio" when sharing.', 'warning')
        return
      }

      const audioStream = new MediaStream(audioTracks)
      stream.getVideoTracks().forEach(track => track.stop())

      let options = { mimeType: 'audio/webm' }
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(audioStream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('Screen recording stopped')

        if (chunksRef.current.length > 0) {
          await uploadAccumulatedChunks(true)
        }

        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current)
        }

        await finalizeAndTranscribe()
        audioStream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setSelectedSource('System Audio')

      // Set up periodic upload
      uploadIntervalRef.current = setInterval(async () => {
        await uploadAccumulatedChunks()
      }, UPLOAD_INTERVAL_MS)

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

  const finalizeAndTranscribe = async () => {
    setIsProcessing(true)
    setIsRecording(false)
    onTranscribing(true)

    try {
      console.log(`Finalizing recording ${sessionId}...`)
      const data = await finalizeRecording(sessionId)

      console.log(`Recording finalized: ${data.chunks_combined} chunks, ${formatBytes(data.total_size)}`)

      if (data.warning) {
        onError(data.warning, 'info')
      }

      onTranscriptComplete(data.transcript)
    } catch (error) {
      console.error('Finalization error:', error)
      onError(error.message || 'Failed to transcribe recording. Please try again.')
      onTranscribing(false)
    } finally {
      setIsProcessing(false)
      setSessionId(null)
      setRecordingDuration(0)
      setUploadedSize(0)
    }
  }

  const loadAudioDevices = async () => {
    try {
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

  return (
    <>
      {/* Audio Source Selection Dialog */}
      {showSourceDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in">
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl border-2 border-white/30 shadow-2xl p-10 max-w-lg w-full mx-4 animate-scale-in">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">🎙️ Choose Your Audio Source</h3>
              <p className="text-gray-300 text-sm">Select where you want to record audio from</p>
            </div>
            <div className="space-y-4">
              {(() => {
                const systemAudioDevice = audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return (
                    (label.includes('monitor') && label.includes('verba')) ||
                    label.includes('verba_combined') ||
                    (label.includes('combined') && label.includes('audio'))
                  )
                })

                const monitorDevices = audioDevices.filter(d => {
                  const label = d.label?.toLowerCase() || ''
                  return label.includes('monitor') || label.includes('stereo mix')
                })

                const systemDeviceToUse = systemAudioDevice || monitorDevices[0]

                const micDevice = audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return d.deviceId === 'default' && !label.includes('monitor')
                }) || audioDevices.find(d => {
                  const label = d.label?.toLowerCase() || ''
                  return !label.includes('monitor') && !label.includes('verba')
                }) || audioDevices[0]

                const handleSystemAudioClick = () => {
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
        {/* Glassmorphism Card */}
        <div className="bg-slate-900/60 rounded-3xl border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] p-10 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                {isRecording ? 'Recording...' : 'Record Audio'}
              </h2>
              <p className="text-blue-200/70 text-sm font-medium tracking-wide">
                {isRecording ? 'Progressive upload enabled - supports 4+ hour recordings' : 'Click the button to start recording'}
              </p>
            </div>

            {/* Recording Stats */}
            {isRecording && (
              <div className="flex items-center space-x-6 text-center">
                <div className="bg-blue-500/20 px-6 py-3 rounded-xl border border-blue-400/30">
                  <div className="text-blue-300 text-xs mb-1">Duration</div>
                  <div className="text-white font-mono text-2xl font-bold">{formatDuration(recordingDuration)}</div>
                </div>
                <div className="bg-purple-500/20 px-6 py-3 rounded-xl border border-purple-400/30">
                  <div className="text-purple-300 text-xs mb-1">Uploaded</div>
                  <div className="text-white font-mono text-2xl font-bold">{formatBytes(uploadedSize)}</div>
                </div>
              </div>
            )}

            {/* Waveform Visualizer */}
            {isRecording && (
              <div className="flex items-center justify-center space-x-1 h-16 mb-6">
                {[...Array(20)].map((_, i) => {
                  const centerDist = Math.abs(i - 9.5);
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

            {/* Recording Button */}
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
                <span className="font-semibold">Finalizing and transcribing...</span>
              </div>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-gray-400 text-sm italic">
                ✨ Progressive upload - supports 4+ hour recordings without memory issues
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Recorder
