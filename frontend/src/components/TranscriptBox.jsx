import { useState, useEffect } from 'react'

function TranscriptBox({ transcript, initialTitle, onSummarize, onSave, onReset, isSummarizing, isTranscribing, isExistingSession }) {
  const [title, setTitle] = useState(initialTitle || 'Untitled Session')
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  useEffect(() => {
    setTitle(initialTitle || 'Untitled Session')
  }, [initialTitle])

  const wordCount = transcript.split(' ').filter(w => w).length
  const charCount = transcript.length

  return (
    <div className="relative group">
      {/* Glassmorphism Card */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 transition-all duration-300 hover:bg-white/15">
        <div className="flex flex-col gap-6 mb-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📝</span>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    autoFocus
                    className="bg-transparent border-b border-white/30 text-white text-2xl font-bold focus:outline-none focus:border-purple-400 w-full"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-3xl font-bold text-white cursor-pointer hover:text-purple-200 transition-colors flex items-center gap-2"
                    title="Click to rename"
                  >
                    {title}
                    <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </h2>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-purple-300 font-medium">{wordCount} words</span>
                <span className="text-gray-400">•</span>
                <span className="text-pink-300 font-medium">{charCount} characters</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onSave(title)}
                disabled={isSummarizing || isTranscribing}
                className={`px-5 py-3 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50
                  ${isExistingSession
                    ? 'bg-green-600/80 hover:bg-green-600 hover:shadow-green-500/30'
                    : 'bg-blue-600/80 hover:bg-blue-600 hover:shadow-blue-500/30'
                  }`}
              >
                <span className="flex items-center gap-2">
                  {isExistingSession ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Update
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save
                    </>
                  )}
                </span>
              </button>

              <button
                onClick={() => onSummarize(title)}
                disabled={isSummarizing || isTranscribing}
                className="group/btn relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold
                         hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isSummarizing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Summarize
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-0 group-hover/btn:opacity-50 transition-opacity"></div>
              </button>

              <button
                onClick={onReset}
                disabled={isSummarizing || isTranscribing}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold
                         border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Transcript Content */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 max-h-96 overflow-y-auto border border-white/10
                        scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg font-light">
              {transcript}
            </p>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="mt-4 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full"></div>
      </div>
    </div>
  )
}

export default TranscriptBox
