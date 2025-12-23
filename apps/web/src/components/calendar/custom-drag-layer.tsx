
import { useDragLayer } from 'react-dnd'
import clsx from 'clsx'

const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
}

function getItemStyles(initialOffset: any, currentOffset: any) {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none',
        }
    }

    let { x, y } = currentOffset
    const transform = `translate(${x}px, ${y}px)`

    return {
        transform,
        WebkitTransform: transform,
    }
}

export const CustomDragLayer = () => {
    const { isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }))

    if (!isDragging || !currentOffset) {
        return null
    }

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(initialOffset, currentOffset)}>
                {/* Render the Custom Ghost */}
                <GhostEvent item={item} />
            </div>
        </div>
    )
}

const GhostEvent = ({ item }: { item: any }) => {
    // We expect 'item' to be the event object from react-big-calendar
    // RBC usually passes the event object directly or wrapped.
    // Based on `schedule-route.tsx`, `dragPreviewEvent` returns title, start, end, resource.

    // Fallback if item structure varies
    const title = item.title || item.resource?.title || 'Event'
    const color = item.resource?.color || item.color || '#039be5' // Default blue (Peacock)

    return (
        <div
            className={clsx(
                "pointer-events-none rounded-lg p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm",
                "flex flex-col justify-center overflow-hidden"
            )}
            style={{
                width: 200, // Fixed width for dragging looks cleaner usually
                height: 50,
                backgroundColor: `${color}D9`, // Hex + alpha ~85%
                borderLeft: '4px solid rgba(0,0,0,0.1)'
            }}
        >
            <div className="text-xs font-semibold text-white drop-shadow-sm truncate">
                {title}
            </div>
            <p className="text-[10px] text-white/90 truncate">
                {item.start ? new Date(item.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '...'}
                {' - '}
                {item.end ? new Date(item.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '...'}
            </p>
        </div>
    )
}
