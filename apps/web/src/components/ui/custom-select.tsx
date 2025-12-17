import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export type Option = {
    label: string
    value: string
}

type CustomSelectProps = {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    className?: string
}

export function CustomSelect({ value, onChange, options, placeholder = "Select...", className }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const selectedOption = options.find(o => o.value === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Scroll to selected item when opening
    useEffect(() => {
        if (isOpen && listRef.current && value) {
            const index = options.findIndex(o => o.value === value)
            if (index >= 0) {
                const item = listRef.current.children[index] as HTMLElement
                if (item && listRef.current) {
                    // Use scrollTop for hidden scrollbar compatibility
                    const itemTop = item.offsetTop
                    const listHeight = listRef.current.clientHeight
                    const itemHeight = item.clientHeight
                    listRef.current.scrollTop = itemTop - (listHeight / 2) + (itemHeight / 2)
                }
            }
        }
    }, [isOpen, value, options])

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex w-full items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20",
                    isOpen
                        ? "border-brand-500 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-brand-500 dark:hover:border-brand-500"
                )}
            >
                <span className={clsx("block whitespace-nowrap", !selectedOption && "text-slate-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                    >
                        {/* Max height for ~5 items (each item ~40px) -> 200px */}
                        <ul
                            ref={listRef}
                            className="max-h-[200px] overflow-y-auto py-1 text-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        >
                            {options.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={clsx(
                                        "relative cursor-pointer select-none py-2.5 pl-3 pr-9 transition-colors",
                                        option.value === value
                                            ? "bg-brand-50 text-brand-900 dark:bg-brand-900/20 dark:text-brand-100"
                                            : "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700/50"
                                    )}
                                >
                                    <span className="block whitespace-nowrap font-medium">{option.label}</span>
                                    {option.value === value && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-600 dark:text-brand-400">
                                            <Check className="h-4 w-4" />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
