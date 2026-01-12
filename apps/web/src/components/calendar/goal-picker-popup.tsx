import { useRef, useState, useEffect } from 'react'
import { Check, X, Target, Plus, ChevronLeft, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Contact, ContactGoal } from '@taskcalendar/core'
import { useUpdateContact } from '@/features/contacts/api'
import clsx from 'clsx'

type GoalPickerPopupProps = {
    contact: Contact
    selectedLinks: { goalId: string; subGoalId?: string }[]
    onToggleLink: (goalId: string, subGoalId?: string) => void
    onClose: () => void
}

export function GoalPickerPopup({ contact, selectedLinks, onToggleLink, onClose }: GoalPickerPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null)
    const updateContact = useUpdateContact()

    // Create Mode State (New Goal)
    const [isCreating, setIsCreating] = useState(false)
    const [newGoalTitle, setNewGoalTitle] = useState('')
    const [newSubGoals, setNewSubGoals] = useState<string[]>([])

    // UI State
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
    const [addingMilestoneTo, setAddingMilestoneTo] = useState<string | null>(null) // goalId
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

    const [isSaving, setIsSaving] = useState(false)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    const activeGoals = contact.goals.filter(g => !g.isCompleted)

    const toggleExpand = (goalId: string) => {
        const next = new Set(expandedGoals)
        if (next.has(goalId)) next.delete(goalId)
        else next.add(goalId)
        setExpandedGoals(next)
    }

    const handleCreateGoal = async () => {
        if (!newGoalTitle.trim()) return
        setIsSaving(true)
        try {
            const newGoal: ContactGoal = {
                id: crypto.randomUUID(),
                title: newGoalTitle.trim(),
                isCompleted: false,
                subGoals: newSubGoals
                    .filter(sg => sg.trim())
                    .map(sg => ({
                        id: crypto.randomUUID(),
                        title: sg.trim(),
                        isCompleted: false
                    })),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            await updateContact.mutateAsync({
                id: contact.id,
                data: {
                    goals: [...contact.goals, newGoal]
                }
            })

            // Select the new goal
            onToggleLink(newGoal.id)

            // Reset
            setNewGoalTitle('')
            setNewSubGoals([])
            setIsCreating(false)
        } catch (error) {
            console.error('Failed to create goal', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddMilestone = async (goalId: string) => {
        if (!newMilestoneTitle.trim()) return
        const goalIndex = contact.goals.findIndex(g => g.id === goalId)
        if (goalIndex === -1) return

        setIsSaving(true)
        try {
            const goal = contact.goals[goalIndex]
            const updatedGoal = {
                ...goal,
                subGoals: [
                    ...goal.subGoals,
                    {
                        id: crypto.randomUUID(),
                        title: newMilestoneTitle.trim(),
                        isCompleted: false
                    }
                ],
                updatedAt: new Date().toISOString()
            }

            const updatedGoals = [...contact.goals]
            updatedGoals[goalIndex] = updatedGoal

            await updateContact.mutateAsync({
                id: contact.id,
                data: { goals: updatedGoals }
            })

            setNewMilestoneTitle('')
            setAddingMilestoneTo(null)

            // Auto expand
            const next = new Set(expandedGoals)
            next.add(goalId)
            setExpandedGoals(next)

        } catch (error) {
            console.error('Failed to add milestone', error)
        } finally {
            setIsSaving(false)
        }
    }

    // New Goal Form Helpers
    const addSubGoal = () => setNewSubGoals([...newSubGoals, ''])
    const updateSubGoal = (idx: number, val: string) => {
        const next = [...newSubGoals]
        next[idx] = val
        setNewSubGoals(next)
    }
    const removeSubGoal = (idx: number) => {
        setNewSubGoals(newSubGoals.filter((_, i) => i !== idx))
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm dark:bg-black/40"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                    ref={popupRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.1 }}
                    className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 pointer-events-auto"
                >
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            {isCreating && (
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex flex-col">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {isCreating ? 'New Goal' : 'Pick goals'}
                                </h4>
                                <span className="text-xs text-slate-500">{contact.name}</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        {isCreating ? (
                            <div className="space-y-4 px-1 py-1">
                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">Goal Title</label>
                                    <input
                                        value={newGoalTitle}
                                        onChange={e => setNewGoalTitle(e.target.value)}
                                        placeholder="e.g. Run a marathon"
                                        autoFocus
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold uppercase text-slate-500">Milestones</label>
                                        <button
                                            onClick={addSubGoal}
                                            type="button"
                                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Step
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {newSubGoals.map((sg, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    value={sg}
                                                    onChange={e => updateSubGoal(idx, e.target.value)}
                                                    placeholder={`Step ${idx + 1}`}
                                                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                />
                                                <button
                                                    onClick={() => removeSubGoal(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {newSubGoals.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">No milestones added yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activeGoals.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                                        <Target className="h-8 w-8 text-slate-300 mb-2" />
                                        <p className="text-sm">No active goals found</p>
                                    </div>
                                ) : (
                                    activeGoals.map(goal => {
                                        const isSelected = selectedLinks.some(l => l.goalId === goal.id && !l.subGoalId)
                                        const isExpanded = expandedGoals.has(goal.id)

                                        return (
                                            <div key={goal.id} className="rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                                                <div className="flex items-center p-2 gap-2">
                                                    <button
                                                        onClick={() => onToggleLink(goal.id)}
                                                        className={clsx(
                                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                                            isSelected
                                                                ? "border-brand-500 bg-brand-500 text-white"
                                                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                                        )}
                                                    >
                                                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                    </button>

                                                    <button
                                                        onClick={() => toggleExpand(goal.id)}
                                                        className="flex-1 text-left flex items-center gap-2"
                                                    >
                                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {goal.title}
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={() => toggleExpand(goal.id)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                    >
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-2 pb-2 pl-9 space-y-1">
                                                                {/* Subgoals */}
                                                                {goal.subGoals.map(sg => {
                                                                    const isSgSelected = selectedLinks.some(l => l.goalId === goal.id && l.subGoalId === sg.id)

                                                                    return (
                                                                        <div key={sg.id} className="flex items-center gap-2 py-1">
                                                                            <button
                                                                                onClick={() => onToggleLink(goal.id, sg.id)}
                                                                                className={clsx(
                                                                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                                                                    isSgSelected
                                                                                        ? "border-brand-500 bg-brand-500 text-white"
                                                                                        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                                                                )}
                                                                            >
                                                                                {isSgSelected && <Check className="h-3 w-3" />}
                                                                            </button>
                                                                            <span className={clsx(
                                                                                "text-sm",
                                                                                sg.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"
                                                                            )}>
                                                                                {sg.title}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}

                                                                {/* Add Milestone Inline */}
                                                                {addingMilestoneTo === goal.id ? (
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <input
                                                                            value={newMilestoneTitle}
                                                                            onChange={e => setNewMilestoneTitle(e.target.value)}
                                                                            placeholder="Milestone title..."
                                                                            autoFocus
                                                                            className="flex-1 text-sm rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                                                                            onKeyDown={e => {
                                                                                if (e.key === 'Enter') handleAddMilestone(goal.id)
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleAddMilestone(goal.id)}
                                                                            className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                                                                        >
                                                                            <Check className="h-3 w-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setAddingMilestoneTo(null)}
                                                                            className="p-1 text-slate-400 hover:text-slate-600"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setAddingMilestoneTo(goal.id)
                                                                            setNewMilestoneTitle('')
                                                                        }}
                                                                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 mt-1"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                        Add Milestone
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        {!isCreating ? (
                            <>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors dark:text-brand-400 dark:hover:bg-brand-900/20"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Goal
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors dark:bg-slate-700 dark:hover:bg-slate-600"
                                >
                                    Done
                                </button>
                            </>
                        ) : (
                            <div className="flex w-full justify-end gap-2">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    disabled={isSaving}
                                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateGoal}
                                    disabled={!newGoalTitle.trim() || isSaving}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    {isSaving ? 'Saving...' : 'Create Goal'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
