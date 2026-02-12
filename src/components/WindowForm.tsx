'use client';

import { useState, useEffect, useMemo } from 'react';
import type { WindowRow } from '@/lib/supabase';
import {
  WINDOW_TYPES,
  SIMPLE_TYPES,
  DETAILED_TYPES,
  TRANSOM_ELIGIBLE_TYPES,
  TRANSOM_SHAPES,
  GRID_STYLES,
  TEMPER_OPTIONS,
  SCREEN_OPTIONS,
  roundToEighth,
  formatFraction,
  splitValue,
  getCombinedValue,
} from '@/lib/measurements';
import FractionInput from './FractionInput';

interface FracState {
  whole: string;
  frac: number;
}

const emptyFrac = (): FracState => ({ whole: '', frac: 0 });

interface WindowFormProps {
  enabled: boolean;
  editingWindow: WindowRow | null;
  onSave: (
    data: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  onCancelEdit: () => void;
}

export default function WindowForm({
  enabled,
  editingWindow,
  onSave,
  onCancelEdit,
}: WindowFormProps) {
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [otherType, setOtherType] = useState('');
  const [widthTop, setWidthTop] = useState<FracState>(emptyFrac());
  const [widthBottom, setWidthBottom] = useState<FracState>(emptyFrac());
  const [heightLeft, setHeightLeft] = useState<FracState>(emptyFrac());
  const [heightRight, setHeightRight] = useState<FracState>(emptyFrac());
  const [widthSimple, setWidthSimple] = useState<FracState>(emptyFrac());
  const [heightSimple, setHeightSimple] = useState<FracState>(emptyFrac());
  const [notes, setNotes] = useState('');
  const [hasTransom, setHasTransom] = useState(false);
  const [transomShape, setTransomShape] = useState('Rectangular');
  const [otherTransomShape, setOtherTransomShape] = useState('');
  const [transomHeight, setTransomHeight] = useState<FracState>(emptyFrac());
  const [saving, setSaving] = useState(false);

  // Spec fields
  const [style, setStyle] = useState('');
  const [gridStyle, setGridStyle] = useState('');
  const [temper, setTemper] = useState('');
  const [outsideColor, setOutsideColor] = useState('');
  const [insideColor, setInsideColor] = useState('');
  const [screen, setScreen] = useState('');

  const isEditing = editingWindow !== null;
  const isPendingWindow = editingWindow?.status === 'pending';

  const selectType = type === 'Other' ? 'Other' : type;
  const isSimple = SIMPLE_TYPES.includes(selectType);
  const isDetailed = DETAILED_TYPES.includes(selectType);
  const showTransomOption = TRANSOM_ELIGIBLE_TYPES.includes(selectType);

  // Populate form when editing
  useEffect(() => {
    if (!editingWindow) return;

    setLocation(editingWindow.location || '');
    setNotes(editingWindow.notes || '');
    setStyle(editingWindow.style || '');
    setGridStyle(editingWindow.grid_style || '');
    setTemper(editingWindow.temper || '');
    setOutsideColor(editingWindow.outside_color || '');
    setInsideColor(editingWindow.inside_color || '');
    setScreen(editingWindow.screen || '');

    // Determine type
    const knownTypes = WINDOW_TYPES.filter((t) => t !== 'Other');
    if (knownTypes.includes(editingWindow.type as (typeof knownTypes)[number])) {
      setType(editingWindow.type);
      setOtherType('');
    } else if (editingWindow.type) {
      setType('Other');
      setOtherType(editingWindow.type);
    }

    // Only pre-fill measurements if the window has been measured
    if (editingWindow.status === 'measured') {
      const isSimpleType = SIMPLE_TYPES.includes(editingWindow.type);
      if (isSimpleType && editingWindow.final_w != null && editingWindow.final_h != null) {
        const wSplit = splitValue(editingWindow.final_w);
        setWidthSimple({ whole: String(wSplit.whole), frac: wSplit.frac });
        const hSplit = splitValue(editingWindow.final_h);
        setHeightSimple({ whole: String(hSplit.whole), frac: hSplit.frac });
      } else if (editingWindow.widths.length > 0) {
        const wt = splitValue(editingWindow.widths[0]);
        setWidthTop({ whole: String(wt.whole), frac: wt.frac });
        const wb = splitValue(editingWindow.widths[1]);
        setWidthBottom({ whole: String(wb.whole), frac: wb.frac });
        const hl = splitValue(editingWindow.heights[0]);
        setHeightLeft({ whole: String(hl.whole), frac: hl.frac });
        const hr = splitValue(editingWindow.heights[1]);
        setHeightRight({ whole: String(hr.whole), frac: hr.frac });
      }

      if (editingWindow.transom_height != null) {
        setHasTransom(true);
        const ts = splitValue(editingWindow.transom_height);
        setTransomHeight({ whole: String(ts.whole), frac: ts.frac });
        if (
          editingWindow.transom_shape &&
          !['Rectangular', 'Half-Round'].includes(editingWindow.transom_shape)
        ) {
          setTransomShape('Other');
          setOtherTransomShape(editingWindow.transom_shape);
        } else {
          setTransomShape(editingWindow.transom_shape || 'Rectangular');
        }
      }
    }
    // For pending windows, measurement inputs stay empty (reference shown separately)
  }, [editingWindow]);

  // Clear measurements on type change when NOT editing
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (!isEditing) {
      setWidthTop(emptyFrac());
      setWidthBottom(emptyFrac());
      setHeightLeft(emptyFrac());
      setHeightRight(emptyFrac());
      setWidthSimple(emptyFrac());
      setHeightSimple(emptyFrac());
      setHasTransom(false);
      setTransomShape('Rectangular');
      setOtherTransomShape('');
      setTransomHeight(emptyFrac());
      setNotes('');
      setOtherType('');
    }
  };

