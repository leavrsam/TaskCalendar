type ComingSoonProps = {
  title: string
  description: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coming soon</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

