import { createPortal } from 'react-dom'

function ActionConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    note,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isProcessing = false,
    variant = 'warning' // 'warning', 'danger', 'info'
}) {
    if (!isOpen) return null

    const colors = {
        warning: {
            border: 'border-amber-500/30',
            shadow: 'shadow-amber-500/20',
            bg: 'bg-amber-500/10',
            gradient: 'from-amber-500 to-orange-600',
            btnShadow: 'shadow-amber-500/50',
            icon: '⚠️'
        },
        danger: {
            border: 'border-red-500/30',
            shadow: 'shadow-red-500/20',
            bg: 'bg-red-500/10',
            gradient: 'from-red-500 to-red-600',
            btnShadow: 'shadow-red-500/50',
            icon: '🚫'
        },
        info: {
            border: 'border-blue-500/30',
            shadow: 'shadow-blue-500/20',
            bg: 'bg-blue-500/10',
            gradient: 'from-blue-500 to-indigo-600',
            btnShadow: 'shadow-blue-500/50',
            icon: 'ℹ️'
        }
    }[variant]

    const modalContent = (
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {/* Modal Box */}
                <div className={`relative w-full max-w-md bg-slate-900 border ${colors.border} rounded-2xl shadow-2xl ${colors.shadow} animate-in zoom-in-95 duration-200`}>
                    <div className={`bg-slate-900/95 backdrop-blur-sm border-b ${colors.border} px-6 py-4 rounded-t-2xl`}>
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span className="text-2xl">{colors.icon}</span>
                            {title}
                        </h3>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className={`rounded-xl ${colors.bg} border ${colors.border} p-4`}>
                            <p className="text-slate-200 text-sm leading-relaxed">
                                {message}
                            </p>
                        </div>

                        {note && (
                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                                <p className="text-xs text-slate-400">
                                    <span className="font-semibold text-slate-300">Note:</span> {note}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className={`bg-slate-900/95 backdrop-blur-sm border-t ${colors.border} px-6 py-4 flex gap-3 rounded-b-2xl`}>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-all font-semibold disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl shadow-lg ${colors.btnShadow} hover:scale-[1.02] transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}

export default ActionConfirmModal
