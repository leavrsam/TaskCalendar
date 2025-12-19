import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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

L.Marker.prototype.options.icon = ContactIcon

type GlobalMapProps = {
    contacts: Contact[]
    tasks: Task[]
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

export function GlobalMap({ contacts, tasks }: GlobalMapProps) {
    // Contact markers
    const contactMarkers = useMemo(() => {
        return contacts
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
    }, [contacts, tasks])

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

                {/* Contact Markers */}
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
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
