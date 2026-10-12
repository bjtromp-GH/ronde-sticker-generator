import React from 'react';
import * as Icons from 'lucide-react';
import { SelectedItem, GridLayout } from '../types';

interface SelectionPanelProps {
  selectedItems: SelectedItem[];
  onRemoveItem: (stickerId: string | number) => void;
  onUpdateQuantity: (stickerId: string | number, quantity: number) => void;
  onClearSelection: () => void;
  onFillRemaining: (stickerId: string | number) => void;
  layout: GridLayout;
  onLayoutChange: (layout: GridLayout) => void;
  onGenerate: () => void;
  onImportOrderForm?: (file: File) => void;
}

export const PRESET_LAYOUTS: GridLayout[] = [
  {
    id: '3x4',
    name: 'Grote Labels (3 x 4, Ø 60mm)',
    rows: 4,
    cols: 3,
    labelWidth: 60,
    labelHeight: 60,
    spacingX: 5,
    spacingY: 5,
    marginTop: 21,
    marginLeft: 10,
  },
  {
    id: '4x6',
    name: 'Medium Labels (4 x 6, Ø 40mm)',
    rows: 6,
    cols: 4,
    labelWidth: 40,
    labelHeight: 40,
    spacingX: 4,
    spacingY: 4,
    marginTop: 18.5,
    marginLeft: 19,
  },
  {
    id: '5x8',
    name: 'Kleine Labels (5 x 8, Ø 30mm)',
    rows: 8,
    cols: 5,
    labelWidth: 30,
    labelHeight: 30,
    spacingX: 5,
    spacingY: 5,
    marginTop: 11,
    marginLeft: 20,
  },
];

