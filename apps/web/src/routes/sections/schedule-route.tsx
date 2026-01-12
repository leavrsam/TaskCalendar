import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, NavLink, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { DndProvider, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Context for child components to access schedule state (bypassing RBC props limitation)
type ScheduleContextType = {
  setSelectedEventId: (id: string | null) => void
  events: TaskEvent[]
}
const ScheduleContext = createContext<ScheduleContextType>({
  setSelectedEventId: () => { },
  events: []
})
const useScheduleContext = () => useContext(ScheduleContext)

import { addMonths, subMonths, format, startOfWeek, addDays, subDays, addWeeks, subWeeks, isToday, startOfDay } from 'date-fns'
import type { View } from 'react-big-calendar'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useLongPress } from 'use-long-press'
import { CustomDragLayer } from '@/components/calendar/custom-drag-layer'
import { AnimatePresence, motion } from 'framer-motion'

// ... (imports)




const DnDCalendar = withDragAndDrop<TaskEvent, TaskEvent>(Calendar)

import type { Task } from '@taskcalendar/core'

import { ChevronLeft, ChevronRight, Menu, ChevronDown } from 'lucide-react'
import { SwipeableMiniCalendar } from '@/components/calendar/swipeable-mini-calendar'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { TaskFAB } from '@/components/fab/task-fab'
import { TaskBottomSheet } from '@/components/tasks/task-bottom-sheet'

import { isOverdueEvent } from '@/components/calendar/event-badge.utils'
import {
  useTaskEvents,
  useTasksQuery,
  useUpdateTask,
  useUpdateRecurringInstance,
  type TaskEvent,
} from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import { calendarLocalizer } from '@/lib/calendar'
import { useAuth } from '@/hooks/use-auth'
import { EventModal } from '@/components/calendar/event-modal'
import { useCalendarStore } from '@/stores/calendar-store'

