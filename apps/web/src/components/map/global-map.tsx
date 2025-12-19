import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Contact, Task } from '@taskcalendar/core'
import { formatDistanceToNow, format } from 'date-fns'

// Fix for Leaflet marker icons in React
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Default blue icon for contacts
const ContactIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

// Custom orange/red icon for events (using SVG data URL)
const EventIcon = L.divIcon({
    className: 'event-marker',
    html: `<div style="
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 12px;">📅</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
})

// Custom green icon for saved locations
const LocationPinIcon = L.divIcon({
    className: 'location-pin-marker',
    html: `<div style="
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 14px;">📍</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
})

L.Marker.prototype.options.icon = ContactIcon

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

type GlobalMapProps = {
    contacts: Contact[]
    tasks: Task[]
    draftPosition?: { lat: number; lng: number } | null
    onDraftLocationChange?: (location: { lat: number; lng: number } | null) => void
    onCreateEvent?: (lat: number, lng: number) => void
    onCreateLocation?: (lat: number, lng: number) => void
    onDeleteLocation?: (id: string) => void
    onEditEvent?: (task: Task) => void
}

// Pseudo-geocoding: Deterministically map an address string to a lat/lng near Salt Lake City
const getPseudoCoordinates = (address: string) => {
    let hash = 0
    for (let i = 0; i < address.length; i++) {
        hash = (hash << 5) - hash + address.charCodeAt(i)
        hash |= 0
    }

    // Center on Salt Lake City (approx 40.7608, -111.8910)
    // Spread within ~0.1 degrees (approx 10km)
    const latOffset = (hash % 1000) / 10000
    const lngOffset = ((hash >> 16) % 1000) / 10000

    return [40.7608 + latOffset, -111.8910 + lngOffset] as [number, number]
}

