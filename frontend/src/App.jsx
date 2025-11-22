/**
 * Verba main application component
 * Coordinates recording, transcription, summarization, and session management
 */
import { useState } from 'react'
import Header from './components/Header'
import Recorder from './components/Recorder'
import TranscriptBox from './components/TranscriptBox'
import SummaryBox from './components/SummaryBox'
import SessionHistory from './components/SessionHistory'
import Toast from './components/Toast'
import { summarizeTranscript, exportSession } from './api'

function App() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [currentTitle, setCurrentTitle] = useState('Untitled Session')

  const handleTranscriptComplete = (text) => {
    setTranscript(text)
    setIsTranscribing(false)
    setSummary(null) // Clear old summary
    setCurrentSessionId(null)
    setCurrentTitle('Untitled Session')
  }

  const handleSummarize = async (title) => {
    if (!transcript) return

    setIsSummarizing(true)
    try {
      const data = await summarizeTranscript(transcript, true, title)
      setSummary(data.summary)
      setCurrentSessionId(data.session_id)
      setCurrentTitle(title)
      showToast('Summary generated & session saved!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to generate summary. Please try again.')
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleSaveSession = async (title) => {
    if (!transcript) return

    try {
      const { saveSession, updateSession } = await import('./api')

      if (currentSessionId) {
        // Update existing session
        await updateSession(currentSessionId, {
          title,
          transcript,
          summary: summary || {}
        })
        setCurrentTitle(title)
        showToast('Session updated successfully!', 'success')
      } else {
        // Create new session
        const data = await saveSession(transcript, title, summary || {})
        setCurrentSessionId(data.session_id)
        setCurrentTitle(title)
        showToast('Session saved successfully!', 'success')
      }
    } catch (error) {
      showToast(error.message || 'Failed to save session')
    }
  }

  const handleReset = () => {
    setTranscript('')
    setSummary(null)
    setCurrentSessionId(null)
    setCurrentTitle('Untitled Session')
  }

  const handleSessionSelect = (session) => {
    setTranscript(session.transcript)
    setSummary(session.summary)
    setCurrentSessionId(session.id)
    setCurrentTitle(session.title || 'Untitled Session')
    setSidebarOpen(false) // Close sidebar on mobile
  }

  const handleExport = async () => {
    if (!currentSessionId) {
      showToast('No session to export', 'info')
      return
    }

    try {
      const blob = await exportSession(currentSessionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `verba-session-${currentSessionId.slice(0, 8)}.md`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('Session exported successfully!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to export session')
    }
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  const closeToast = () => {
    setToast(null)
  }

  const handleError = (message, type = 'error') => {
    showToast(message, type)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-1/2 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <Header />

      {/* Session History Sidebar */}
      <SessionHistory
        onSessionSelect={handleSessionSelect}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:ml-80 md:mr-0">
            {/* Left Column: Recorder + Transcript */}
            <div className="space-y-8">
              <div className="transform transition-all duration-500 hover:scale-[1.02]">
                <Recorder
                  onTranscriptComplete={handleTranscriptComplete}
                  onTranscribing={setIsTranscribing}
                  onError={handleError}
                />
              </div>

              {transcript && (
                <div className="transform transition-all duration-500 animate-slide-up">
                  <TranscriptBox
                    transcript={transcript}
                    initialTitle={currentTitle}
                    onSummarize={handleSummarize}
                    onSave={handleSaveSession}
                    onReset={handleReset}
                    isSummarizing={isSummarizing}
                    isTranscribing={isTranscribing}
                    isExistingSession={!!currentSessionId}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Summary */}
            <div>
              {summary && (
                <div className="transform transition-all duration-500 animate-slide-up">
                  <SummaryBox
                    summary={summary}
                    onExport={handleExport}
                    canExport={!!currentSessionId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center mt-16 space-y-4 md:ml-80">
            <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>No cloud • No tracking • Everything runs locally</span>
            </div>
            <p className="text-gray-500 text-xs">Built with ❤️ for privacy and local-first software</p>
          </footer>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  )
}

export default App