const CustomDateHeader = ({ date }: any) => {
  return (
    <div className="flex flex-col items-center py-2 pb-2">
      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-none mb-1">{format(date, 'EEE')}</span>
      <div className={clsx(
        "flex items-center justify-center h-9 w-9 rounded-full text-2xl font-normal transition-colors",
        isToday(date)
          ? "bg-brand-600 text-white shadow-md"
          : "text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}>
        {format(date, 'd')}
      </div>
    </div>
  )
}

const DayViewHeader = ({ date }: any) => {
  const { events, setSelectedEventId } = useScheduleContext()

  const dayEvents = useMemo(() => {
    const startOfHeaderDay = startOfDay(date)


    return events.filter(e => {
      // Only show actual all-day events
      if (!e.allDay) return false

      const eventStart = startOfDay(e.start)
      const eventEnd = startOfDay(e.end)

      return (eventStart <= startOfHeaderDay && eventEnd >= startOfHeaderDay)
    })
  }, [events, date])

  /* Portal Logic to lock date header into the Time Gutter Box */
  const [gutterNode, setGutterNode] = useState<Element | null>(null)

  useEffect(() => {
    // Locate the Time Gutter element in the header row
    const gutter = document.querySelector('.rbc-time-header-gutter')
    if (gutter) {
      // Force relative positioning on the gutter so we can absolute center inside it if needed
      // Or just append to it. React Portal appends.
      // We might need to clear existing text content if any? Usually it's empty space.
      // Actually RBC renders a label there sometimes.
      setGutterNode(gutter)
    }
  }, [])

  return (
    <div className="flex items-start gap-4 p-2 h-full min-h-[60px] border-b border-slate-200 dark:border-slate-800">
      {/* Date Header: Rendered via Portal into the top-left Time Gutter Box */}
      {gutterNode && createPortal(
        <div className="flex flex-col items-center justify-center w-full h-full pt-4">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-none mb-1">{format(date, 'EEE')}</span>
          <div className={clsx(
            "flex items-center justify-center h-10 w-10 rounded-full text-2xl font-normal transition-colors",
            isToday(date)
              ? "bg-brand-600 text-white shadow-md"
              : "text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}>
            {format(date, 'd')}
          </div>
        </div>,
        gutterNode
      )}


      {/* All Day Events Section */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] no-scrollbar">
        {dayEvents.length > 0 ? (
          dayEvents.map(event => (
            <button
              key={event.id}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedEventId(event.id)
              }}
              className={clsx(
                "text-xs px-2 py-1 rounded-md text-left truncate transition-colors w-full border border-transparent hover:border-black/5 dark:hover:border-white/10",
                event.resource.isTask && event.resource.status === 'done' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 line-through opacity-70" :
                  event.resource.isTask && event.resource.status === 'inProgress' ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                    "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
                event.resource.isBackup && "opacity-40"
              )}
              title={event.title}
            >
              {event.title}
            </button>
          ))
        ) : (
          <div className="h-full flex items-center">
            <span className="text-xs text-slate-400 italic px-2">No all-day events</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ScheduleRoute() {
  const { user } = useAuth()
  const { toggleSidebar, isSidebarOpen } = useOutletContext<{ toggleSidebar: () => void; isSidebarOpen: boolean }>()

  // Define weekAnchor first so it can be used for windowed event loading
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const [weekAnchor, setWeekAnchor] = useState(weekStart)

  const tasksQuery = useTasksQuery()
  // Pass weekAnchor to useTaskEvents for windowed loading (±1 month around anchor)
  const eventsQuery = useTaskEvents(weekAnchor)
  const updateTask = useUpdateTask()
  const updateRecurringInstance = useUpdateRecurringInstance()
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])

  // View state
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all')
  const [view, setView] = useState<View>(window.innerWidth < 768 ? 'day' : 'week')

  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)

  const [creationSlot, setCreationSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Import State from Store
  // Legacy importedEvents removed - Firestore is now sole source of truth
  const googleAccessToken = useCalendarStore((state) => state.googleAccessToken)

  const filteredTasks = useMemo(() => {
    // ... logic remains
    if (filter === 'all') return tasks
    return tasks.filter((task) => task.status === filter)
  }, [tasks, filter])

  // Sync with URL params
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view') as View | null

    if (dateParam) {
      const newDate = new Date(dateParam)
      if (!isNaN(newDate.getTime())) {
        setWeekAnchor(newDate)
      }
    }

    if (viewParam && ['day', 'week', 'month', 'agenda'].includes(viewParam)) {
      setView(viewParam)
    }
  }, [searchParams])

  // (Deleted Client-Side Fetch)

  // DEV ONLY: Simulate Webhook on Localhost
  useEffect(() => {
    if (window.location.hostname === 'localhost' && googleAccessToken) {
      const simulateSync = async () => {
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const { getApp } = await import('firebase/app');
          const functions = getFunctions(getApp());
          // Only trigger if we are unsure, but user asked 'always refreshes when I open it'
          // This effect runs on mount (and token change).
          const simulate = httpsCallable(functions, 'simulateWebhookEvent');
          await simulate();
          console.log('[DEV] Simulated Google Sync Triggered');
        } catch (error) {
          console.warn('[DEV] Failed to simulate sync (Function might not be ready)', error);
        }
      }
      simulateSync()
    }
  }, [googleAccessToken])

  const selectedEvent = useMemo(
    () => eventsQuery.events.find((e) => e.id === selectedEventId) ?? null,
    [eventsQuery.events, selectedEventId],
  )

  // Handle navigation based on view
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (view === 'day') setWeekAnchor(subDays(weekAnchor, 1))
      else if (view === 'week' || view === 'agenda') setWeekAnchor(subWeeks(weekAnchor, 1))
      else setWeekAnchor(subMonths(weekAnchor, 1))
    } else {
      if (view === 'day') setWeekAnchor(addDays(weekAnchor, 1))
      else if (view === 'week' || view === 'agenda') setWeekAnchor(addWeeks(weekAnchor, 1))
      else setWeekAnchor(addMonths(weekAnchor, 1))
    }
  }

  // Default to 4px per 5-min slot (compact but readable, similar to Google Calendar)
  const [timeSlotHeight, setTimeSlotHeight] = useState(4)
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null)
  const [initialHeight, setInitialHeight] = useState(5)

  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.sqrt(
      Math.pow(touch2.clientY - touch1.clientY, 2) +
      Math.pow(touch2.clientX - touch1.clientX, 2)
    )
  }



  const [touchStart, setTouchStart] = useState<number | null>(null)

  const onCalendarTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches)
      setInitialPinchDistance(distance)
      setInitialHeight(timeSlotHeight)
    } else if (e.touches.length === 1) {
      setTouchStart(e.touches[0].clientX)
    }
  }

  const onCalendarTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = getDistance(e.touches)
      const scale = currentDistance / initialPinchDistance
      // Min 3px (36px/hr), Max 20px (240px/hr)
      const newHeight = Math.min(Math.max(initialHeight * scale, 3), 20)
      setTimeSlotHeight(newHeight)
    }
  }

  const onCalendarTouchEnd = (e: React.TouchEvent) => {
    setInitialPinchDistance(null)

    // Handle Swipe
    if (touchStart !== null && e.changedTouches.length === 1) {
      const touchEnd = e.changedTouches[0].clientX
      const diff = touchStart - touchEnd
      if (Math.abs(diff) > 50) { // Threshold 50px
        if (diff > 0) handleNavigate('next')
        else handleNavigate('prev')
      }
      setTouchStart(null)
    }
  }

  return (
    <ScheduleContext.Provider value={{ setSelectedEventId, events: eventsQuery.events }}>
      <DndProvider backend={HTML5Backend}>
        <div className="flex h-screen flex-col overflow-x-hidden">
          {/* Header */}
          <header className={`flex items-center justify-between gap-2 bg-white dark:bg-neutral-900 p-2 pr-3 flex-shrink-0 transition-all h-14 sm:h-16 relative z-20 ${!isSidebarOpen ? 'pl-2' : 'pl-3'}`}>
            {/* Left: Menu, Nav, Date */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Menu button - Only visible if sidebar is closed */}
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 flex-shrink-0"
                  title="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 flex-shrink-0"
                onClick={() => setWeekAnchor(new Date())}
              >
                Today
              </button>
              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  onClick={() => handleNavigate('prev')}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  onClick={() => handleNavigate('next')}
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Month Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsMiniCalendarOpen(!isMiniCalendarOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <h2 className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {format(weekAnchor, 'MMMM')}
                  </h2>
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 text-slate-500 transition-transform duration-200",
                      isMiniCalendarOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown Content */}
                <AnimatePresence>
                  {isMiniCalendarOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 z-50 w-[320px] shadow-2xl rounded-xl ring-1 ring-black/5"
                    >
                      <SwipeableMiniCalendar onClose={() => setIsMiniCalendarOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: View toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {(['day', 'week', 'agenda']).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v as View)}
                    className={clsx(
                      'px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all capitalize',
                      view === v
                        ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    )}
                  >
                    {v}
                  </button>
                ))}
                <button
                  onClick={() => setIsTaskSheetOpen(true)}
                  className={clsx(
                    'px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all capitalize',
                    // Highlight if open? Or just standard button? Standard button style usually, but since it's an action not a view state, maybe distinct?
                    // Let's keep it consistent with other tabs but active state logic doesn't apply directly to `view`.
                    isTaskSheetOpen
                      ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  )}
                >
                  Tasks
                </button>
              </div>
              <div className="hidden sm:block">
                <NavLink to="/settings">
                  <CollaboratorAvatar
                    collaborator={{
                      uid: user?.uid ?? 'me',
                      email: user?.email ?? '',
                      label: user?.displayName || user?.email || 'You',
                    }}
                    size="sm"
                    photoURL={user?.photoURL ?? undefined}
                  />
                </NavLink>
              </div>
            </div>
          </header>

          {/* Corner fill to eliminate gap caused by rounded-tl-3xl */}
          <div className="absolute left-0 top-14 sm:top-16 h-8 w-8 bg-white dark:bg-neutral-900 z-0" />

          {/* Full-screen Calendar Card */}
          <div
            className="flex-1 overflow-hidden relative rounded-tl-3xl bg-slate-100 dark:bg-zinc-900"
            onTouchStart={onCalendarTouchStart}
            onTouchMove={onCalendarTouchMove}
            onTouchEnd={onCalendarTouchEnd}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const zoomIntensity = 0.01
                // Min 3px, Max 20px
                const newHeight = Math.min(Math.max(timeSlotHeight - e.deltaY * zoomIntensity, 3), 20)
                setTimeSlotHeight(newHeight)
              }
            }}
          >
            <AgendaBoard
              events={eventsQuery.events}
              isLoading={eventsQuery.isLoading}
              view={view}
              onView={setView}
              onSlotSelect={(slot) => {
                setCreationSlot(slot)
              }}
              onEventMove={({ id, start, end }) => {
                const event = eventsQuery.events.find((e) => e.id === id)
                if (!event) return

                if (event.resource.recurrence || event.resource.recurringEventId) {
                  void updateRecurringInstance.mutateAsync({
                    id,
                    data: {
                      scheduledStart: start.toISOString(),
                      scheduledEnd: end.toISOString(),
                    },
                    originalTask: event.resource,
                  })
                } else {
                  void updateTask.mutateAsync({
                    id,
                    data: {
                      scheduledStart: start.toISOString(),
                      scheduledEnd: end.toISOString(),
                    },
                  })
                }
              }}
              draggingTask={
                dragTaskId ? tasks.find((task) => task.id === dragTaskId) ?? null : null
              }
              onOutsideDropComplete={() => setDragTaskId(null)}
              anchorDate={weekAnchor}
              onAnchorChange={setWeekAnchor}
              timeSlotHeight={timeSlotHeight}
              onEventClick={(event) => setSelectedEventId(event.id)}
            />
          </div>

          {/* Task FAB (Now Add Event FAB) */}
          <TaskFAB
            onClick={() => {
              // Default to next hour block
              const now = new Date()
              now.setMinutes(0, 0, 0)
              const start = new Date(now.getTime() + 60 * 60 * 1000) // Next hour
              const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour duration
              setCreationSlot({ start, end })
            }}
          />

          {/* Task Bottom Sheet */}
          <TaskBottomSheet
            isOpen={isTaskSheetOpen}
            onClose={() => setIsTaskSheetOpen(false)}
            tasks={filteredTasks}
            filter={filter}
            onFilterChange={setFilter}
            loading={tasksQuery.isLoading}
            onDragTaskChange={setDragTaskId}
          />

          {creationSlot && (
            <EventModal
              isOpen={true}
              slot={creationSlot}
              onClose={() => setCreationSlot(null)}
            />
          )}

          {selectedEvent && (
            <EventModal
              isOpen={true}
              event={selectedEvent}
              onClose={() => setSelectedEventId(null)}
            />
          )}

        </div>
      </DndProvider >
    </ScheduleContext.Provider >
  )
}

