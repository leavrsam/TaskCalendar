
import { useState } from 'react'
import { AnimatedModal } from '@/components/ui/animated-modal'
import { Download, AlertCircle, Check } from 'lucide-react'

type ImportModalProps = {
    isOpen: boolean
    onClose: () => void
    onImport: (url: string) => Promise<void>
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            await onImport(url)
            setSuccess(true)
            setTimeout(() => {
                onClose()
                setUrl('')
                setSuccess(false)
            }, 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import calendar')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatedModal
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                        <Download className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            Import Calendar
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Sync via iCal URL (e.g., Google Calendar)
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            iCal URL (.ics)
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://calendar.google.com/calendar/ical/..."
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Paste the "Secret address in iCal format" from your Google Calendar settings.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-600 dark:text-rose-400">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            <p>Calendar imported successfully!</p>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {loading ? 'Importing...' : 'Import Events'}
                        </button>
                    </div>
                </form>
            </div>
        </AnimatedModal>
    )
}
