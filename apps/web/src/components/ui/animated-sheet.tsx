import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import clsx from 'clsx'

type AnimatedSheetProps = {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    side?: 'right' | 'left' | 'bottom'
    className?: string
    overlayClassName?: string
}

export function AnimatedSheet({
    isOpen,
    onClose,
    children,
    side = 'right',
    className,
    overlayClassName
}: AnimatedSheetProps) {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const variants = {
        hidden: {
            x: side === 'right' ? '100%' : side === 'left' ? '-100%' : 0,
            y: side === 'bottom' ? '100%' : 0,
            opacity: 0,
        },
        visible: {
            x: 0,
            y: 0,
            opacity: 1,
            transition: { type: 'spring', damping: 25, stiffness: 200 } as any
        },
        exit: {
            x: side === 'right' ? '100%' : side === 'left' ? '-100%' : 0,
            y: side === 'bottom' ? '100%' : 0,
            opacity: 0,
            transition: { ease: 'easeInOut', duration: 0.2 }
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={clsx(
                            "fixed inset-0 z-[1300] bg-slate-900/20 backdrop-blur-sm dark:bg-slate-900/50",
                            overlayClassName
                        )}
                    />

                    {/* Sheet Panel */}
                    <motion.div
                        variants={variants as any}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={clsx(
                            "fixed z-[1300] bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800",
                            side === 'right' && "inset-y-0 right-0 h-full w-full max-w-sm sm:max-w-md",
                            side === 'left' && "inset-y-0 left-0 h-full w-full max-w-sm sm:max-w-md",
                            side === 'bottom' && "inset-x-0 bottom-0 w-full rounded-t-xl border-t",
                            className
                        )}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
