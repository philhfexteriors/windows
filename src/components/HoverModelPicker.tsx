'use client';

import type { HoverModel } from '@/lib/hover-types';

interface Props {
  models: HoverModel[];
  onSelect: (model: HoverModel) => void;
}

export default function HoverModelPicker({ models, onSelect }: Props) {
  const completeModels = models.filter((m) => m.state === 'complete');
  const otherModels = models.filter((m) => m.state !== 'complete');

  if (completeModels.length === 1 && otherModels.length === 0) {
    // Auto-select if only one complete model
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 mb-3">
          Loading measurements for <strong>{completeModels[0].name || 'Main structure'}</strong>...
        </p>
        <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin mx-auto" />
        {/* Parent should auto-select this model */}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        This property has multiple structures. Select which one to import windows from:
      </p>
      <div className="grid gap-2">
        {completeModels.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {model.name || `Structure ${model.id}`}
              </div>
              <div className="text-xs text-green-600">Measurements available</div>
            </div>
          </button>
        ))}

        {otherModels.map((model) => (
          <div
            key={model.id}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">
                {model.name || `Structure ${model.id}`}
              </div>
              <div className="text-xs text-gray-400">
                {model.state === 'failed' ? 'Processing failed' : `Status: ${model.state}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