type AgendaBoardProps = {
  events: ReturnType<typeof useTaskEvents>['events']
  isLoading: boolean
  view: View
  onView: (view: View) => void
  onSlotSelect: (slot: { start: Date; end: Date }) => void
  onEventMove: (event: { id: string; start: Date; end: Date }) => void
  onEventClick: (event: TaskEvent) => void
  draggingTask: Task | null
  onOutsideDropComplete: () => void
  anchorDate: Date
  onAnchorChange: (date: Date) => void
  timeSlotHeight: number
}

// Context for callbacks to avoid prop drilling through RBC components
type CalendarActionsContextType = {
  onSlotSelect: (slot: { start: Date; end: Date }) => void
}
const CalendarActionsContext = createContext<CalendarActionsContextType>({
  onSlotSelect: () => { }
})
const useCalendarActions = () => useContext(CalendarActionsContext)

// Stable TimeSlotWrapper component defined OUTSIDE the render loop
const TimeSlotWrapper = ({ children, value }: any) => {
  const { onSlotSelect } = useCalendarActions()

  // Magnetic Snapping Logic
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'event', // RBC default type
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [])

  const bind = useLongPress(() => {
    if (navigator.vibrate) navigator.vibrate(50)
    const start = value
    const end = new Date(start.getTime() + 5 * 60 * 1000)
    onSlotSelect({ start, end })
  }, { threshold: 400, captureEvent: true })

  const combinedRef = (element: HTMLDivElement) => {
    drop(element)
  }

  return (
    <div
      ref={combinedRef}
      {...bind()}
      className={clsx(
        "rbc-time-slot h-full w-full transition-colors duration-200",
        isOver && "bg-brand-500/20 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.5)]" // Magnetic glow
      )}
    >
      {children}
    </div>
  )
}

