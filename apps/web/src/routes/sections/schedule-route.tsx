const DRAG_TYPE = 'TASK_CARD'
import { useEffect, useMemo, useState, useRef } from 'react'
import clsx from 'clsx'
import { DndProvider, useDrag } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { addMonths, subMonths, format, startOfWeek } from 'date-fns'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const DnDCalendar = withDragAndDrop<TaskEvent, TaskEvent>(Calendar)

import type { Task } from '@taskcalendar/core'

import { TaskCard } from '@/components/tasks/task-card'
import { Circle, Clock3, CheckCircle2, Ban, Trash2 } from 'lucide-react'

import { isOverdueEvent } from '@/components/calendar/event-badge.utils'
import {
  useCreateTask,
  useTaskEvents,
  useTasksQuery,
  useUpdateTask,
  useDeleteTask,
  type TaskEvent,
} from '@/features/tasks/api'
import { calendarLocalizer } from '@/lib/calendar'
import { useAuth } from '@/hooks/use-auth'

export function ScheduleRoute() {
  const { user } = useAuth()
  const tasksQuery = useTasksQuery()
  const eventsQuery = useTaskEvents()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all')
  const [collapsed, setCollapsed] = useState(false)

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Slice 5 preview
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Tasks & Calendar
            </h1>
            <p className="text-sm text-slate-600">
              Google Calendar-inspired week view with drag-and-drop scheduling.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900"
                onClick={() => setWeekAnchor(subMonths(weekAnchor, 1))}
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-slate-900">
                {format(weekAnchor, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900"
                onClick={() => setWeekAnchor(addMonths(weekAnchor, 1))}
              >
                ›
              </button>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand-200"
              onClick={() => setWeekAnchor(new Date())}
            >
              Today
            </button>
            <div className="rounded-full border border-slate-100 bg-slate-50 px-4 py-1 text-sm">
              Signed in as{' '}
              <span className="font-semibold text-slate-900">
                {user?.email ?? 'anonymous'}
              </span>
            </div>
          </div>
        </header >

        <section
          className={clsx(
            'grid gap-6 transition-all duration-300 ease-in-out',
            collapsed ? 'lg:grid-cols-[1fr,auto]' : 'lg:grid-cols-[2fr,1fr]',
          )}
        >
          <AgendaBoard
            events={eventsQuery.events}
            isLoading={eventsQuery.isLoading}
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
          <TaskBoard
            tasks={filteredTasks}
            filter={filter}
            onFilterChange={setFilter}
            loading={tasksQuery.isLoading}
            onDragTaskChange={setDragTaskId}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
          />
        </section>
        <CreationModal
          slot={creationSlot}
          onClose={() => setCreationSlot(null)}
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
  onSlotSelect,
  onEventMove,
  onEventClick,
  draggingTask,
  onOutsideDropComplete,
  anchorDate,
  onAnchorChange,
}: AgendaBoardProps) {
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Agenda
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Weekly planning board
          </h2>
        </div>
      </div>
      <div className="mt-4 h-[600px]">
        <DnDCalendar
          localizer={calendarLocalizer}
          events={events}
          defaultView="week"
          date={anchorDate}
          onNavigate={onAnchorChange}
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
        />
      </div>
      {isLoading && <p className="mt-4 text-sm text-slate-500">Syncing schedule…</p>}
    </div>
  )
}

