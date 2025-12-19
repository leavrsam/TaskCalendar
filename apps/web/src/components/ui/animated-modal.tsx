
import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

type AnimatedModalProps = {
    isOpen: boolean
    onClose: () => void
    layoutId?: string
    children: React.ReactNode
    className?: string
    overlayClassName?: string
}

export function AnimatedModal({
    isOpen,
    onClose,
    layoutId,
    children,
    className,
    overlayClassName,
}: AnimatedModalProps) {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={clsx(
                            'fixed inset-0 z-[1300] bg-slate-900/40 backdrop-blur-sm',
                            overlayClassName
                        )}
                        onClick={onClose}
                    />

                    {/* Dialog Container */}
                    <div className="fixed inset-0 z-[1300] flex items-end justify-center p-4 md:items-center pointer-events-none">
                        {/* Morphing Card */}
                        <motion.div
                            layoutId={layoutId} // Magically morphs from the trigger element if ID matches
                            initial={layoutId ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
                            animate={layoutId ? undefined : { opacity: 1, scale: 1, y: 0 }}
                            exit={layoutId ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{
                                type: 'spring',
                                damping: 25,
                                stiffness: 300,
                                duration: 0.3
                            }}
                            className={clsx(
                                'pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5',
                                className
                            )}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            {children}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
