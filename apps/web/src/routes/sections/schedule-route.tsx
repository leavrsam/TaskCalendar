const DRAG_TYPE = 'TASK_CARD'
import { useEffect, useMemo, useState, useRef } from 'react'
import clsx from 'clsx'
import { DndProvider, useDrag } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { addMonths, subMonths, format } from 'date-fns'
import { Calendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const DnDCalendar = withDragAndDrop<TaskEvent, TaskEvent>(Calendar)

import type { Task } from '@taskcalendar/core'

import { TaskCard } from '@/components/tasks/task-card'
import { Circle, Clock3, CheckCircle2 } from 'lucide-react'

import { isBackupEvent, isOverdueEvent } from '@/components/calendar/event-badge.utils'
import {
  useCreateTask,
  useTaskEvents,
  useTasksQuery,
  useUpdateTask,
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

  const [creationSlot, setCreationSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [weekAnchor, setWeekAnchor] = useState(new Date())

  const filteredTasks =
    filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)

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
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
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
          onEventSelect={(event) => {
            void updateTask.mutateAsync({
              id: event.id,
              data: {
                status:
                  event.resource.status === 'done'
                    ? 'todo'
                    : event.resource.status === 'todo'
                      ? 'inProgress'
                      : 'done',
              },
            })
          }}
        />
        <TaskBoard
          tasks={filteredTasks}
          filter={filter}
          onFilterChange={setFilter}
          loading={tasksQuery.isLoading}
          onDragTaskChange={setDragTaskId}
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
          await eventsQuery.refetch()
          setCreationSlot(null)
        }}
      />
      </div>
    </DndProvider>
  )
}

type AgendaBoardProps = {
  events: ReturnType<typeof useTaskEvents>['events']
  isLoading: boolean
  onSlotSelect: (slot: { start: Date; end: Date }) => void
  onEventMove: (event: { id: string; start: Date; end: Date }) => void
  onEventSelect: (event: TaskEvent) => void
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
  onEventSelect,
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
          components={{
            event: CalendarEvent,
          }}
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
          onSelectEvent={(event) => onEventSelect(event as TaskEvent)}
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
  const backup = isBackupEvent(event.resource)
  const updateTask = useUpdateTask()

  const startLabel = format(event.start as Date, 'h:mm a')
  const endLabel = format(event.end as Date, 'h:mm a')

  const nextStatus = getNextStatus(event.resource.status)

  const handleToggleStatus = () => {
    updateTask.mutate({
      id: event.resource.id,
      data: { status: nextStatus },
    })
  }

  return (
    <div
      className={clsx(
        'flex h-full flex-col rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-xs shadow-sm',
        backup && 'opacity-60',
      )}
    >
      <p className="truncate text-[13px] font-semibold text-slate-900">{event.title}</p>
      <p className="text-[11px] font-medium text-slate-600">
        {startLabel} – {endLabel}
      </p>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={handleToggleStatus}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700"
          aria-label="Toggle task status"
        >
          {getStatusIcon(event.resource.status)}
          <span className="capitalize">{event.resource.status}</span>
        </button>
        {overdue && <span className="font-semibold text-rose-600">Overdue</span>}
      </div>
      {backup && (
        <span className="mt-1 text-[10px] font-semibold text-rose-600">
          Backup block
        </span>
      )}
    </div>
  )
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

const getStatusIcon = (status: Task['status']) => {
  if (status === 'inProgress') {
    return <Clock3 className="h-4 w-4 text-amber-500" />
  }
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  }
  return <Circle className="h-4 w-4 text-slate-400" />
}

type TaskBoardProps = {
  tasks: Task[]
  filter: Task['status'] | 'all'
  onFilterChange: (status: Task['status'] | 'all') => void
  loading: boolean
  onDragTaskChange: (taskId: string | null) => void
}

function TaskBoard({
  tasks,
  filter,
  onFilterChange,
  loading,
  onDragTaskChange,
}: TaskBoardProps) {
  const createTask = useCreateTask()

  const handleNewTask = async () => {
    await createTask.mutateAsync({
      title: 'New focus block',
      status: 'todo',
      notes: 'Tap to edit details in Firestore console.',
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Tasks
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Backlog</h2>
        </div>
        <button
          type="button"
          onClick={handleNewTask}
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand-200"
        >
          Quick add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
      <div className="mt-4 space-y-3">
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
  }) => Promise<void>
}

function CreationModal({ slot, onClose, onSave }: CreationModalProps) {
  const [title, setTitle] = useState('Lesson planning')
  const [status, setStatus] = useState<Task['status']>('todo')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [notes, setNotes] = useState('')
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

