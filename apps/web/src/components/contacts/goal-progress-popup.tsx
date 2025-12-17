import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronRight, Check, Plus, Trash2 } from 'lucide-react'
import type { Contact, ContactGoal, ContactSubGoal } from '@taskcalendar/core'
import { useUpdateContact } from '@/features/contacts/api'

type GoalProgressPopupProps = {
    contact: Contact
    onClose: () => void
}

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2, 11)

export function GoalProgressPopup({ contact, onClose }: GoalProgressPopupProps) {
    const updateContact = useUpdateContact()
    const [goals, setGoals] = useState<ContactGoal[]>(contact.goals || [])
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
    const [newGoalTitle, setNewGoalTitle] = useState('')
    const [addingSubGoalFor, setAddingSubGoalFor] = useState<string | null>(null)
    const [newSubGoalTitle, setNewSubGoalTitle] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setGoals(contact.goals || [])
    }, [contact])

    const toggleExpand = (goalId: string) => {
        const newExpanded = new Set(expandedGoals)
        if (newExpanded.has(goalId)) {
            newExpanded.delete(goalId)
        } else {
            newExpanded.add(goalId)
        }
        setExpandedGoals(newExpanded)
    }

    const toggleGoalComplete = (goalId: string) => {
        setGoals(prev => prev.map(g =>
            g.id === goalId ? { ...g, isCompleted: !g.isCompleted, updatedAt: new Date().toISOString() } : g
        ))
    }

    const toggleSubGoalComplete = (goalId: string, subGoalId: string) => {
        setGoals(prev => prev.map(g =>
            g.id === goalId
                ? {
                    ...g,
                    subGoals: g.subGoals.map(sg =>
                        sg.id === subGoalId ? { ...sg, isCompleted: !sg.isCompleted } : sg
                    ),
                    updatedAt: new Date().toISOString()
                }
                : g
        ))
    }

    const addGoal = () => {
        if (!newGoalTitle.trim()) return
        const now = new Date().toISOString()
        const newGoal: ContactGoal = {
            id: generateId(),
            title: newGoalTitle.trim(),
            isCompleted: false,
            subGoals: [],
            createdAt: now,
            updatedAt: now,
        }
        setGoals(prev => [...prev, newGoal])
        setNewGoalTitle('')
    }

    const addSubGoal = (goalId: string) => {
        if (!newSubGoalTitle.trim()) return
        const newSubGoal: ContactSubGoal = {
            id: generateId(),
            title: newSubGoalTitle.trim(),
            isCompleted: false,
        }
        setGoals(prev => prev.map(g =>
            g.id === goalId
                ? { ...g, subGoals: [...g.subGoals, newSubGoal], updatedAt: new Date().toISOString() }
                : g
        ))
        setNewSubGoalTitle('')
        setAddingSubGoalFor(null)
    }

    const deleteGoal = (goalId: string) => {
        setGoals(prev => prev.filter(g => g.id !== goalId))
    }

    const deleteSubGoal = (goalId: string, subGoalId: string) => {
        setGoals(prev => prev.map(g =>
            g.id === goalId
                ? { ...g, subGoals: g.subGoals.filter(sg => sg.id !== subGoalId), updatedAt: new Date().toISOString() }
                : g
        ))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await updateContact.mutateAsync({
                id: contact.id,
                data: { goals }
            })
            onClose()
        } catch (err) {
            console.error('Failed to save goals:', err)
        } finally {
            setSaving(false)
        }
    }

    const completedCount = goals.filter(g => g.isCompleted).length
    const totalCount = goals.length

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            Goals for {contact.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {completedCount} of {totalCount} goals completed
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Goals List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {goals.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No goals yet. Add one below!
                        </div>
                    ) : (
                        goals.map((goal) => (
                            <div key={goal.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
                                {/* Goal Header */}
                                <div className="flex items-center gap-3 p-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(goal.id)}
                                        className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        {expandedGoals.has(goal.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => toggleGoalComplete(goal.id)}
                                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${goal.isCompleted
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-slate-300 dark:border-slate-600'
                                            }`}
                                    >
                                        {goal.isCompleted && <Check className="h-3 w-3" />}
                                    </button>

                                    <span className={`flex-1 text-sm font-medium ${goal.isCompleted
                                            ? 'text-slate-400 line-through'
                                            : 'text-slate-900 dark:text-slate-50'
                                        }`}>
                                        {goal.title}
                                    </span>

                                    <span className="text-xs text-slate-400">
                                        {goal.subGoals.filter(sg => sg.isCompleted).length}/{goal.subGoals.length}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => deleteGoal(goal.id)}
                                        className="p-1 text-slate-400 hover:text-rose-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Sub-goals */}
                                {expandedGoals.has(goal.id) && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-3 space-y-2">
                                        {goal.subGoals.map((subGoal) => (
                                            <div key={subGoal.id} className="flex items-center gap-3 pl-6">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSubGoalComplete(goal.id, subGoal.id)}
                                                    className={`flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${subGoal.isCompleted
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                        }`}
                                                >
                                                    {subGoal.isCompleted && <Check className="h-2.5 w-2.5" />}
                                                </button>
                                                <span className={`flex-1 text-sm ${subGoal.isCompleted
                                                        ? 'text-slate-400 line-through'
                                                        : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {subGoal.title}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteSubGoal(goal.id, subGoal.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-500"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add sub-goal */}
                                        {addingSubGoalFor === goal.id ? (
                                            <div className="flex items-center gap-2 pl-6">
                                                <input
                                                    type="text"
                                                    value={newSubGoalTitle}
                                                    onChange={(e) => setNewSubGoalTitle(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addSubGoal(goal.id)}
                                                    placeholder="Sub-goal title..."
                                                    autoFocus
                                                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addSubGoal(goal.id)}
                                                    className="px-2 py-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingSubGoalFor(null)}
                                                    className="px-2 py-1 text-xs text-slate-400"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setAddingSubGoalFor(goal.id)}
                                                className="flex items-center gap-1 pl-6 text-xs text-brand-600 hover:text-brand-700"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add sub-goal
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Add Goal */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                            placeholder="Add a new goal..."
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
                        />
                        <button
                            type="button"
                            onClick={addGoal}
                            disabled={!newGoalTitle.trim()}
                            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