export default function SelectionPanel({
  selectedItems,
  onRemoveItem,
  onUpdateQuantity,
  onClearSelection,
  onFillRemaining,
  layout,
  onLayoutChange,
  onGenerate,
  onImportOrderForm,
}: SelectionPanelProps) {
  const totalCapacity = layout.rows * layout.cols;
  const currentTotal = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const remainingSlots = Math.max(0, totalCapacity - currentTotal);

  const handlePresetSelect = (presetId: string) => {
    const found = PRESET_LAYOUTS.find((p) => p.id === presetId);
    if (found) {
      onLayoutChange({ ...found });
    }
  };

  const handleCustomDimensionChange = (key: keyof GridLayout, value: number) => {
    onLayoutChange({
      ...layout,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col" id="selection-panel">
      <div className="flex flex-wrap items-end justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            <Icons.Layers className="w-5 h-5 text-indigo-500 shrink-0" />
            2. De Selectie
          </h2>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Stel je stickervel samen en configureer de lay-out.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onImportOrderForm && (
            <label className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer">
              <Icons.FileUp className="w-3.5 h-3.5 shrink-0" />
              Bestelbon
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onImportOrderForm(e.target.files[0]);
                  }
                  e.target.value = ''; // Reset to allow same file upload again
                }} 
              />
            </label>
          )}
          {selectedItems.length > 0 && (
            <button
              onClick={onClearSelection}
              id="clear-selection-btn"
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Icons.Trash2 className="w-3.5 h-3.5 shrink-0" />
              Alles wissen
            </button>
          )}
        </div>
      </div>

      {/* Selected Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 max-h-[300px] lg:max-h-[380px]">
        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Icons.Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-semibold text-slate-500">Nog geen stickers geselecteerd</span>
            <span className="text-xs text-slate-400 mt-0.5 max-w-[200px] text-center">
              Klik op stickers in de linkerkolom om ze hier toe te voegen.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedItems.map(({ sticker, quantity }) => (
              <div
                key={sticker.id}
                id={`selected-item-${sticker.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors"
              >
                {/* Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 rounded-full border shrink-0 flex items-center justify-center overflow-hidden relative"
                    style={{ borderColor: sticker.isCustom ? sticker.color : '#e2e8f0', backgroundColor: sticker.isCustom ? `${sticker.color}10` : '#ffffff' }}
                  >
                    {sticker.thumbnailUrl || (!sticker.isCustom && sticker.fileName) ? (
                      <img 
                        src={sticker.thumbnailUrl || `/thumbnails/${encodeURI(sticker.fileName.replace('.pdf', '.png')).replace(/#/g, '%23')}`} 
                        alt={sticker.name}
                        className="w-[120%] h-[120%] max-w-none object-cover"
                      />
                    ) : (
                      <span className="text-xs font-extrabold relative z-10" style={{ color: sticker.color }}>
                        {sticker.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{sticker.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{sticker.text || sticker.fileName}</p>
                  </div>
                </div>

                {/* Counter & Action Controls */}
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {/* Fill sheet remaining */}
                  {remainingSlots > 0 && (
                    <button
                      onClick={() => onFillRemaining(sticker.id)}
                      id={`fill-remaining-${sticker.id}`}
                      title="Vul resterende posities op vel met deze sticker"
                      className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                    >
                      Vul vel
                    </button>
                  )}

                  <div className="flex items-center border border-slate-200 bg-white rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(sticker.id, Math.max(1, quantity - 1))}
                      id={`qty-minus-${sticker.id}`}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
                    >
                      <Icons.Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-slate-700">{quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(sticker.id, quantity + 1)}
                      id={`qty-plus-${sticker.id}`}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
                    >
                      <Icons.Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(sticker.id)}
                    id={`remove-btn-${sticker.id}`}
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Icons.Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid Layout Configuration */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icons.Settings className="w-3.5 h-3.5" />
            Lay-out & Print Formaat
          </h3>
          <select
            id="preset-layout-select"
            value={layout.id}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-700"
          >
            {PRESET_LAYOUTS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            <option value="custom">Aangepast formaat...</option>
          </select>
        </div>

        {/* Custom Parameters - Only show if layout.id === 'custom' or fine-tuning is needed */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Rijen (vertical)</label>
            <input
              type="number"
              min={1}
              max={15}
              value={layout.rows}
              id="layout-rows-input"
              onChange={(e) => handleCustomDimensionChange('rows', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Kolommen (horiz)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={layout.cols}
              id="layout-cols-input"
              onChange={(e) => handleCustomDimensionChange('cols', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Sticker Breedte (mm)</label>
            <input
              type="number"
              min={10}
              max={150}
              value={layout.labelWidth}
              id="layout-label-width-input"
              onChange={(e) => handleCustomDimensionChange('labelWidth', Math.max(10, parseInt(e.target.value) || 10))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Sticker Hoogte (mm)</label>
            <input
              type="number"
              min={10}
              max={150}
              value={layout.labelHeight}
              id="layout-label-height-input"
              onChange={(e) => handleCustomDimensionChange('labelHeight', Math.max(10, parseInt(e.target.value) || 10))}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Spacing & Margins Toggle / Accordion for precision users */}
        <details className="group">
          <summary className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer list-none flex items-center gap-1 select-none">
            <Icons.ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
            Geavanceerde Marges & Tussenruimte
          </summary>
          <div className="grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-slate-200/50">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tussenruimte X (mm)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={layout.spacingX}
                id="layout-spacing-x-input"
                onChange={(e) => handleCustomDimensionChange('spacingX', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tussenruimte Y (mm)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={layout.spacingY}
                id="layout-spacing-y-input"
                onChange={(e) => handleCustomDimensionChange('spacingY', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Bovenmarge (mm)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={layout.marginTop}
                id="layout-margin-top-input"
                onChange={(e) => handleCustomDimensionChange('marginTop', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Linkermarge (mm)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={layout.marginLeft}
                id="layout-margin-left-input"
                onChange={(e) => handleCustomDimensionChange('marginLeft', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700"
              />
            </div>
          </div>
        </details>
      </div>

      {/* Main Action Button */}
      <div className="space-y-3">
        <button
          onClick={onGenerate}
          disabled={currentTotal === 0}
          id="generate-pdf-btn"
          className="w-full py-4 px-6 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:shadow-none hover:shadow-indigo-500/35 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 ease-out flex items-center justify-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700"
        >
          <Icons.FileDown className="w-5 h-5 animate-pulse" />
          Genereer A4 PDF
        </button>

        {currentTotal > 0 && (
          <p className="text-[10px] text-center text-slate-400">
            Je gaat {currentTotal} stickers downloaden gerangschikt op {layout.rows}x{layout.cols} posities.
          </p>
        )}
      </div>
    </div>
  );
}
