import { useState, useRef, useEffect } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { motion, useMotionValue, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { MonthGrid } from './month-grid'
import { useTaskEvents } from '@/features/tasks/api'
import { useNavigate } from 'react-router-dom'

interface SwipeableMiniCalendarProps {
    className?: string
    onClose?: () => void
}

export function SwipeableMiniCalendar({ className, onClose }: SwipeableMiniCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const { events } = useTaskEvents(currentMonth) // Pass anchor date so windowed loading works
    const navigate = useNavigate()
    const containerRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)

    // Measure width for drag constraints and snap points
    useEffect(() => {
        if (containerRef.current) {
            setWidth(containerRef.current.offsetWidth)
        }
    }, [])

    const x = useMotionValue(0)

    const handleDragEnd = async (_: any, info: PanInfo) => {
        const offset = info.offset.x
        const velocity = info.velocity.x
        const threshold = width / 3

        // Determine direction: Next (left swipe), Prev (right swipe), or Stay
        let direction = 0 // 0: stay, 1: prev, -1: next

        if (offset > threshold || velocity > 500) {
            direction = 1 // Prev
        } else if (offset < -threshold || velocity < -500) {
            direction = -1 // Next
        }

        // Animate to snap point
        const targetX = direction * width

        // We just animate the x value to the target
        await animate(x, targetX, { type: "spring", stiffness: 300, damping: 30 }).finished

        if (direction !== 0) {
            // Update state and reset x instantly
            setCurrentMonth(prev => direction === 1 ? subMonths(prev, 1) : addMonths(prev, 1))
            x.set(0)
        }
    }

    // Handlers
    const handleDateSelect = (date: Date) => {
        navigate(`/schedule?date=${date.toISOString()}`)
        onClose?.()
    }
    const handleDateDoubleClick = (date: Date) => {
        navigate(`/schedule?date=${date.toISOString()}&view=day`)
        onClose?.()
    }

    // Render 3 months: Prev (-1), Current (0), Next (+1)
    const months = [
        { date: subMonths(currentMonth, 1), offset: -width },
        { date: currentMonth, offset: 0 },
        { date: addMonths(currentMonth, 1), offset: width }
    ]

    return (
        <div ref={containerRef} className={`overflow-hidden relative h-[320px] bg-slate-100 dark:bg-zinc-900 rounded-b-xl shadow-xl ${className}`}>
            {/* If width is 0, we can't render correctly yet, but we render 1 to init? */}
            <motion.div
                className="flex h-full absolute top-0 left-0 items-start"
                style={{ x, left: '-100%', width: '300%' }} // Position so 'Current' (index 1) is in middle
                drag="x"
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                // Constraints to prevent dragging too far beyond prev/next
                dragConstraints={{ left: -width, right: width }}
            >
                {months.map((month, i) => (
                    <div
                        key={month.date.toISOString()}
                        className="w-1/3 flex-shrink-0 p-4"
                        aria-hidden={i !== 1} // Hide adjacent months from SR?
                    >
                        <MonthGrid
                            currentMonth={month.date}
                            events={events}
                            onDateSelect={handleDateSelect}
                            onDateDoubleClick={handleDateDoubleClick}
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    )
}