  // Computed final size
  const finalSize = useMemo(() => {
    if (isSimple) {
      const w = getCombinedValue(widthSimple.whole, widthSimple.frac);
      const h = getCombinedValue(heightSimple.whole, heightSimple.frac);
      if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
        return { w, h };
      }
    } else if (isDetailed) {
      const wt = getCombinedValue(widthTop.whole, widthTop.frac);
      const wb = getCombinedValue(widthBottom.whole, widthBottom.frac);
      const hl = getCombinedValue(heightLeft.whole, heightLeft.frac);
      const hr = getCombinedValue(heightRight.whole, heightRight.frac);
      if ([wt, wb, hl, hr].every((v) => !isNaN(v) && v > 0)) {
        const rWt = roundToEighth(wt);
        const rWb = roundToEighth(wb);
        const rHl = roundToEighth(hl);
        const rHr = roundToEighth(hr);
        return {
          w: Math.min(rWt, rWb),
          h: Math.min(rHl, rHr),
        };
      }
    }
    return null;
  }, [isSimple, isDetailed, widthSimple, heightSimple, widthTop, widthBottom, heightLeft, heightRight]);

  const clearForm = () => {
    setLocation('');
    setType('');
    setOtherType('');
    setWidthTop(emptyFrac());
    setWidthBottom(emptyFrac());
    setHeightLeft(emptyFrac());
    setHeightRight(emptyFrac());
    setWidthSimple(emptyFrac());
    setHeightSimple(emptyFrac());
    setNotes('');
    setHasTransom(false);
    setTransomShape('Rectangular');
    setOtherTransomShape('');
    setTransomHeight(emptyFrac());
    setStyle('');
    setGridStyle('');
    setTemper('');
    setOutsideColor('');
    setInsideColor('');
    setScreen('');
  };

  const handleSave = async () => {
    const resolvedType = type === 'Other' ? otherType.trim() : type;
    if (!location.trim() || !resolvedType) return;

    const isSimpleType = SIMPLE_TYPES.includes(selectType);

    if (isSimpleType) {
      const w = getCombinedValue(widthSimple.whole, widthSimple.frac);
      const h = getCombinedValue(heightSimple.whole, heightSimple.frac);
      if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) return;

      setSaving(true);
      try {
        await onSave({
          location: location.trim(),
          type: resolvedType,
          notes: notes.trim(),
          widths: [],
          heights: [],
          final_w: roundToEighth(w),
          final_h: roundToEighth(h),
          transom_shape: null,
          transom_height: null,
          style: style || null,
          grid_style: gridStyle || null,
          temper: temper || null,
          outside_color: outsideColor || null,
          inside_color: insideColor || null,
          screen: screen || null,
          status: 'measured',
        });
        clearForm();
      } finally {
        setSaving(false);
      }
    } else {
      const wt = getCombinedValue(widthTop.whole, widthTop.frac);
      const wb = getCombinedValue(widthBottom.whole, widthBottom.frac);
      const hl = getCombinedValue(heightLeft.whole, heightLeft.frac);
      const hr = getCombinedValue(heightRight.whole, heightRight.frac);
      if ([wt, wb, hl, hr].some((v) => isNaN(v) || v <= 0)) return;

      let tHeight: number | null = null;
      let tShape: string | null = null;
      if (hasTransom) {
        const th = getCombinedValue(transomHeight.whole, transomHeight.frac);
        if (isNaN(th) || th <= 0) return;
        tHeight = roundToEighth(th);
        tShape =
          transomShape === 'Other' ? otherTransomShape.trim() : transomShape;
        if (!tShape) return;
      }

      const rounded = [wt, wb, hl, hr].map(roundToEighth);

      setSaving(true);
      try {
        await onSave({
          location: location.trim(),
          type: resolvedType,
          notes: notes.trim(),
          widths: [rounded[0], rounded[1]],
          heights: [rounded[2], rounded[3]],
          final_w: Math.min(rounded[0], rounded[1]),
          final_h: Math.min(rounded[2], rounded[3]),
          transom_shape: tShape,
          transom_height: tHeight,
          style: style || null,
          grid_style: gridStyle || null,
          temper: temper || null,
          outside_color: outsideColor || null,
          inside_color: insideColor || null,
          screen: screen || null,
          status: 'measured',
        });
        clearForm();
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-md mb-8 ${
        !enabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        {isEditing ? (isPendingWindow ? 'Measure Window' : 'Edit Window') : 'Add a Window'}
      </h2>

      {/* Reference values for pending windows */}
      {isPendingWindow && editingWindow && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800">
            Salesperson reference:
          </p>
          <div className="flex gap-4 mt-1 text-sm text-amber-700">
            {editingWindow.approx_width && (
              <span>Width: ~{editingWindow.approx_width}&quot;</span>
            )}
            {editingWindow.approx_height && (
              <span>Height: ~{editingWindow.approx_height}&quot;</span>
            )}
            {editingWindow.label && <span>Label: #{editingWindow.label}</span>}
          </div>
        </div>
      )}

      {/* Location + Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Window Location *
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Window Type *
          </label>
          <select
            value={selectType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select Window Type</option>
            {WINDOW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {selectType === 'Other' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Specify Other Type *
            </label>
            <input
              type="text"
              value={otherType}
              onChange={(e) => setOtherType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Measurements */}
      {type && (
        <div className="mt-6">
          {/* Transom option */}
          {isDetailed && showTransomOption && (
            <div className="border-b pb-4 mb-4">
              <div className="flex items-center">
                <input
                  id="transomCheckbox"
                  type="checkbox"
                  checked={hasTransom}
                  onChange={(e) => {
                    setHasTransom(e.target.checked);
                    if (!e.target.checked) {
                      setTransomHeight(emptyFrac());
                      setTransomShape('Rectangular');
                      setOtherTransomShape('');
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <label
                  htmlFor="transomCheckbox"
                  className="ml-3 text-sm font-medium text-gray-900"
                >
                  Add Transom?
                </label>
              </div>
              {hasTransom && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Transom Shape
                    </label>
                    <select
                      value={
                        TRANSOM_SHAPES.includes(
                          transomShape as (typeof TRANSOM_SHAPES)[number]
                        )
                          ? transomShape
                          : 'Other'
                      }
                      onChange={(e) => {
                        setTransomShape(e.target.value);
                        if (e.target.value !== 'Other')
                          setOtherTransomShape('');
                      }}
                      className="w-full md:w-1/3 px-2 py-2 border border-gray-300 rounded-lg"
                    >
                      {TRANSOM_SHAPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {transomShape === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Specify Shape
                      </label>
                      <input
                        type="text"
                        value={otherTransomShape}
                        onChange={(e) => setOtherTransomShape(e.target.value)}
                        placeholder="e.g. Elliptical"
                        className="w-full md:w-1/3 px-2 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                  <FractionInput
                    label="Transom Height"
                    wholeValue={transomHeight.whole}
                    fracValue={transomHeight.frac}
                    onWholeChange={(v) =>
                      setTransomHeight((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setTransomHeight((s) => ({ ...s, frac: v }))
                    }
                    placeholder="12"
                  />
                </div>
              )}
            </div>
          )}

          {/* Detailed measurements */}
          {isDetailed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Detailed Measurements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FractionInput
                    label="Width Top"
                    wholeValue={widthTop.whole}
                    fracValue={widthTop.frac}
                    onWholeChange={(v) =>
                      setWidthTop((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setWidthTop((s) => ({ ...s, frac: v }))
                    }
                    placeholder="35"
                  />
                  <FractionInput
                    label="Width Bottom"
                    wholeValue={widthBottom.whole}
                    fracValue={widthBottom.frac}
                    onWholeChange={(v) =>
                      setWidthBottom((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setWidthBottom((s) => ({ ...s, frac: v }))
                    }
                    placeholder="35"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <FractionInput
                    label="Height Left"
                    wholeValue={heightLeft.whole}
                    fracValue={heightLeft.frac}
                    onWholeChange={(v) =>
                      setHeightLeft((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setHeightLeft((s) => ({ ...s, frac: v }))
                    }
                    placeholder="52"
                  />
                  <FractionInput
                    label="Height Right"
                    wholeValue={heightRight.whole}
                    fracValue={heightRight.frac}
                    onWholeChange={(v) =>
                      setHeightRight((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setHeightRight((s) => ({ ...s, frac: v }))
                    }
                    placeholder="52"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-600 mb-1 mt-7">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Temper glass, full screen..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg flex-grow min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Simple measurements */}
          {isSimple && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Overall Measurements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FractionInput
                    label="Width"
                    wholeValue={widthSimple.whole}
                    fracValue={widthSimple.frac}
                    onWholeChange={(v) =>
                      setWidthSimple((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setWidthSimple((s) => ({ ...s, frac: v }))
                    }
                    placeholder="36"
                  />
                  <FractionInput
                    label="Height"
                    wholeValue={heightSimple.whole}
                    fracValue={heightSimple.frac}
                    onWholeChange={(v) =>
                      setHeightSimple((s) => ({ ...s, whole: v }))
                    }
                    onFracChange={(v) =>
                      setHeightSimple((s) => ({ ...s, frac: v }))
                    }
                    placeholder="36"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Temper glass..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg flex-grow min-h-[50px]"
                />
              </div>
            </div>
          )}

          {/* Spec fields */}
          {(isSimple || isDetailed) && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Window Specs (optional)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Grid Style
                  </label>
                  <select
                    value={gridStyle}
                    onChange={(e) => setGridStyle(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    {GRID_STYLES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Temper
                  </label>
                  <select
                    value={temper}
                    onChange={(e) => setTemper(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    {TEMPER_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Screen
                  </label>
                  <select
                    value={screen}
                    onChange={(e) => setScreen(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">—</option>
                    {SCREEN_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Outside Color
                  </label>
                  <input
                    type="text"
                    value={outsideColor}
                    onChange={(e) => setOutsideColor(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    placeholder="White"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Inside Color
                  </label>
                  <input
                    type="text"
                    value={insideColor}
                    onChange={(e) => setInsideColor(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    placeholder="White"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Style
                  </label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                    placeholder="See Pics"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Final size display */}
          {finalSize && (
            <div className="md:col-span-2 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg mt-4">
              <p className="font-semibold">
                Calculated Final Size:{' '}
                <span className="text-lg font-bold">
                  {formatFraction(roundToEighth(finalSize.w))}&quot; ×{' '}
                  {formatFraction(roundToEighth(finalSize.h))}&quot;
                </span>
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:opacity-50"
          >
            {saving
              ? isEditing
                ? 'Updating...'
                : 'Saving...'
              : isEditing
                ? 'Update Window'
                : 'Save Window'}
          </button>

          {isEditing && (
            <button
              onClick={() => {
                clearForm();
                onCancelEdit();
              }}
              className="w-full mt-2 bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-300"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
