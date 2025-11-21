import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Contact, Task } from '@taskcalendar/core'
import { formatDistanceToNow } from 'date-fns'

// Fix for Leaflet marker icons in React
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
    const markers = useMemo(() => {
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

    return (
        <div className="h-[calc(100vh-12rem)] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <MapContainer center={[40.7608, -111.8910]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((contact) => (
                    <Marker key={contact.id} position={contact.position}>
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
            </MapContainer>
        </div>
    )
}
