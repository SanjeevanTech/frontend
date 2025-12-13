import { createPortal } from 'react-dom'

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  warningMessage,
  noteMessage,
  confirmButtonText = 'Delete',
  isDeleting = false,
  additionalInfo = null
}) {
  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container - centers the modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Modal Content */}
        <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20">
          <div className="bg-slate-900/95 backdrop-blur-sm border-b border-red-500/20 px-6 py-4 rounded-t-2xl">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              {title}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
              <p className="text-slate-200 font-semibold mb-2">
                {itemName}
              </p>
              {warningMessage && (
                <p className="text-sm text-slate-300">
                  {warningMessage}
                </p>
              )}
            </div>

            {additionalInfo && (
              <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                {additionalInfo}
              </div>
            )}

            {noteMessage && (
              <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-200">Note:</span> {noteMessage}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900/95 backdrop-blur-sm border-t border-red-500/20 px-6 py-4 flex gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg shadow-red-500/50 hover:shadow-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                confirmButtonText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Use Portal to render modal at document.body level
  return createPortal(modalContent, document.body)
}

export default DeleteConfirmModal
