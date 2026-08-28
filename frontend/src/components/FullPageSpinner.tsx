export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-neon"
        role="status"
        aria-label="Cargando"
      />
    </div>
  )
}
