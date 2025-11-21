import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Contact } from '@taskcalendar/core'

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

type ContactsMapProps = {
    contacts: Contact[]
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

export function ContactsMap({ contacts }: ContactsMapProps) {
    const markers = useMemo(() => {
        return contacts
            .filter((c) => c.location || c.address)
            .map((c) => ({
                ...c,
                position: c.location
                    ? ([c.location.lat, c.location.lng] as [number, number])
                    : getPseudoCoordinates(c.address!),
            }))
    }, [contacts])

    return (
        <div className="h-[600px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <MapContainer center={[40.7608, -111.8910]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((contact) => (
                    <Marker key={contact.id} position={contact.position}>
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                                <p className="text-xs text-slate-500">{contact.address}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 uppercase">
                                        {contact.stage}
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
