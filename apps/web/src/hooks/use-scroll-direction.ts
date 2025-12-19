import { useEffect, useState, useRef } from 'react'

export function useScrollDirection() {
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)

    // Use refs to store mutable scroll state without triggering re-renders
    const lastScrollTop = useRef<number>(0)
    const lastTarget = useRef<EventTarget | null>(null)

    useEffect(() => {
        const updateScrollDirection = (target: EventTarget | null) => {
            if (!target) return

            let scrollTop = 0
            // Check if target is Document or Window vs Element
            if (target === document || target === window) {
                scrollTop = window.pageYOffset
            } else if (target instanceof Element) {
                scrollTop = target.scrollTop
            } else {
                return // Unknown target type
            }

            // If we switched scroll targets (e.g. user moves from map to sidebar list), reset baseline
            if (lastTarget.current !== target) {
                lastTarget.current = target
                lastScrollTop.current = scrollTop
                return
            }

            const currentScrollTop = scrollTop
            const previousScrollTop = lastScrollTop.current
            const diff = currentScrollTop - previousScrollTop

            // Ignore small movements (jitter)
            if (Math.abs(diff) < 10) return

            const newDirection = diff > 0 ? 'down' : 'up'
            setScrollDirection(newDirection)

            lastScrollTop.current = currentScrollTop
        }

        const onScroll = (e: Event) => {
            window.requestAnimationFrame(() => updateScrollDirection(e.target))
        }

        // Capture scrolling on ANY element in the window
        window.addEventListener('scroll', onScroll, { capture: true })

        return () => window.removeEventListener('scroll', onScroll, { capture: true })
    }, [])

    return scrollDirection
}
