import { AnimatedModal } from './animated-modal'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type StatusModalProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    message: string
    type: 'success' | 'error'
}

export function StatusModal({ isOpen, onClose, title, message, type }: StatusModalProps) {
    return (
        <AnimatedModal isOpen={isOpen} onClose={onClose}>
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                            }`}>
                            {type === 'success' ? (
                                <CheckCircle className="h-6 w-6" />
                            ) : (
                                <AlertCircle className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="mt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        {message}
                    </p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </AnimatedModal>
    )
}