export function CalendarEvent({ event }: { event: TaskEvent }) {
  const overdue = isOverdueEvent(event.resource)
  const backup = event.resource.isBackup
  const updateTask = useUpdateTask()

  const nextStatus = getNextStatus(event.resource.status)

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
    return (
      <div className="flex h-full items-center justify-between gap-2 text-xs text-white">
        <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
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
  return {
    style: {
      backgroundColor: color,
      border: 'none',
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

type EventActionSheetProps = {
  event: TaskEvent | null
  onClose: () => void
}

function EventActionSheet({ event, onClose }: EventActionSheetProps) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  if (!event) return null

  const task = event.resource

  // Format dates for input (YYYY-MM-DDThh:mm or YYYY-MM-DD)
  const formatDateForInput = (dateStr: string | null | undefined, isDateOnly: boolean) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isDateOnly) {
      return date.toISOString().slice(0, 10)
    }
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  }

  const handleStatusChange = (e: React.MouseEvent, status: Task['status']) => {
    e.stopPropagation()
    updateTask.mutate({
      id: task.id,
      data: { status },
    })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteTask.mutateAsync(task.id)
      onClose()
    }
  }

  const handleTimeChange = (field: 'scheduledStart' | 'scheduledEnd', value: string) => {
    let dateStr = value
    if (task.isAllDay) {
      // If all day, append time to ensure correct date is saved
      // Start of day for start, end of day for end
      if (field === 'scheduledStart') dateStr = `${value}T00:00:00.000Z`
      if (field === 'scheduledEnd') dateStr = `${value}T23:59:59.999Z`
    } else {
      const date = new Date(value)
      dateStr = date.toISOString()
    }

    updateTask.mutate({
      id: task.id,
      data: { [field]: dateStr },
    })
  }

  const handleColorChange = (color: string) => {
    updateTask.mutate({
      id: task.id,
      data: { color },
    })
  }

  const toggleAllDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    updateTask.mutate({
      id: task.id,
      data: { isAllDay: e.target.checked },
    })
  }

  const toggleBackup = () => {
    updateTask.mutate({
      id: task.id,
      data: { isBackup: !task.isBackup },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Event</p>
            <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full p-2 text-rose-500 hover:bg-rose-50"
              title="Delete event"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-slate-300"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Time Controls */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Time
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={task.isAllDay}
                  onChange={toggleAllDay}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                All day
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Start</label>
                <input
                  type={task.isAllDay ? 'date' : 'datetime-local'}
                  value={formatDateForInput(task.scheduledStart, task.isAllDay)}
                  onChange={(e) => handleTimeChange('scheduledStart', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">End</label>
                <input
                  type={task.isAllDay ? 'date' : 'datetime-local'}
                  value={formatDateForInput(task.scheduledEnd, task.isAllDay)}
                  onChange={(e) => handleTimeChange('scheduledEnd', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
              </div>
            </div >
          </div >

          {/* Status Controls */}
          < div >
            <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['todo', 'inProgress', 'done'] as Task['status'][]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={(e) => handleStatusChange(e, status)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                    task.status === status
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div >

          {/* Color Controls */}
          < div >
            <p className="text-xs font-semibold uppercase text-slate-500">Color</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor.value}
                  type="button"
                  onClick={() => handleColorChange(presetColor.value)}
                  className="group relative h-8 w-full rounded-lg transition-all hover:scale-110"
                  style={{ backgroundColor: presetColor.value }}
                  title={presetColor.name}
                >
                  {(task.color === presetColor.value || (!task.color && presetColor.value === '#3b82f6')) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full border-2 border-white bg-white/30" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div >

          {/* Backup Toggle */}
          < div >
            <p className="text-xs font-semibold uppercase text-slate-500">Backup</p>
            <button
              type="button"
              onClick={toggleBackup}
              className="mt-2 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand-200"
            >
              {task.isBackup ? 'Remove backup label' : 'Mark as backup block'}
            </button>
          </div >

          {/* Notes */}
          {
            task.notes && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Notes</p>
                <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {task.notes}
                </p>
              </div>
            )
          }
        </div >
      </div >
    </div >
  )
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
      <div className="flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white py-4 shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-4 rounded-full border border-slate-200 p-2 text-slate-600 hover:border-brand-200 hover:text-brand-600"
          title="Show tasks"
        >
          <span className="sr-only">Show tasks</span>
          <span className="block h-4 w-4 rotate-180 text-xs font-bold">‹</span>
        </button>
        <div className="[writing-mode:vertical-lr] flex flex-1 items-center gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Tasks</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Tasks
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Backlog</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewTask}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand-200"
          >
            Quick add
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand-200"
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
                  : 'bg-slate-100 text-slate-600',
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Drag tasks from here onto the calendar to schedule them.
        </div>
      </div>
      <div className="mt-4 space-y-3 px-4 pb-4">
        {loading && <p className="text-sm text-slate-500">Loading tasks…</p>}
        {!loading && tasks.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
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

type CreationModalProps = {
  slot: { start: Date; end: Date } | null
  onClose: () => void
  onSave: (values: {
    title: string
    status: Task['status']
    notes?: string
    contactId?: string
    priority: Task['priority']
    color?: string | null
  }) => Promise<void>
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
]

function CreationModal({ slot, onClose, onSave }: CreationModalProps) {
  const [title, setTitle] = useState('Lesson planning')
  const [status, setStatus] = useState<Task['status']>('todo')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState<string>('#3b82f6')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!slot) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">New calendar block</h3>
        <p className="text-xs text-slate-500">
          {slot.start.toLocaleString()} → {slot.end.toLocaleString()}
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="todo">To-do</option>
                <option value="inProgress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Block Color
            </label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor.value}
                  type="button"
                  onClick={() => setColor(presetColor.value)}
                  className="group relative h-10 w-full rounded-lg transition-all hover:scale-110"
                  style={{ backgroundColor: presetColor.value }}
                  title={presetColor.name}
                >
                  {color === presetColor.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full border-2 border-white bg-white/30" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              setError(null)
              try {
                await onSave({
                  title,
                  status,
                  notes,
                  priority,
                  color,
                })
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Unable to save calendar block',
                )
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>
        )}
      </div>
    </div>
  )
}
