const DRAG_TYPE = 'TASK_CARD'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { DndProvider, useDrag } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { addMonths, subMonths, format, startOfWeek, addDays, subDays, addWeeks, subWeeks } from 'date-fns'
import type { View } from 'react-big-calendar'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const DnDCalendar = withDragAndDrop<TaskEvent, TaskEvent>(Calendar)

import type { Task } from '@taskcalendar/core'

import { TaskCard } from '@/components/tasks/task-card'
import { Clock3, CheckCircle2, Ban, Menu, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, LayoutTemplate, ListTodo } from 'lucide-react'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'


import { isOverdueEvent } from '@/components/calendar/event-badge.utils'
import {
  useCreateTask,
  useTaskEvents,
  useTasksQuery,
  useUpdateTask,
  type TaskEvent,
} from '@/features/tasks/api'
import { useContactsQuery } from '@/features/contacts/api'
import { calendarLocalizer } from '@/lib/calendar'
import { useAuth } from '@/hooks/use-auth'
import { CreationModal } from '@/components/calendar/creation-modal'
import { EventActionSheet } from '@/routes/sections/event-action-sheet'

export function ScheduleRoute() {
  const { user } = useAuth()
  // Get sidebar toggle from AppLayout context
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>()

  const tasksQuery = useTasksQuery()
  const eventsQuery = useTaskEvents()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])

  // View state
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all')
  const [mode, setMode] = useState<'calendar' | 'tasks' | 'hybrid'>('hybrid')
  const [view, setView] = useState<View>('week')
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false)

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 lg:h-[calc(100vh-2rem)]">
        {/* Google Calendar-style Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">

          {/* Left: Menu, Title, Nav, Date */}
          <div className="flex items-center gap-4">
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

            <div className="ml-4 flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  onClick={() => handleNavigate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="ml-2 text-lg font-medium text-slate-900 dark:text-slate-50">
                {format(weekAnchor, 'MMMM yyyy')}
              </span>
            </div>
          </div>

          {/* Right: View, Mode, Avatar */}
          <div className="flex items-center gap-3">
            {/* View Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="capitalize">{view}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {isViewDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsViewDropdownOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                    {(['month', 'week', 'day', 'agenda'] as View[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          setView(v)
                          setIsViewDropdownOpen(false)
                        }}
                        className={clsx(
                          'flex w-full items-center px-4 py-2 text-sm capitalize hover:bg-slate-50 dark:hover:bg-slate-800',
                          view === v ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
              <button
                onClick={() => setMode('calendar')}
                className={clsx(
                  'rounded-md p-1.5 transition-colors',
                  mode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                title="Calendar View"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('hybrid')}
                className={clsx(
                  'rounded-md p-1.5 transition-colors',
                  mode === 'hybrid' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                title="Hybrid View"
              >
                <LayoutTemplate className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('tasks')}
                className={clsx(
                  'rounded-md p-1.5 transition-colors',
                  mode === 'tasks' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                title="Tasks View"
              >
                <ListTodo className="h-4 w-4" />
              </button>
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
        </header >

        <section
          className={clsx(
            'grid flex-1 gap-6 transition-all duration-300 ease-in-out min-h-0',
            mode === 'calendar' && 'grid-cols-1',
            mode === 'tasks' && 'grid-cols-1',
            mode === 'hybrid' && 'lg:grid-cols-[2fr,1fr]'
          )}
        >
          {mode !== 'tasks' && (
            <div className="h-full min-h-0 overflow-hidden">
              <AgendaBoard
                events={eventsQuery.events}
                isLoading={eventsQuery.isLoading}
                view={view}
                onView={setView}
                onSlotSelect={(slot) => {
                  setCreationSlot(slot)
                }}
                draggingTask={
                  dragTaskId ? tasks.find((task) => task.id === dragTaskId) ?? null : null
                }
                onOutsideDropComplete={() => setDragTaskId(null)}
                anchorDate={weekAnchor}
                onAnchorChange={setWeekAnchor}
                onEventMove={({ id, start, end }) => {
                  void updateTask.mutateAsync({
                    id,
                    data: {
                      scheduledStart: start.toISOString(),
                      scheduledEnd: end.toISOString(),
                    },
                  })
                }}
                onEventClick={(event) => setSelectedEventId(event.id)}
              />
            </div>
          )}

          {mode !== 'calendar' && (
            <div className="h-full min-h-0 overflow-hidden">
              <TaskBoard
                tasks={filteredTasks}
                filter={filter}
                onFilterChange={setFilter}
                loading={tasksQuery.isLoading}
                onDragTaskChange={setDragTaskId}
                collapsed={false} // Controlled by mode now
                onToggleCollapse={() => { }} // No internal collapse anymore
              />
            </div>
          )}
        </section>

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
      </div >
    </DndProvider >
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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="h-full min-h-[600px]">
        <DnDCalendar
          localizer={calendarLocalizer}
          events={events}
          view={view}
          onView={onView}
          date={anchorDate}
          onNavigate={onAnchorChange}
          toolbar={false}
          culture="en-US"
          selectable
          step={30}
          timeslots={2}
          popup
          style={{ height: '100%' }}
          formats={{
            eventTimeRangeFormat: () => '',
          }}
          components={{
            event: CalendarEvent,
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
      {isLoading && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Syncing schedule…</p>}
    </div>
  )
}

export function CalendarEvent({ event }: { event: TaskEvent }) {
  const contactsQuery = useContactsQuery()
  const overdue = isOverdueEvent(event.resource)
  const backup = event.resource.isBackup
  const updateTask = useUpdateTask()

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
      <div className="flex h-full items-center justify-between gap-2 text-xs text-white">
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
          title={event.resource.status}
        >
          {getStatusIcon(event.resource.status, true)}
        </button>
      </div>
    )
  }

  // Full layout for larger events
  return (
    <div className="flex h-full flex-col gap-1.5 text-xs text-white">
      <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
      {contact && (
        <p className="truncate text-[10px] opacity-90">👤 {contact.name}</p>
      )}
      <div className="flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={handleToggleStatus}
          className={clsx(
            'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-white transition-colors',
            getStatusPillStyle(event.resource.status)
          )}
          aria-label="Toggle task status"
        >
          {getStatusIcon(event.resource.status)}
          <span className="capitalize">{event.resource.status}</span>
        </button>
        {overdue && <span className="font-semibold text-rose-300">Overdue</span>}
      </div>
      {backup && (
        <span className="text-[10px] font-semibold text-white">Backup block</span>
      )}
    </div>
  )
}

const getCalendarEventStyles = (event: TaskEvent) => {
  // Use custom color if available, otherwise use a default color
  const color = event.resource.color ?? '#3b82f6'
  const overdue = isOverdueEvent(event.resource)
  return {
    style: {
      backgroundColor: color,
      border: overdue ? '2px solid #ef4444' : 'none',
      borderRadius: '12px',
      color: '#fff',
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: '0 10px 25px rgba(15,23,42,0.3)',
      opacity: event.resource.isBackup ? 0.6 : 1,
      fontWeight: 600,
      fontSize: '13px',
      alignItems: 'flex-start',
    },
  }
}

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

const getStatusIcon = (status: Task['status'], small = false) => {
  const sizeClass = small ? 'h-3 w-3' : 'h-4 w-4'
  if (status === 'inProgress') {
    return <Clock3 className={clsx(sizeClass, 'text-amber-500')} />
  }
  if (status === 'done') {
    return <CheckCircle2 className={clsx(sizeClass, 'text-emerald-500')} />
  }
  return <Ban className={clsx(sizeClass, 'text-slate-400')} />
}

type TaskBoardProps = {
  tasks: Task[]
  filter: Task['status'] | 'all'
  onFilterChange: (status: Task['status'] | 'all') => void
  loading: boolean
  onDragTaskChange: (taskId: string | null) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function TaskBoard({
  tasks,
  filter,
  onFilterChange,
  loading,
  onDragTaskChange,
  collapsed,
  onToggleCollapse,
}: TaskBoardProps) {
  const createTask = useCreateTask()

  const handleNewTask = async () => {
    await createTask.mutateAsync({
      title: 'New focus block',
      status: 'todo',
      notes: 'Tap to edit details in Firestore console.',
    })
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-4 rounded-full border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-400 hover:border-brand-200 hover:text-brand-600"
          title="Show tasks"
        >
          <span className="sr-only">Show tasks</span>
          <span className="block h-4 w-4 rotate-180 text-xs font-bold">‹</span>
        </button>
        <div className="[writing-mode:vertical-lr] flex flex-1 items-center gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span>Tasks</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tasks
          </p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Backlog</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewTask}
            className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:border-brand-200"
          >
            Quick add
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:border-brand-200"
          >
            Hide
          </button>
        </div>
      </div>
      <div className="px-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'todo', 'inProgress', 'done'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onFilterChange(status as Task['status'] | 'all')}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-semibold',
                filter === status
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:text-slate-400',
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 p-3 text-xs text-slate-600 dark:text-slate-400">
          Drag tasks from here onto the calendar to schedule them.
        </div>
      </div>
      <div className="mt-4 space-y-3 px-4 pb-4">
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading tasks…</p>}
        {!loading && tasks.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            No tasks in this column yet. Quick add one to begin planning.
          </p>
        )}
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onDragTaskChange={onDragTaskChange} />
        ))}
      </div>
    </div>
  )
}

function DraggableTaskCard({
  task,
  onDragTaskChange,
}: {
  task: Task
  onDragTaskChange: (taskId: string | null) => void
}) {
  const updateTask = useUpdateTask()
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [{ isDragging }, dragRef] = useDrag<
    { taskId: string },
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: DRAG_TYPE,
      item: () => {
        onDragTaskChange(task.id)
        return { taskId: task.id }
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: () => {
        onDragTaskChange(null)
      },
    }),
    [onDragTaskChange, task.id],
  )
  useEffect(() => {
    if (cardRef.current) {
      dragRef(cardRef.current)
    }
  }, [dragRef])
  return (
    <div ref={cardRef} className={isDragging ? 'opacity-60' : undefined}>
      <TaskCard
        task={task}
        onStatusChange={(nextStatus) =>
          updateTask.mutate({
            id: task.id,
            data: { status: nextStatus },
          })
        }
        onSchedule={() =>
          updateTask.mutate({
            id: task.id,
            data: {
              scheduledStart: new Date().toISOString(),
              scheduledEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
          })
        }
      />
    </div>
  )
}