export function GlobalMap({
    contacts,
    tasks,
    draftPosition: externalDraftPosition,
    onDraftLocationChange,
    onCreateEvent,
    onCreateLocation,
    onDeleteLocation,
    onEditEvent
}: GlobalMapProps) {
    // Internal state fallback if not controlled (though we plan to control it)
    const [internalDraftPosition, setInternalDraftPosition] = useState<{ lat: number; lng: number } | null>(null)

    // Use external if provided, otherwise internal
    const draftPosition = externalDraftPosition !== undefined ? externalDraftPosition : internalDraftPosition

    const handleDraftChange = (lat: number, lng: number) => {
        if (onDraftLocationChange) {
            onDraftLocationChange({ lat, lng })
        } else {
            setInternalDraftPosition({ lat, lng })
        }
    }

    // Split contacts into regular contacts and simplified location pins
    const { regularContacts, locationPins } = useMemo(() => {
        const regular: typeof contacts = []
        const pins: typeof contacts = []

        contacts.forEach(c => {
            if (c.tags?.includes('pinned-location')) {
                pins.push(c)
            } else {
                regular.push(c)
            }
        })

        return { regularContacts: regular, locationPins: pins }
    }, [contacts])

    // Contact markers (Regular)
    const contactMarkers = useMemo(() => {
        return regularContacts
            .filter((c) => c.location || c.address)
            .map((c) => {
                const contactTasks = tasks.filter(t => t.contactId === c.id && t.status !== 'done')
                return {
                    ...c,
                    position: c.location
                        ? ([c.location.lat, c.location.lng] as [number, number])
                        : getPseudoCoordinates(c.address!),
                    activeTasks: contactTasks
                }
            })
    }, [regularContacts, tasks])

    // Location Pin markers
    const locationPinMarkers = useMemo(() => {
        return locationPins
            .filter((c) => c.location || c.address)
            .map((c) => ({
                ...c,
                position: c.location
                    ? ([c.location.lat, c.location.lng] as [number, number])
                    : getPseudoCoordinates(c.address!),
            }))
    }, [locationPins])

    // Event markers - tasks with addresses that are not done
    const eventMarkers = useMemo(() => {
        return tasks
            .filter((t) => (t.location || t.address) && t.status !== 'done')
            .map((t) => ({
                ...t,
                position: t.location
                    ? ([t.location.lat, t.location.lng] as [number, number])
                    : getPseudoCoordinates(t.address!),
            }))
    }, [tasks])

    return (
        <div className="h-full w-full z-0 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <MapContainer center={[40.7608, -111.8910]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {onCreateEvent && (
                    <MapClickHandler onLocationSelect={handleDraftChange} />
                )}

                {/* Draft Marker */}
                {draftPosition && (
                    <Marker position={[draftPosition.lat, draftPosition.lng]}>
                        <Popup>
                            <div className="p-2 text-center flex flex-col gap-2">
                                <p className="mb-1 text-sm font-medium text-slate-900">New Location</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => onCreateEvent?.(draftPosition.lat, draftPosition.lng)}
                                        className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                                    >
                                        Create Event
                                    </button>
                                    <button
                                        onClick={() => onCreateLocation?.(draftPosition.lat, draftPosition.lng)}
                                        className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                                    >
                                        Save Location
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Contact Markers (People) */}
                {contactMarkers.map((contact) => (
                    <Marker key={`contact-${contact.id}`} position={contact.position} icon={ContactIcon}>
                        <Popup>
                            <div className="min-w-[200px] p-1">
                                <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                                <p className="text-xs text-slate-500">{contact.address}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 uppercase">
                                        {contact.stage}
                                    </span>
                                </div>

                                {contact.activeTasks.length > 0 && (
                                    <div className="mt-3 border-t border-slate-100 pt-2">
                                        <p className="text-[10px] font-semibold uppercase text-slate-500">Active Tasks</p>
                                        <ul className="mt-1 space-y-1">
                                            {contact.activeTasks.map(task => (
                                                <li key={task.id} className="flex items-start gap-1.5 text-xs text-slate-700">
                                                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${task.priority === 'high' ? 'bg-red-500' :
                                                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`} />
                                                    <div>
                                                        <p>{task.title}</p>
                                                        {task.dueAt && (
                                                            <p className="text-[10px] text-slate-400">
                                                                Due {formatDistanceToNow(new Date(task.dueAt), { addSuffix: true })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Location Pin Markers (Saved Locations) */}
                {locationPinMarkers.map((pin) => (
                    <Marker key={`pin-${pin.id}`} position={pin.position} icon={LocationPinIcon}>
                        <Popup>
                            <div className="min-w-[150px] p-1 text-center">
                                <h3 className="font-semibold text-slate-900 mb-1">{pin.name}</h3>
                                <p className="text-xs text-slate-500 mb-3">{pin.address}</p>

                                <button
                                    onClick={() => onDeleteLocation?.(pin.id)}
                                    className="w-full rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 border border-red-100"
                                >
                                    Delete Pin
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Event Markers */}
                {eventMarkers.map((event) => (
                    <Marker key={`event-${event.id}`} position={event.position} icon={EventIcon}>
                        <Popup>
                            <div className="min-w-[200px] p-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📅</span>
                                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                                </div>
                                {event.address && (
                                    <p className="text-xs text-slate-500 mt-1">{event.address}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${event.status === 'todo' ? 'bg-slate-100 text-slate-700' :
                                        event.status === 'inProgress' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {event.status === 'inProgress' ? 'In Progress' : event.status}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${event.priority === 'high' ? 'bg-red-100 text-red-700' :
                                        event.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {event.priority} priority
                                    </span>
                                </div>
                                {event.scheduledStart && (
                                    <div className="mt-2 text-xs text-slate-600">
                                        <p className="font-medium">
                                            {format(new Date(event.scheduledStart), 'MMM d, yyyy')}
                                        </p>
                                        {!event.isAllDay && (
                                            <p className="text-slate-400">
                                                {format(new Date(event.scheduledStart), 'h:mm a')}
                                                {event.scheduledEnd && ` - ${format(new Date(event.scheduledEnd), 'h:mm a')}`}
                                            </p>
                                        )}
                                        {event.isAllDay && <p className="text-slate-400">All day</p>}
                                    </div>
                                )}
                                {onEditEvent && (
                                    <button
                                        onClick={() => onEditEvent(event)}
                                        className="mt-3 w-full rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        Edit Event
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
