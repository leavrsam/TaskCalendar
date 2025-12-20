import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function TermsOfServiceRoute() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <header>
                    <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Terms of Service</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Last updated: December 19, 2025</p>
                </header>

                <section className="prose prose-slate dark:prose-invert max-w-none">
                    <h3>1. Terms</h3>
                    <p>
                        By accessing this website and application, you agree to be bound by these restrictions and agree that you are responsible for compliance with any applicable local laws.
                    </p>

                    <h3>2. Use License</h3>
                    <p>
                        Permission is granted to temporarily download one copy of the materials (information or software) on TaskCalendar for personal, non-commercial transitory viewing only.
                    </p>

                    <h3>3. Disclaimer</h3>
                    <p>
                        The materials on TaskCalendar are provided "as is". TaskCalendar makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.
                    </p>

                    <h3>4. Limitations</h3>
                    <p>
                        In no event shall TaskCalendar or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TaskCalendar.
                    </p>

                    <h3>5. Accuracy of Materials</h3>
                    <p>
                        The materials appearing on TaskCalendar could include technical, typographical, or photographic errors. TaskCalendar does not warrant that any of the materials on its website are accurate, complete or current.
                    </p>

                    <h3>6. Modifications</h3>
                    <p>
                        TaskCalendar may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
                    </p>

                    <h3>7. Governing Law</h3>
                    <p>
                        These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                    </p>
                </section>
            </div>
        </div>
    )
}
