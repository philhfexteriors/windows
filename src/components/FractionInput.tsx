'use client';

import { FRACTION_OPTIONS } from '@/lib/measurements';

interface FractionInputProps {
  label: string;
  wholeValue: string;
  fracValue: number;
  onWholeChange: (val: string) => void;
  onFracChange: (val: number) => void;
  placeholder?: string;
}

export default function FractionInput({
  label,
  wholeValue,
  fracValue,
  onWholeChange,
  onFracChange,
  placeholder = '0',
}: FractionInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholder}
          value={wholeValue}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '');
            onWholeChange(v);
          }}
          className="flex-1 px-2 py-2 text-center border border-gray-300 rounded-lg"
        />
        <select
          value={fracValue}
          onChange={(e) => onFracChange(parseFloat(e.target.value))}
          className="flex-1 px-2 py-2 border border-gray-300 rounded-lg"
        >
          {FRACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
