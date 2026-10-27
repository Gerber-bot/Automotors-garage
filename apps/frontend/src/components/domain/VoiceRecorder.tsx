import { useState, useRef } from 'react';

export interface VoiceRecorderProps {
  isProcessing?: boolean;
  onAudioCaptured: (audioBlob: Blob) => void;
  label?: string;
}

export function VoiceRecorder({
  isProcessing = false,
  onAudioCaptured,
  label = 'Dictar notas de servicio',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    // Creates an audio blob representing the mechanic's voice notes
    const simulatedAudioBlob = new Blob(['simulated-mechanic-voice-recording'], {
      type: 'audio/wav',
    });
    onAudioCaptured(simulatedAudioBlob);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-lg shadow-md transition-all active:scale-95"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950" />
            {isProcessing ? 'Procesando IA...' : label}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-lg shadow-md animate-pulse transition-all active:scale-95"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-white" />
            Detener ({elapsedSeconds}s)
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-2 text-center">
        {isRecording
          ? 'Grabando dictado... Hablá claro sobre el trabajo y kilometraje.'
          : 'Presioná para dictar: "Cambié aceite y filtro a los 112 mil..."'}
      </p>
    </div>
  );
}
