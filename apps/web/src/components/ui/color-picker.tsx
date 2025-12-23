import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import clsx from 'clsx'

// Default Presets (10 colors)
// Google Calendar Colors
export const PRESET_COLORS = [
    { name: 'Lavender', value: '#7986cb' },
    { name: 'Sage', value: '#33b679' },
    { name: 'Grape', value: '#8e24aa' },
    { name: 'Flamingo', value: '#e67c73' },
    { name: 'Banana', value: '#f6bf26' },
    { name: 'Tangerine', value: '#f4511e' },
    { name: 'Peacock', value: '#039be5' },
    { name: 'Graphite', value: '#616161' },
    { name: 'Blueberry', value: '#3f51b5' },
    { name: 'Basil', value: '#0b8043' },
    { name: 'Tomato', value: '#d50000' },
]

type ColorPickerProps = {
    value?: string | null
    onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    // Load custom colors from localStorage
    const [customColors, setCustomColors] = useState<{ id: string; value: string }[]>([])

    useEffect(() => {
        try {
            const stored = localStorage.getItem('taskcalendar_custom_colors')
            if (stored) {
                setCustomColors(JSON.parse(stored))
            }
        } catch (e) {
            console.error('Failed to load custom colors', e)
        }
    }, [])

    const saveCustomColors = (colors: { id: string; value: string }[]) => {
        setCustomColors(colors)
        localStorage.setItem('taskcalendar_custom_colors', JSON.stringify(colors))
    }

    const handleAddColor = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value
        // Avoid duplicates
        if (customColors.some(c => c.value === newColor) || PRESET_COLORS.some(c => c.value === newColor)) {
            onChange(newColor)
            return
        }

        const newColors = [...customColors, { id: crypto.randomUUID(), value: newColor }]
        saveCustomColors(newColors)
        onChange(newColor)
    }

    const handleDeleteColor = (e: React.MouseEvent, id: string) => {
        e.stopPropagation() // Prevent selecting the color we just deleted
        const newColors = customColors.filter(c => c.id !== id)
        saveCustomColors(newColors)
        // If the deleted color was selected, revert to default blue
        if (value === customColors.find(c => c.id === id)?.value) {
            onChange(PRESET_COLORS[0].value)
        }
    }

    return (
        <div className="space-y-3">
            {/* Presets */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Default Colors</p>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {PRESET_COLORS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => onChange(preset.value)}
                            className={clsx(
                                "group relative h-8 w-full rounded-md transition-all hover:scale-105 border border-black/5 dark:border-white/10",
                                "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                            )}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                        >
                            {value === preset.value && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white drop-shadow-sm" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Colors */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Custom Colors</p>
                    <div className="relative flex items-center">
                        <label className="cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded transition">
                            <Plus className="w-3 h-3" />
                            Add
                            <input
                                type="color"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={handleAddColor}
                                value={value || '#039be5'}
                            />
                        </label>
                    </div>
                </div>

                {customColors.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No custom colors yet.</p>
                ) : (
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                        {customColors.map((color) => (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => onChange(color.value)}
                                className={clsx(
                                    "group relative h-8 w-full rounded-md transition-all hover:scale-105 border border-black/5 dark:border-white/10",
                                    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                                )}
                                style={{ backgroundColor: color.value }}
                                title={color.value}
                            >
                                {value === color.value && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white drop-shadow-sm" />
                                    </div>
                                )}

                                {/* Delete button (only visible on hover/focus) */}
                                <div
                                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => handleDeleteColor(e, color.id)}
                                >
                                    <div className="bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-rose-50 text-rose-500">
                                        <Trash2 className="w-3 h-3" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