function AgendaBoard({
  events,
  view,
  onView,
  onSlotSelect,
  onEventMove,
  onEventClick,
  draggingTask,
  onOutsideDropComplete,
  anchorDate,
  onAnchorChange,
  timeSlotHeight,
}: AgendaBoardProps) {
  const scrollToTime = useMemo(() => new Date(), [])

  // Memoize actions context value
  const actionsContextValue = useMemo(() => ({ onSlotSelect }), [onSlotSelect])

  const dragPreviewEvent = useMemo(() => {
    if (!draggingTask) return null
    const now = new Date()
    return {
      id: draggingTask.id,
      title: draggingTask.title,
      start: now,
      end: new Date(now.getTime() + 60 * 60 * 1000),
      resource: draggingTask,
    }
  }, [draggingTask])

  const { step, timeslots } = useMemo(() => {
    // We set step to 15 to ensure dragging is always precise to 15 minutes.
    // We adjust timeslots (rows per major slot) to control visual density of time labels.
    // High zoom: 15min major slots (15*1)
    if (timeSlotHeight >= 15) return { step: 15, timeslots: 1 }
    // Medium zoom: 30min major slots (15*2)
    if (timeSlotHeight >= 8) return { step: 15, timeslots: 2 }
    // Low zoom: 60min major slots (15*4)
    return { step: 15, timeslots: 4 }
  }, [timeSlotHeight])

  // Track direction for animation
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [prevDate, setPrevDate] = useState(anchorDate)

  if (anchorDate !== prevDate) {
    if (anchorDate > prevDate) setDirection('right')
    else setDirection('left')
    setPrevDate(anchorDate)
  }

  const variants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as const,
    }),
    center: {
      x: 0,
      opacity: 1,
      zIndex: 1,
      position: 'relative' as const,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? '-100%' : '100%',
      opacity: 0,
      zIndex: 0,
      position: 'absolute' as const,
    }),
  }

  // Memoize components object so it's stable across renders
  // IMPORTANT: Dependencies must be minimal to prevent re-creation
  const components = useMemo(() => ({
    event: CalendarEvent,
    timeSlotWrapper: TimeSlotWrapper,
    header: view === 'day' ? DayViewHeader : CustomDateHeader,
  }), [view])

  // Memoize the dynamic style content to avoid recalculation
  const dynamicStyle = useMemo(() => `
            .rbc-time-slot {
              min-height: ${timeSlotHeight * (step / 5)}px !important;
              border-top: none !important;
            }
            .rbc-timeslot-group {
              min-height: ${timeSlotHeight * (step / 5)}px !important;
              border-bottom: 1px solid rgba(226, 232, 240, 0.4) !important; /* light border for sub-slots */
            }
            
            /* Day View Specific Overrides */
            .day-view-mode .rbc-allday-cell {
              display: none !important;
            }
            .day-view-mode .rbc-time-header-cell {
              display: block !important;
            }
            .day-view-mode .rbc-time-header-content {
              border-left: none !important;
              margin-left: 0 !important;
            }
            .day-view-mode .rbc-time-header {
               min-height: 80px !important;
            }
            .day-view-mode .rbc-header {
              padding: 0 !important;
              height: 100% !important; 
              overflow: visible !important;
              border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
              width: 100% !important;
            }
            .day-view-mode .rbc-time-header.rbc-overflowing-header {
                margin-right: 0 !important;
            }
            .dark .day-view-mode .rbc-header {
              border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important;
            }
            
            /* Darker border for hour lines (every 2nd at 30m, every 4th at 15m) */
            ${step === 30 ? `
              .rbc-timeslot-group:nth-child(2n) { border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important; }
              .dark .rbc-timeslot-group:nth-child(2n) { border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important; }
            ` : ''}
            ${step === 15 ? `
              .rbc-timeslot-group:nth-child(4n) { border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important; }
              .dark .rbc-timeslot-group:nth-child(4n) { border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important; }
            ` : ''}

            .dark .rbc-time-slot {
              border-top: none !important;
            }
            .dark .rbc-timeslot-group {
              border-bottom: 1px solid rgba(51, 65, 85, 0.2) !important;
            }
            .rbc-time-view {
              background: transparent !important;
              border: none !important;
            }
            .rbc-header {
              border-bottom: none !important;
              padding-bottom: 4px !important;
            }
            .rbc-allday-cell {
              height: auto !important;
              max-height: unset !important;
              border-left: none !important;
            }
            .rbc-allday-cell + .rbc-allday-cell {
              border-left: none !important;
            }
            .rbc-day-bg {
              border-left: none !important;
            }
            .rbc-day-bg + .rbc-day-bg {
              border-left: none !important;
            }
            .rbc-time-header-content {
              border-left: none !important;
            }
            /* Remove default header borders - we use header-cell borders instead */
            .rbc-header + .rbc-header {
              border-left: none !important;
            }
            .rbc-day-slot {
              background: transparent !important;
              border-left: none !important;
              position: relative !important;
            }
            /* Single continuous vertical line from top of calendar to bottom */
            .rbc-day-slot::before {
              content: '';
              position: absolute;
              left: 0;
              top: -200px; /* Extend up through header */
              bottom: 0;
              width: 1px;
              background: rgba(226, 232, 240, 0.4);
              z-index: 1;
            }
            .rbc-day-slot:first-child::before {
              display: none;
            }
            .dark .rbc-day-slot::before {
              background: rgba(51, 65, 85, 0.4);
            }
            .rbc-time-content {
              border-top: none !important;
              border: none !important;
              overflow: visible !important;
            }
            .rbc-time-gutter .rbc-timeslot-group {
              border-bottom: none !important;
            }
            /* Remove all header cell borders - pseudo-elements handle it */
            .rbc-time-header-cell {
              border-left: none !important;
            }
            .rbc-time-header-cell:first-child {
              border-left: none !important;
            }
            /* Remove gap between header and content sections */
            .rbc-time-header {
              margin-right: 0 !important;
            }
            .rbc-time-header-gutter {
              border-right: none !important;
            }
  `, [timeSlotHeight, step])

  return (
    <CalendarActionsContext.Provider value={actionsContextValue}>
      <div className={clsx("flex h-full flex-col", view === 'day' ? "day-view-mode" : "")}>
        {/* Removed redundant DndProvider - provided by parent ScheduleRoute */}
        <CustomDragLayer />
        <div className="h-full relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={anchorDate.toISOString() + view} // Transition when date or view changes
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="h-full w-full absolute inset-0 bg-slate-100 dark:bg-zinc-900" // Ensure background is opaque to hide content behind
            >
              <style>{dynamicStyle}</style>
              <DnDCalendar
                key={view}
                localizer={calendarLocalizer}
                events={events}
                view={view}
                onView={onView}
                date={anchorDate}
                onNavigate={onAnchorChange}
                toolbar={false}
                culture="en-US"
                step={step}
                timeslots={timeslots}
                popup
                resizable
                selectable
                style={{ height: '100%' }}
                formats={{
                  eventTimeRangeFormat: () => '',
                  timeGutterFormat: (date: Date, culture: any, localizer: any) => {
                    const stepVal = step; // capture value - force refresh
                    if (stepVal === 60) return localizer.format(date, 'h a', culture)
                    if (date.getMinutes() === 0) return localizer.format(date, 'h a', culture)
                    return localizer.format(date, 'mm', culture) // just minutes for sub-slots to save space
                  }
                }}
                components={components}

                eventPropGetter={(calendarEvent) =>
                  getCalendarEventStyles(calendarEvent as TaskEvent)
                }
                dragFromOutsideItem={
                  dragPreviewEvent ? (() => dragPreviewEvent) : undefined
                }
                onDropFromOutside={
                  draggingTask
                    ? ({ start: dropStart, end: dropEnd }) => {
                      onEventMove({
                        id: draggingTask.id,
                        start: dropStart as Date,
                        end: dropEnd as Date,
                      })
                      onOutsideDropComplete()
                    }
                    : undefined
                }
                onSelectSlot={(slotInfo) =>
                  onSlotSelect({
                    start: slotInfo.start as Date,
                    end: slotInfo.end as Date,
                  })
                }
                onSelectEvent={(event) => onEventClick(event as TaskEvent)}
                onEventDrop={({ event, start, end }) =>
                  onEventMove({
                    id: (event as TaskEvent).id,
                    start: start as Date,
                    end: end as Date,
                  })
                }
                onEventResize={({ event, start, end }) =>
                  onEventMove({
                    id: (event as TaskEvent).id,
                    start: start as Date,
                    end: end as Date,
                  })
                }
                scrollToTime={scrollToTime}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </CalendarActionsContext.Provider>
  )
}

