import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPolicyRoute() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <header>
                    <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Privacy Policy</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Last updated: December 19, 2025</p>
                </header>

                <section className="prose prose-slate dark:prose-invert max-w-none">
                    <p>
                        Your privacy is important to us. It is TaskCalendar's policy to respect your privacy regarding any information we may collect from you across our website and application.
                    </p>

                    <h3>1. Information We Collect</h3>
                    <p>
                        <strong>Personal Information:</strong> We collect information you provide directly to us, such as your name, email address, and profile picture when you create an account or connect via Google.
                    </p>
                    <p>
                        <strong>Calendar Data:</strong> When you choose to connect your Google Calendar, we access your calendar events to display them within the application and to sync tasks you create. We store authentication tokens securely to maintain this connection.
                    </p>

                    <h3>2. How We Use Your Information</h3>
                    <p>
                        We use the information we collect to:
                    </p>
                    <ul>
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Sync your schedule across devices and services (e.g., Google Calendar synchronization).</li>
                        <li>Send you technical notices, updates, security alerts, and support messages.</li>
                    </ul>

                    <h3>3. Google User Data</h3>
                    <p>
                        If you connect your Google Account, our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
                    </p>
                    <p>
                        We do not share your Google Calendar data with third-party AI tools or external advertising platforms.
                    </p>

                    <h3>4. Data Security</h3>
                    <p>
                        We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
                    </p>

                    <h3>5. Contact Us</h3>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us.
                    </p>
                </section>
            </div>
        </div>
    )
}
