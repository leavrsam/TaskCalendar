import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { MapPin, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix leaflet marker icon
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

type LocationPickerProps = {
    value: { lat: number; lng: number } | null
    address?: string
    onChange: (location: { lat: number; lng: number } | null, address?: string) => void
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

export function LocationPicker({ value, address, onChange }: LocationPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(value)
    const [addressInput, setAddressInput] = useState(address || '')

    const handleMapClick = useCallback((lat: number, lng: number) => {
        setTempLocation({ lat, lng })
    }, [])

    const handleConfirm = () => {
        onChange(tempLocation, addressInput || undefined)
        setIsOpen(false)
    }

    const handleClear = () => {
        setTempLocation(null)
        setAddressInput('')
        onChange(null, undefined)
        setIsOpen(false)
    }

    const handleOpen = () => {
        setTempLocation(value)
        setAddressInput(address || '')
        setIsOpen(true)
    }

    // Default center: Salt Lake City or current location
    const mapCenter: [number, number] = tempLocation
        ? [tempLocation.lat, tempLocation.lng]
        : value
            ? [value.lat, value.lng]
            : [40.7608, -111.8910]

    return (
        <>
            {/* Pin button trigger */}
            <button
                type="button"
                onClick={handleOpen}
                className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                title="Pick location on map"
            >
                <MapPin className="h-4 w-4" />
            </button>

            {/* Map popup modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                Pick Location
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400">
                            Click on the map to place a pin, or enter an address below.
                        </div>

                        {/* Map */}
                        <div className="h-[400px] w-full">
                            <MapContainer
                                center={mapCenter}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapClickHandler onLocationSelect={handleMapClick} />
                                {tempLocation && (
                                    <Marker position={[tempLocation.lat, tempLocation.lng]} />
                                )}
                            </MapContainer>
                        </div>

                        {/* Address input & coordinates display */}
                        <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                    Address (optional)
                                </label>
                                <input
                                    type="text"
                                    value={addressInput}
                                    onChange={(e) => setAddressInput(e.target.value)}
                                    placeholder="Enter address or description..."
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                                />
                            </div>

                            {tempLocation && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    📍 Coordinates: {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            >
                                Clear Location
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                                >
                                    Confirm Location
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
