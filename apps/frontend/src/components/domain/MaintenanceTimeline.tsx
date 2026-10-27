import { StatusBadge } from './StatusBadge.tsx';

export interface TimelineEntry {
  recordId: string;
  serviceDate: string;
  recordedMileage: number;
  workshopName: string;
  verificationLevel: string;
  isCertified: boolean;
  servicesPerformed?: readonly { title: string; category?: string }[];
  hasPhotographicEvidence?: boolean;
  internalNotes?: string;
  isOwnRecord?: boolean;
}

export interface MaintenanceTimelineProps {
  entries: readonly TimelineEntry[];
}

export function MaintenanceTimeline({ entries }: MaintenanceTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
        No hay registros de mantenimiento históricos para este vehículo.
      </div>
    );
  }

  return (
    <div className="relative border-l border-slate-800 ml-3.5 space-y-6 my-4">
      {entries.map((entry) => (
        <div key={entry.recordId} className="relative pl-6 group">
          {/* Timeline node marker */}
          <div
            className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 border-slate-950 transition-colors ${
              entry.isCertified ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          />

          <div className="bg-slate-900/80 border border-slate-800 group-hover:border-slate-700 rounded-xl p-4 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2 mb-2">
              <div>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {entry.recordedMileage.toLocaleString()} km
                </span>
                <span className="text-slate-400 text-xs mx-2">•</span>
                <span className="text-xs text-slate-300">
                  {new Date(entry.serviceDate).toLocaleDateString()}
                </span>
              </div>
              <StatusBadge status={entry.verificationLevel} size="sm" />
            </div>

            <h4 className="font-semibold text-slate-100 text-sm">
              {entry.workshopName}
            </h4>

            {/* Services List */}
            {entry.servicesPerformed && entry.servicesPerformed.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.servicesPerformed.map((svc, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-950 text-slate-300 text-xs rounded border border-slate-800"
                  >
                    {svc.title}
                  </span>
                ))}
              </div>
            )}

            {/* Evidence Indicator */}
            {entry.hasPhotographicEvidence && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span>🛡️ Evidencia fotográfica SHA-256 verificada</span>
              </div>
            )}

            {/* Confidential Internal Notes (Shown ONLY if isOwnRecord) */}
            {entry.isOwnRecord && entry.internalNotes && (
              <div className="mt-3 p-2 bg-slate-950 rounded border border-amber-900/40 text-amber-300/90 text-xs">
                <span className="font-bold">Nota interna del taller: </span>
                {entry.internalNotes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
