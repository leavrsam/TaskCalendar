import { createContext, useContext, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { DndProvider, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Context for child components to access schedule state (bypassing RBC props limitation)
type ScheduleContextType = {
  setSelectedEventId: (id: string | null) => void
}
const ScheduleContext = createContext<ScheduleContextType>({ setSelectedEventId: () => { } })
const useScheduleContext = () => useContext(ScheduleContext)

import { addMonths, subMonths, format, startOfWeek, addDays, subDays, addWeeks, subWeeks, isToday } from 'date-fns'
import type { View } from 'react-big-calendar'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useLongPress } from 'use-long-press'
import { CustomDragLayer } from '@/components/calendar/custom-drag-layer'

const DnDCalendar = withDragAndDrop<TaskEvent, TaskEvent>(Calendar)

import type { Task } from '@taskcalendar/core'

import { Menu, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { TaskFAB } from '@/components/fab/task-fab'
import { TaskBottomSheet } from '@/components/tasks/task-bottom-sheet'

import { isOverdueEvent } from '@/components/calendar/event-badge.utils'
import {
  useCreateTask,
  useTaskEvents,
  useTasksQuery,
  useUpdateTask,
  useUpdateRecurringInstance,
  type TaskEvent,
} from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import { calendarLocalizer } from '@/lib/calendar'
import { useAuth } from '@/hooks/use-auth'
import { CreationModal } from '@/components/calendar/creation-modal'
import { EventActionSheet } from '@/routes/sections/event-action-sheet'

const CustomDateHeader = ({ date, label, localizer }: any) => {
  return (
    <div className="flex flex-col items-center py-2">
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

export function ScheduleRoute() {
  const { user } = useAuth()
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>()

  const tasksQuery = useTasksQuery()
  const eventsQuery = useTaskEvents()
  const updateTask = useUpdateTask()
  const updateRecurringInstance = useUpdateRecurringInstance()
  const createTask = useCreateTask()
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])

  // View state
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all')
  const [view, setView] = useState<View>(window.innerWidth < 768 ? 'agenda' : 'week')

  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)

  const [creationSlot, setCreationSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter((task) => task.status === filter)
  }, [tasks, filter])

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const [weekAnchor, setWeekAnchor] = useState(weekStart)

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

  // Pinch-to-zoom for vertical calendar scaling
  // Default to 5px per 5-min slot (which is 60px per hour - good density)
  const [timeSlotHeight, setTimeSlotHeight] = useState(5)
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
    <ScheduleContext.Provider value={{ setSelectedEventId }}>
      <DndProvider backend={HTML5Backend}>
        <div className="flex h-screen flex-col">
          {/* Header */}
          <header className="flex flex-col gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 pl-4 flex-shrink-0 transition-all">
            {/* Left: Menu, Title, Nav, Date */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h1 className="hidden text-xl font-semibold text-slate-900 dark:text-slate-50 sm:block">
                    TaskCalendar
                  </h1>
                </div>
                <div className="ml-8 flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded border border-slate-300 dark:border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setWeekAnchor(new Date())}
                  >
                    Today
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      onClick={() => handleNavigate('prev')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      onClick={() => handleNavigate('next')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <h2 className="ml-2 text-xl font-medium text-slate-700 dark:text-slate-200">
                    {format(weekAnchor, 'MMMM yyyy')}
                  </h2>
                </div>
              </div>

              {/* Right: View dropdown and Avatar */}
              <div className="flex items-center gap-3 mr-4">
                {/* View Segmented Control (Mobile/Desktop adaptive) */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  {(['day', 'week', 'agenda'] as View[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={clsx(
                        'px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
                        view === v
                          ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm scale-105'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="ml-1">
                  <CollaboratorAvatar
                    collaborator={{
                      uid: user?.uid ?? 'me',
                      email: user?.email ?? '',
                      label: user?.displayName || user?.email || 'You',
                    }}
                    size="md"
                    photoURL={user?.photoURL ?? undefined}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Full-screen Calendar */}
          <div
            className="flex-1 overflow-hidden relative"
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

          {/* Task FAB */}
          <TaskFAB
            taskCount={tasks.length}
            onClick={() => setIsTaskSheetOpen(true)}
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
            <CreationModal
              slot={creationSlot}
              onClose={() => {
                setCreationSlot(null)
              }}
              onSave={async (values) => {
                if (!creationSlot) return
                await createTask.mutateAsync({
                  ...values,
                  ...(values.contactId ? { contactId: values.contactId } : {}),
                  scheduledStart: creationSlot.start.toISOString(),
                  scheduledEnd: creationSlot.end.toISOString(),
                  dueAt: creationSlot.end.toISOString(),
                })
                setCreationSlot(null)
              }}
            />
          )}
          <EventActionSheet
            event={selectedEvent}
            onClose={() => setSelectedEventId(null)}
          />
        </div>
      </DndProvider>
    </ScheduleContext.Provider>
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

function AgendaBoard({
  events,
  isLoading,
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

  const TimeSlotWrapper = ({ children, value }: any) => {
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
      // Any other refs if needed
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

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
        <div className="h-full">
          <style>
            {`
            .rbc-time-slot {
              min-height: ${timeSlotHeight}px !important;
              border-top: none !important; 
            }
            .rbc-timeslot-group {
              min-height: ${timeSlotHeight * 12}px !important; /* 12 slots of 5 mins = 60 mins */
              border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important; /* light slate border */
            }
            .dark .rbc-timeslot-group {
              border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important;
            }
            .rbc-time-view {
              background: transparent !important;
              border: none !important;
            }
            .rbc-header {
                border-bottom: none !important;
                border: none !important;
            }
            .rbc-time-header-content {
                border-left: 1px solid rgba(226, 232, 240, 0.4) !important;
            }
            .dark .rbc-time-header-content {
                border-left: 1px solid rgba(51, 65, 85, 0.4) !important;
            }
            .rbc-day-slot {
              background: transparent !important;
              border-left: 1px solid rgba(226, 232, 240, 0.4) !important;
            }
            .dark .rbc-day-slot {
              border-left: 1px solid rgba(51, 65, 85, 0.4) !important;
            }
            .rbc-time-content {
               border-top: none !important;
               border: none !important;
            }
            .rbc-time-gutter .rbc-timeslot-group {
                border-bottom: none !important;
            }
          `}
          </style>
          <DnDCalendar
            localizer={calendarLocalizer}
            events={events}
            view={view}
            onView={onView}
            date={anchorDate}
            onNavigate={onAnchorChange}
            toolbar={false}
            culture="en-US"
            step={15}
            timeslots={4}
            popup
            resizable
            selectable
            style={{ height: '100%' }}
            formats={{
              eventTimeRangeFormat: () => '',
            }}
            components={{
              event: CalendarEvent,
              timeSlotWrapper: TimeSlotWrapper,
              header: CustomDateHeader,
            }}

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
        </div>
      </DndProvider>
    </div>
  )
}

export function CalendarEvent({ event }: { event: TaskEvent }) {
  const contactsQuery = useContactsQuery()
  const updateTask = useUpdateTask()
  const { setSelectedEventId } = useScheduleContext()

  const nextStatus = getNextStatus(event.resource.status)
  const contacts = contactsQuery.data ?? []
  const contact = event.resource.contactId
    ? contacts.find((c) => c.id === event.resource.contactId)
    : null

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
  const isSmallEvent = durationMinutes < 90 // Less than 1.5 hours

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
    return (
      <div
        className="flex h-full items-center justify-between gap-2 text-xs text-white cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedEventId(event.id)
        }}
      >
        <div className="flex-1 truncate">
          <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
          {contact && (
            <p className="truncate text-[10px] opacity-90">{contact.name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleStatus}
          className={clsx(
            'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors',
            getStatusPillStyle(event.resource.status)
          )}
          aria-label="Toggle task status"
        >
          {event.resource.status === 'done' && <span className="text-[10px]">✓</span>}
        </button>
      </div>
    )
  }

  // Full layout for larger events
  return (
    <div
      className="flex h-full flex-col gap-1.5 text-xs text-white cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        setSelectedEventId(event.id)
      }}
    >
      <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
      {contact && (
        <p className="truncate text-[10px] opacity-90">👤 {contact.name}</p>
      )}
      <button
        type="button"
        onClick={handleToggleStatus}
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-white transition-colors',
          getStatusPillStyle(event.resource.status)
        )}
        aria-label="Toggle task status"
      >
        {event.resource.status === 'done' && <span>✓</span>}
        <span className="text-[10px] font-medium capitalize">
          {event.resource.status === 'inProgress' ? 'In progress' : event.resource.status}
        </span>
      </button>
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
  // Use custom color if available, otherwise use a default color
  // Determine color based on priority if not manually set, or default
  const baseColor = event.resource.color ?? (
    event.resource.priority === 'high' ? 'rgba(244, 63, 94, 0.7)' : // Rose
      event.resource.priority === 'medium' ? 'rgba(59, 130, 246, 0.7)' : // Blue
        'rgba(99, 102, 241, 0.7)' // Indigo
  )

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
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: overdue ? '2px solid rgba(239, 68, 68, 0.8)' : '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      padding: '2px 4px',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      opacity: event.resource.isBackup ? 0.6 : 1,
      fontWeight: 500,
      fontSize: '12px',
      alignItems: 'flex-start',
      overflow: 'hidden',
    },
  }
}
