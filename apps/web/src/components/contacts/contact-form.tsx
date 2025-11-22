import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import type { Contact, ContactStage } from '@taskcalendar/core'
import { CONTACT_STAGE_ORDER } from '@taskcalendar/core'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

type ContactFormProps = {
    initialData?: Contact
    onSubmit: (data: Omit<Contact, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>) => Promise<void>
    onClose: () => void
    title: string
}

const STAGE_LABELS: Record<ContactStage, string> = {
    new: 'New',
    teaching: 'Visiting',
    progressing: 'Building Relationship',
    member: 'Friend',
    dropped: 'Archived',
}

function LocationPicker({ position, onLocationSelect }: { position: [number, number] | null, onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })

    return position ? <Marker position={position} /> : null
}

export function ContactForm({ initialData, onSubmit, onClose, title }: ContactFormProps) {
    const [form, setForm] = useState({
        name: '',
        stage: 'new' as ContactStage,
        address: '',
        phone: '',
        email: '',
        notes: '',
        location: null as { lat: number; lng: number } | null,
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGeocoding, setIsGeocoding] = useState(false)

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name,
                stage: initialData.stage,
                address: initialData.address || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                notes: initialData.notes || '',
                location: initialData.location || null,
            })
        }
    }, [initialData])

    const handleGeocode = async () => {
        if (!form.address) return
        setIsGeocoding(true)
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}`)
            const data = await response.json()
            if (data && data.length > 0) {
                const { lat, lon } = data[0]
                setForm(prev => ({ ...prev, location: { lat: parseFloat(lat), lng: parseFloat(lon) } }))
            }
        } catch (error) {
            console.error('Geocoding failed', error)
        } finally {
            setIsGeocoding(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onSubmit({
                ...form,
                email: form.email || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
                notes: form.notes || undefined,
                location: form.location || null,
                tags: initialData?.tags || [],
                lastContactedAt: initialData?.lastContactedAt || null,
                nextVisitAt: initialData?.nextVisitAt || null,
                sharedWith: initialData?.sharedWith || [],
            })
            onClose()
        } catch (error) {
            console.error('Failed to save contact', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Name</label>
                        <input
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Stage</label>
                        <select
                            value={form.stage}
                            onChange={(e) => setForm({ ...form, stage: e.target.value as ContactStage })}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        >
                            {CONTACT_STAGE_ORDER.map((stage) => (
                                <option key={stage} value={stage}>
                                    {STAGE_LABELS[stage]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Address</label>
                        <div className="flex gap-2">
                            <input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                placeholder="123 Main St, City, State"
                            />
                            <button
                                type="button"
                                onClick={handleGeocode}
                                disabled={isGeocoding || !form.address}
                                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                title="Find on map"
                            >
                                <MapPin className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-48 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <MapContainer
                            center={form.location ? [form.location.lat, form.location.lng] : [40.7608, -111.8910]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationPicker
                                position={form.location ? [form.location.lat, form.location.lng] : null}
                                onLocationSelect={(lat, lng) => setForm({ ...form, location: { lat, lng } })}
                            />
                        </MapContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Phone</label>
                            <input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Notes</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            rows={3}
                            placeholder="Add notes about family, interests, etc."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Contact'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
