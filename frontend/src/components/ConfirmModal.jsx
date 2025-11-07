export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      
      <div className="relative w-full max-w-sm bg-[#0f172a]/80 border border-blue-400/30 shadow-[0_0_32px_rgba(0,145,255,0.45)] rounded-2xl p-6 text-blue-100 space-y-4">
        
        {/* glow line top */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

        <h2 className="text-xl font-black tracking-widest uppercase text-blue-200 drop-shadow-[0_0_12px_rgba(20,130,255,0.55)]">
          {title}
        </h2>

        <p classname="text-blue-200/70 text-sm leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-white/10 border border-white/20 hover:border-blue-400/40 transition font-semibold"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 transition shadow-[0_0_14px_rgba(255,0,0,0.45)] font-bold"
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}
