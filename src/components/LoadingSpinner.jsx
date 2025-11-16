import React from 'react'

function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
    xl: 'w-20 h-20 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-purple-200/30 border-t-purple-500 rounded-full animate-spin`}></div>
        <div className={`${sizeClasses[size]} border-pink-200/30 border-t-pink-500 rounded-full animate-spin absolute top-0 left-0`} style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
      </div>
      {text && <p className="text-slate-300 text-sm animate-pulse font-medium">{text}</p>}
    </div>
  )
}

export default LoadingSpinner
