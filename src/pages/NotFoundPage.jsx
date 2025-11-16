import { useNavigate } from 'react-router-dom'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-8">
          <span className="text-8xl">🚫</span>
        </div>
        
        <h1 className="text-6xl sm:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
          404
        </h1>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-200 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium rounded-lg transition-all border border-purple-500/30"
          >
            ← Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-500/50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
