// src/components/PlayerModal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerModal({ player, onClose }) {
  // Don’t render anything if closed
  if (!player) return null;

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // True viewport cover — outside app tree
        className="fixed inset-0 top-0 left-0 right-0 bottom-0
                   bg-black/70 backdrop-blur-sm
                   flex items-center justify-center
                   z-[9999]"
        onClick={onClose}
      >
        <motion.div
          key="card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white/10 border border-white/20 rounded-2xl p-6
                     w-[350px] max-w-[90vw] text-blue-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Player avatar */}
          <div className="w-24 h-24 rounded-full mx-auto bg-blue-500/20
                          border border-blue-300/30 flex items-center justify-center text-3xl">
            ⚽
          </div>

          <h2 className="mt-4 text-xl font-bold text-center">{player.name}</h2>
          <p className="text-center text-blue-200/70 text-sm uppercase tracking-wider mt-1">
            {player.naturalPosition}
          </p>

          <div className="border-t border-white/10 mt-5 pt-4 space-y-1 text-sm">
            {Object.entries(player.ratings).map(([pos, r]) => (
              <div key={pos} className="flex justify-between text-blue-200/80">
                <span>{pos}</span>
                <span className="font-semibold">{r}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-2 rounded-xl bg-blue-600/40 border border-blue-400/40
                       hover:bg-blue-600/60 transition font-semibold"
          >
            Close
          </button>

          {/* Optional top-right X */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-blue-200/70 hover:text-blue-100"
            aria-label="Close"
          >
            ×
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render outside any transformed/overflow ancestors
  return createPortal(overlay, document.body);
}
