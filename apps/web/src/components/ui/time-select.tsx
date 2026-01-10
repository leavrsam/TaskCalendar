import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export type TimeOption = {
    label: string
    value: string
}

type TimeSelectProps = {
    value: string
    onChange: (value: string) => void
    options?: TimeOption[]
    placeholder?: string
    className?: string
}

// Generate default time slots (5 min intervals) if not provided
const DEFAULT_TIME_SLOTS = Array.from({ length: 12 * 24 }).map((_, i) => {
    const hours = Math.floor(i / 12)
    const minutes = (i % 12) * 5
    const date = new Date()
    date.setHours(hours, minutes)
    const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    return { label, value }
})

export function TimeSelect({ value, onChange, options = DEFAULT_TIME_SLOTS, placeholder = "Select...", className }: TimeSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Local input value state to allow typing
    const [inputValue, setInputValue] = useState("")
    // Flag to skip parseAndCommit on blur when dropdown selection just happened
    const skipBlurCommitRef = useRef(false)

    useEffect(() => {
        const matchingOption = options.find(o => o.value === value)
        if (matchingOption) {
            setInputValue(matchingOption.label)
        } else if (value) {
            // Check if value matches HH:mm format
            const [h, m] = value.split(':').map(Number)
            if (!isNaN(h) && !isNaN(m)) {
                const date = new Date()
                date.setHours(h, m)
                setInputValue(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }))
            } else {
                setInputValue(value)
            }
        } else {
            setInputValue("")
        }
    }, [value, options])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Scroll to suitable item when opening
    useEffect(() => {
        if (isOpen && listRef.current) {
            // Find closest option to current value
            // If value is "14:26", closest is "14:25"
            let targetIndex = -1
            if (value) {
                const [h, m] = value.split(':').map(Number)
                if (!isNaN(h) && !isNaN(m)) {
                    const totalMinutes = h * 60 + m
                    // Find option with minimal difference
                    let minDiff = Infinity
                    options.forEach((opt, idx) => {
                        const [oh, om] = opt.value.split(':').map(Number)
                        const optMinutes = oh * 60 + om
                        const diff = Math.abs(optMinutes - totalMinutes)
                        if (diff < minDiff) {
                            minDiff = diff
                            targetIndex = idx
                        }
                    })
                }
            }

            // If no valid time, default to around 9am or current time?
            // Let's just default to top if no match
            if (targetIndex === -1 && options.length > 0) {
                // Try to scroll to "09:00" as a reasonable default if empty?
                // Or just 0
                targetIndex = options.findIndex(o => o.value === "09:00")
                if (targetIndex === -1) targetIndex = 0
            }

            if (targetIndex >= 0) {
                const item = listRef.current.children[targetIndex] as HTMLElement
                if (item) {
                    // Center the item
                    // using setTimeout to ensure layout is done
                    requestAnimationFrame(() => {
                        if (!listRef.current || !item) return
                        const itemTop = item.offsetTop
                        const listHeight = listRef.current.clientHeight
                        const itemHeight = item.clientHeight
                        listRef.current.scrollTop = itemTop - (listHeight / 2) + (itemHeight / 2)
                    })
                }
            }
        }
    }, [isOpen, value, options])

    const parseAndCommit = (text: string) => {
        if (!text) return

        let normalized = text.toLowerCase().trim()
        let hours = 0
        let minutes = 0
        let isPm = normalized.includes('pm') || normalized.includes('p') // Allow 'p' as shorthand
        let isAm = normalized.includes('am') || normalized.includes('a')

        // Remove am/pm
        normalized = normalized.replace(/([ap]\.?m?\.?)/g, '').trim()

        if (normalized.includes(':')) {
            const parts = normalized.split(':')
            hours = parseInt(parts[0], 10)
            minutes = parseInt(parts[1], 10)
        } else {
            // Handle "1430" -> 14:30
            if (normalized.length === 3) {
                // 930 -> 9:30
                hours = parseInt(normalized.substring(0, 1), 10)
                minutes = parseInt(normalized.substring(1), 10)
            } else if (normalized.length === 4) {
                // 1430 -> 14:30
                hours = parseInt(normalized.substring(0, 2), 10)
                minutes = parseInt(normalized.substring(2), 10)
            } else {
                // "2" -> 2:00
                hours = parseInt(normalized, 10)
            }
        }

        if (isNaN(hours) || isNaN(minutes)) return

        // Handle 12-hour logic
        if (isPm && hours < 12) hours += 12
        if (isAm && hours === 12) hours = 0

        // Edge case: User types "12" -> implies 12 PM usually, unless "12am" specified? 
        // Standard convention: 12 is 12 PM. 
        // If they type "5", do they mean 5 AM or 5 PM? Calendar apps usually guess. 
        // For now, let's assume they mean strict 24h if they type > 12, or just raw hours < 12 is AM.
        // Improvements: Context aware? (if event starts 2pm, typing 3 means 3pm?) -> Out of scope for now.

        // Validation
        if (hours < 0) hours = 0
        if (hours > 23) hours = 23
        if (minutes < 0) minutes = 0
        if (minutes > 59) minutes = 59

        const newValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

        // Only trigger change if different
        if (newValue !== value) {
            onChange(newValue)
        } else {
            // Force re-render of label if parsing resulted in same value but messy input
            const date = new Date()
            date.setHours(hours, minutes)
            setInputValue(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }))
        }
    }

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => {
                        setTimeout(() => {
                            if (skipBlurCommitRef.current) {
                                skipBlurCommitRef.current = false
                                return
                            }
                            parseAndCommit(inputValue)
                        }, 100)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            parseAndCommit(inputValue)
                            setIsOpen(false)
                            inputRef.current?.blur()
                        }
                    }}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-center",
                        "bg-white dark:bg-slate-800",
                        isOpen
                            ? "border-brand-500 ring-2 ring-brand-500/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500",
                        "text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    )}
                />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                    >
                        <ul
                            ref={listRef}
                            className="max-h-[200px] overflow-y-auto py-1 text-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        >
                            {options.map((option) => (
                                <li
                                    key={option.value}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        skipBlurCommitRef.current = true
                                        setInputValue(option.label)
                                        onChange(option.value)
                                        setIsOpen(false)
                                        inputRef.current?.blur()
                                    }}
                                    className={clsx(
                                        "relative cursor-pointer select-none py-2.5 pl-3 pr-3 text-center transition-colors",
                                        option.value === value
                                            ? "bg-brand-50 text-brand-900 dark:bg-brand-900/20 dark:text-brand-100 font-semibold"
                                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                    )}
                                >
                                    <span className="block whitespace-nowrap">{option.label}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