export function CalendarEvent({ event }: { event: TaskEvent }) {
  const contactsQuery = useContactsQuery()
  const updateTask = useUpdateTask()
  const { setSelectedEventId } = useScheduleContext()

  const nextStatus = getNextStatus(event.resource.status)
  const contacts = contactsQuery.data ?? []

  // Handle multiple contacts
  const taskContactIds = event.resource.contactIds || (event.resource.contactId ? [event.resource.contactId] : [])
  const firstContact = taskContactIds.length > 0 ? contacts.find(c => c.id === taskContactIds[0]) : null
  const additionalContactsCount = Math.max(0, taskContactIds.length - 1)

  const handleToggleStatus = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
    clickEvent.stopPropagation()
    clickEvent.preventDefault()
    updateTask.mutate({
      id: event.resource.id,
      data: { status: nextStatus },
    })
  }

  // Calculate event duration in minutes
  const durationMinutes =
    ((event.end as Date).getTime() - (event.start as Date).getTime()) / (1000 * 60)
  const isSmallEvent = durationMinutes < 60 // Less than 1 hour

  // Get status-specific styling for the pill/circle button
  const getStatusPillStyle = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-500/90 border-slate-400'
      case 'inProgress':
        return 'bg-amber-500/90 border-amber-400'
      case 'done':
        return 'bg-emerald-500/90 border-emerald-400'
      default:
        return 'bg-slate-500/90 border-slate-400'
    }
  }

  // Compact layout for small events
  if (isSmallEvent) {
    // If very small (< 45 mins), only show title
    const showContact = durationMinutes >= 45

    return (
      <div
        className="flex h-full items-center justify-between gap-2 text-xs text-white cursor-pointer px-1"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedEventId(event.id)
        }}
      >
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
          {showContact && firstContact && (
            <p className="truncate text-[10px] opacity-90">
              {firstContact.name}
              {additionalContactsCount > 0 && ` +${additionalContactsCount}`}
            </p>
          )}
        </div>
        {!showContact && event.resource.isTask && (
          <button
            type="button"
            onClick={handleToggleStatus}
            className="group relative -m-2 p-2 focus:outline-none"
            aria-label="Toggle task status"
          >
            <div className={clsx(
              'h-3 w-3 rounded-full border transition-colors',
              getStatusPillStyle(event.resource.status)
            )} />
          </button>
        )}
        {showContact && event.resource.isTask && (
          <button
            type="button"
            onClick={handleToggleStatus}
            className="group relative -m-2 p-2 focus:outline-none"
            aria-label="Toggle task status"
          >
            <div className={clsx(
              'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
              getStatusPillStyle(event.resource.status)
            )}>
              {event.resource.status === 'done' && <span className="text-[10px]">✓</span>}
            </div>
          </button>
        )}
      </div>
    )
  }

  // Full layout for larger events
  return (
    <div
      className="flex h-full flex-col gap-0.5 text-xs text-white cursor-pointer px-2 py-1"
      onClick={(e) => {
        e.stopPropagation()
        setSelectedEventId(event.id)
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold leading-tight pt-0.5">{event.title}</p>
        {event.resource.isTask && (
          <button
            type="button"
            onClick={handleToggleStatus}
            className="group relative -m-2 p-2 focus:outline-none"
            aria-label="Toggle task status"
          >
            <div className={clsx(
              'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
              getStatusPillStyle(event.resource.status)
            )}>
              {event.resource.status === 'done' && <span className="text-[10px]">✓</span>}
            </div>
          </button>
        )}
      </div>
      {firstContact && (
        <p className="truncate text-[10px] opacity-90">
          👤 {firstContact.name}
          {additionalContactsCount > 0 && ` +${additionalContactsCount}`}
        </p>
      )}
      {durationMinutes > 60 && event.resource.address && (
        <p className="truncate text-[10px] opacity-75">
          📍 {event.resource.address}
        </p>
      )}
    </div>
  )
}

// Helper functions
const getNextStatus = (status: Task['status']): Task['status'] => {
  switch (status) {
    case 'todo':
      return 'inProgress'
    case 'inProgress':
      return 'done'
    default:
      return 'todo'
  }
}

const getCalendarEventStyles = (event: TaskEvent) => {
  // Use custom color if available, otherwise use a default brand color
  const baseColor = event.resource.color ?? 'rgba(99, 102, 241, 0.7)' // Indigo default

  // Convert hex to rgba if needed, or just use the color
  // Simple heuristic: if it starts with #, make it translucent. 
  // Ideally we'd use a color lib, but string manipulation is fine for a quick fix.
  const glassColor = baseColor.startsWith('#')
    ? baseColor + 'B3' // 70% opacity approx for hex
    : baseColor

  const overdue = isOverdueEvent(event.resource)

  return {
    style: {
      backgroundColor: glassColor,
      // Removed backdropFilter/WebkitBackdropFilter to fix visibility issues
      transform: 'translateZ(0)', // Force hardware acceleration for immediate render
      border: overdue ? '2px solid rgba(239, 68, 68, 0.8)' : '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      padding: '2px 4px',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      opacity: event.resource.isBackup ? 0.4 : 1,
      fontWeight: 500,
      fontSize: '12px',
      alignItems: 'flex-start',
      overflow: 'hidden',
    },
  }
}
