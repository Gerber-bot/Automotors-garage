import { useState } from 'react';
import type { AIProposal } from '../../api/contracts.ts';

export interface AIConfirmationPanelProps {
  proposal: AIProposal;
  onConfirm: (confirmedProposal: AIProposal) => void;
  onDismiss?: () => void;
}

export function AIConfirmationPanel({ proposal, onConfirm, onDismiss }: AIConfirmationPanelProps) {
  const [editedKm, setEditedKm] = useState(proposal.odometerKm);
  const [editedNextKm, setEditedNextKm] = useState(proposal.suggestedNextServiceKm ?? proposal.odometerKm + 10000);
  const [editedNotes, setEditedNotes] = useState(proposal.diagnosisNotes ?? '');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const handleSave = () => {
    onConfirm({
      ...proposal,
      odometerKm: editedKm,
      suggestedNextServiceKm: editedNextKm,
      diagnosisNotes: editedNotes,
    });
  };

  return (
    <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <h4 className="font-semibold text-slate-100 text-sm md:text-base">
            Propuesta Estructurada por IA
          </h4>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
          Confianza: {Math.round(proposal.confidence * 100)}%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* Odometer */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Kilometraje Actual Detectado (km)
          </label>
          <input
            type="number"
            value={editedKm}
            onChange={(e) => setEditedKm(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        {/* Suggested Next Service */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Próximo Service Sugerido (km)
          </label>
          <input
            type="number"
            value={editedNextKm}
            onChange={(e) => setEditedNextKm(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>
      </div>

      {/* Work Performed Tags */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Intervenciones Identificadas
        </label>
        <div className="flex flex-wrap gap-1.5">
          {proposal.workPerformed.map((item) => (
            <span
              key={item}
              className="px-2 py-1 bg-emerald-950 text-emerald-300 text-xs rounded border border-emerald-800/80 font-mono"
            >
              ✓ {item.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Mechanic Notes */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Observaciones y Diagnóstico Dictado
        </label>
        <textarea
          rows={2}
          value={editedNotes}
          onChange={(e) => setEditedNotes(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Human Review Disclaimer & Checkbox */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasAcknowledged}
            onChange={(e) => setHasAcknowledged(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
          />
          <span className="text-xs text-slate-300 font-medium">
            Confirmo que revisé y validé los datos técnicos
          </span>
        </label>

        <div className="flex items-center gap-2">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Descartar
            </button>
          )}
          <button
            type="button"
            disabled={!hasAcknowledged}
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-sm"
          >
            Confirmar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
