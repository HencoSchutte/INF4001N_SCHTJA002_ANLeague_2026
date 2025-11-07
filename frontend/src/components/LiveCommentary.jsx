import { useEffect, useState, useRef } from "react";

export default function LiveCommentary({ matchId }) {
  const [lines, setLines] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    const evtSource = new EventSource(`${import.meta.env.VITE_API_URL}/matches/${matchId}/commentary`);

    evtSource.onmessage = (e) => {
      const newLines = e.data.split("\n").filter(Boolean);
      setLines((prev) => [...prev, ...newLines]);
    };

    evtSource.onerror = () => {
      console.error("SSE connection lost.");
      evtSource.close();
    };

    return () => evtSource.close();
  }, [matchId]);

  // 🔥 Auto-scroll when new lines arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg max-h-96 overflow-y-auto">
      <h2 className="font-bold mb-2">Live Commentary</h2>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
        {/* Invisible element to anchor scroll */}
        <div ref={endRef} />
      </div>
    </div>
  );
}
