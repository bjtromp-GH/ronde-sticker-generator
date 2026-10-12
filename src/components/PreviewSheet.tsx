import React from 'react';
import * as Icons from 'lucide-react';
import { Sticker, SelectedItem, GridLayout } from '../types';

interface PreviewSheetProps {
  selectedItems: SelectedItem[];
  layout: GridLayout;
}

export default function PreviewSheet({ selectedItems, layout }: PreviewSheetProps) {
  // Flatten selected items to match positions
  const stickersToDraw: Sticker[] = [];
  selectedItems.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      stickersToDraw.push(item.sticker);
    }
  });

  const totalCapacity = layout.rows * layout.cols;
  const occupiedCount = Math.min(stickersToDraw.length, totalCapacity);

  // Layout conversion to percentages (A4 is exactly 210mm x 297mm)
  const toLeftPct = (mm: number) => (mm / 210) * 100;
  const toTopPct = (mm: number) => (mm / 297) * 100;

  const labelWidthPct = toLeftPct(layout.labelWidth);
  const labelHeightPct = toTopPct(layout.labelHeight);
  const spacingXPct = toLeftPct(layout.spacingX);
  const spacingYPct = toTopPct(layout.spacingY);
  const marginTopPct = toTopPct(layout.marginTop);
  const marginLeftPct = toLeftPct(layout.marginLeft);

  // Helper to dynamically render Lucide Icons by name
  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-white shrink-0" />;
  };

  return (
    <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200/60 flex flex-col items-center h-full" id="sticker-preview">
      <div className="w-full flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Icons.Maximize className="w-5 h-5 text-indigo-500" />
            Live A4 Voorbeeld
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time weergave van het printvel ({layout.cols}x{layout.rows} indeling).
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
            {occupiedCount} / {totalCapacity} Bezet
          </span>
        </div>
      </div>

      {/* Interactive virtual A4 Sheet */}
      <div className="w-full max-w-[420px] relative">
        {/* A4 Page Outline (210 x 297 aspect ratio) */}
        <div 
          className="w-full aspect-[210/297] bg-white rounded-md shadow-lg border border-slate-300 relative overflow-hidden select-none transition-all duration-300"
          style={{ contentVisibility: 'auto' }}
        >
          {/* Printable Margin Guidelines */}
          <div 
            className="absolute border border-dashed border-indigo-200/60 pointer-events-none"
            style={{
              top: `${marginTopPct}%`,
              left: `${marginLeftPct}%`,
              right: `${toLeftPct(210 - (layout.marginLeft + layout.cols * layout.labelWidth + (layout.cols - 1) * layout.spacingX))}%`,
              bottom: `${toTopPct(297 - (layout.marginTop + layout.rows * layout.labelHeight + (layout.rows - 1) * layout.spacingY))}%`,
            }}
          ></div>

          {/* Render individual stickers placed on absolute percentages */}
          {Array.from({ length: totalCapacity }).map((_, i) => {
            const row = Math.floor(i / layout.cols);
            const col = i % layout.cols;

            // Calculate precise offsets
            const left = marginLeftPct + col * (labelWidthPct + spacingXPct);
            const top = marginTopPct + row * (labelHeightPct + spacingYPct);

            const hasSticker = i < stickersToDraw.length;
            const sticker = hasSticker ? stickersToDraw[i] : null;

            return (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${labelWidthPct}%`,
                  height: `${labelHeightPct}%`,
                }}
              >
                {sticker ? (
                  /* Filled sticker slot mockup */
                  <div 
                    className="w-[92%] h-[92%] rounded-full shadow-xs flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: sticker.isCustom ? sticker.color : '#ffffff' }}
                  >
                    {sticker.thumbnailUrl || (!sticker.isCustom && sticker.fileName) ? (
                      <>
                        <img 
                          src={sticker.thumbnailUrl || `/thumbnails/${encodeURI(sticker.fileName.replace('.pdf', '.png')).replace(/#/g, '%23')}`} 
                          alt={sticker.name}
                          className="absolute top-1/2 left-1/2 max-w-none"
                          style={{ 
                            width: '120%', 
                            height: '120%', 
                            transform: 'translate(-50%, -50%)',
                            objectFit: 'cover'
                          }}
                        />
                        {/* Interior pre-cut dashed ring overlay */}
                        <div className="absolute inset-[0%] rounded-full border border-dashed border-black/20 z-10 pointer-events-none"></div>
                      </>
                    ) : (
                      <>
                        {/* Fallback CSS sticker for custom uploads */}
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="absolute inset-[6%] rounded-full border border-dashed border-white/40"></div>
                        
                        <div className="w-[28%] h-[28%] rounded-full bg-white flex items-center justify-center shadow-xs mb-1 relative z-10">
                          <Icons.FileText className="w-2.5 h-2.5" style={{ color: sticker.color }} />
                        </div>
                        
                        <span className="text-[7px] md:text-[8px] font-extrabold text-white leading-none text-center px-1 truncate max-w-full relative z-10">
                          {sticker.name}
                        </span>
                        
                        {sticker.text && (
                          <span className="text-[5px] md:text-[6px] text-white/90 font-medium scale-90 leading-tight text-center px-1 truncate max-w-full relative z-10 mt-0.5">
                            {sticker.text}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* Empty slot placeholder */
                  <div className="w-[92%] h-[92%] rounded-full border border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/40 flex flex-col items-center justify-center transition-colors">
                    <span className="text-[9px] font-medium text-slate-300">#{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paper Dimensions Label overlays */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 select-none hidden md:block">
          297 mm
        </div>
        <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 text-[10px] font-bold text-slate-400 select-none hidden md:block">
          210 mm (A4)
        </div>
      </div>

      <div className="w-full mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <Icons.HelpCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Tips voor de printer:</p>
          <p>1. Stel de printergrootte in op <b>100%</b> of <b>"Werkelijke Grootte"</b> (niet schalen/passend maken).</p>
          <p>2. Gebruik speciaal A4 stickervel-papier dat overeenkomt met de gekozen lay-out.</p>
        </div>
      </div>
    </div>
  );
}
