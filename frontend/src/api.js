/**
 * API helper module - centralizes all backend API calls
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Get system status
 */
export async function getStatus() {
  const response = await fetch(`${API_URL}/api/status`)
  if (!response.ok) {
    throw new Error('Failed to fetch status')
  }
  return response.json()
}

/**
 * Transcribe audio file
 * @param {Blob} audioBlob - Audio file to transcribe
 * @returns {Promise<{transcript: string, status: string}>}
 */
export async function transcribeAudio(audioBlob) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Transcription failed')
  }

  return data
}

/**
 * Summarize transcript
 * @param {string} transcript - Transcript text
 * @param {boolean} saveSession - Whether to save as session
 * @returns {Promise<{summary: object, session_id?: string, status: string}>}
 */
export async function summarizeTranscript(transcript, saveSession = true, title = null) {
  const response = await fetch(`${API_URL}/api/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      save_session: saveSession,
      title
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Summarization failed')
  }

  return data
}

/**
 * Save session directly
 * @param {string} transcript - Transcript text
 * @param {string} title - Session title
 * @param {object} summary - Optional summary
 * @returns {Promise<{session_id: string, status: string}>}
 */
export async function saveSession(transcript, title = null, summary = {}) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      title,
      summary
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save session')
  }

  return data
}

/**
 * Get list of sessions
 * @returns {Promise<{sessions: Array, count: number}>}
 */
export async function listSessions() {
  const response = await fetch(`${API_URL}/api/sessions`)

  if (!response.ok) {
    throw new Error('Failed to load sessions')
  }

  return response.json()
}

/**
 * Get single session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<{session: object}>}
 */
export async function getSession(sessionId) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load session')
  }

  return data
}

/**
 * Export session as Markdown
 * @param {string} sessionId - Session ID
 * @returns {Promise<Blob>}
 */
export async function exportSession(sessionId) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/export`)

  if (!response.ok) {
    throw new Error('Failed to export session')
  }

  return response.blob()
}

/**
 * Update an existing session
 * @param {string} sessionId - Session ID
 * @param {object} data - Data to update (title, transcript, summary)
 * @returns {Promise<{status: string}>}
 */
export async function updateSession(sessionId, data) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update session')
  }

  return result
}

/**
 * Delete a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<{status: string}>}
 */
export async function deleteSession(sessionId) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete session')
  }

  return result
}

/**
 * Initialize a progressive recording session
 * @param {string} sessionId - Unique session ID
 * @param {string} mimeType - Audio MIME type
 * @returns {Promise<{session_id: string, status: string}>}
 */
export async function initializeRecording(sessionId, mimeType = 'audio/webm') {
  const response = await fetch(`${API_URL}/api/recording/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      mime_type: mimeType
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to initialize recording')
  }

  return data
}

/**
 * Upload a chunk during progressive recording
 * @param {string} sessionId - Session ID
 * @param {number} chunkIndex - Sequential chunk number
 * @param {Blob} chunkBlob - Audio chunk data
 * @returns {Promise<{status: string, chunk_index: number, total_chunks: number, total_size: number}>}
 */
export async function uploadChunk(sessionId, chunkIndex, chunkBlob) {
  const formData = new FormData()
  formData.append('chunk', chunkBlob, `chunk_${chunkIndex}.webm`)

  const response = await fetch(`${API_URL}/api/recording/upload-chunk/${sessionId}/${chunkIndex}`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload chunk')
  }

  return data
}

/**
 * Finalize recording and get transcript
 * @param {string} sessionId - Session ID
 * @returns {Promise<{transcript: string, chunks_combined: number, total_size: number, status: string}>}
 */
export async function finalizeRecording(sessionId) {
  const response = await fetch(`${API_URL}/api/recording/finalize/${sessionId}`, {
    method: 'POST',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to finalize recording')
  }

  return data
}

/**
 * Get recording session status
 * @param {string} sessionId - Session ID
 * @returns {Promise<{session_id: string, chunks_received: number, total_size: number}>}
 */
export async function getRecordingStatus(sessionId) {
  const response = await fetch(`${API_URL}/api/recording/status/${sessionId}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get recording status')
  }

  return data
}
