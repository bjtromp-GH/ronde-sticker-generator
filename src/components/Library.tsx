import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { Sticker } from '../types';

interface LibraryProps {
  onAddSticker: (sticker: Sticker) => void;
  customStickers: Sticker[];
  onAddCustomSticker: (sticker: Sticker) => void;
}

export default function Library({
  onAddSticker,
  customStickers,
  onAddCustomSticker,
}: LibraryProps) {
  const [defaultStickers, setDefaultStickers] = useState<Sticker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom sticker modal / state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('#6366f1');
  const [uploadedBytes, setUploadedBytes] = useState<Uint8Array | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch default stickers from stickers.json
  useEffect(() => {
    fetch('/stickers.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Kon stickers.json niet laden');
        }
        return res.json();
      })
      .then((data) => {
        setDefaultStickers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Kon standaard stickerbibliotheek niet inladen. Gebruikt fallback-stickers.');
        setIsLoading(false);
        // Fallback static data in case the file can't be fetched
        setDefaultStickers([
          {
            id: 1,
            name: "Bedankt!",
            fileName: "sticker1_bedankt.pdf",
            color: "#10b981",
            icon: "Heart",
            text: "Bedankt voor je bestelling!"
          },
          {
            id: 2,
            name: "Handmade",
            fileName: "sticker2_handmade.pdf",
            color: "#f59e0b",
            icon: "Hammer",
            text: "Handmade with Love"
          },
          {
            id: 3,
            name: "Gefeliciteerd",
            fileName: "sticker3_gefeliciteerd.pdf",
            color: "#3b82f6",
            icon: "PartyPopper",
            text: "Hoera! Gefeliciteerd!"
          },
          {
            id: 4,
            name: "Speciaal voor Jou",
            fileName: "sticker4_speciaal.pdf",
            color: "#ec4899",
            icon: "Gift",
            text: "Speciaal voor jou ingepakt"
          },
          {
            id: 5,
            name: "Biologisch & Vers",
            fileName: "sticker5_biologisch.pdf",
            color: "#84cc16",
            icon: "Leaf",
            text: "100% Natuurlijk & Biologisch"
          }
        ]);
      });
  }, []);

  // Handle PDF file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Selecteer a.u.b. een geldig PDF bestand.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      setUploadedBytes(new Uint8Array(arrayBuffer));
      setUploadedFileName(file.name);
      
      // Auto-populate name with the file name (without extension)
      const defaultLabel = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setCustomName(defaultLabel.charAt(0).toUpperCase() + defaultLabel.slice(1));
      setShowUploadModal(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveCustomSticker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedBytes || !customName.trim()) return;

    const newSticker: Sticker = {
      id: `custom_${Date.now()}`,
      name: customName,
      fileName: uploadedFileName,
      color: customColor,
      icon: 'FileText',
      text: customText.trim() || 'Geüploade Sticker-PDF',
      isCustom: true,
      pdfBytes: uploadedBytes,
    };

    onAddCustomSticker(newSticker);
    
    // Reset state & close modal
    setCustomName('');
    setCustomText('');
    setCustomColor('#6366f1');
    setUploadedBytes(null);
    setUploadedFileName('');
    setShowUploadModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to dynamically render Lucide Icons by name
  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-6 h-6" style={{ color }} />;
  };

  const allStickers = [...defaultStickers, ...customStickers];
  
  const filteredStickers = allStickers.filter(sticker => 
    sticker.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (sticker.fileName && sticker.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col" id="sticker-library">
      <div className="flex flex-wrap items-end justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            <Icons.Library className="w-5 h-5 text-indigo-500 shrink-0" />
            1. De Bibliotheek
          </h2>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Kies uit standaard stickers of upload je eigen PDF.
          </p>
        </div>
        <div className="relative shrink-0">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoeken..."
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-32 md:w-40 transition-all"
          />
        </div>
      </div>

      {/* Upload area */}
      <div className="mb-6">
        <label className="group relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-5 cursor-pointer transition-all duration-200 ease-in-out text-center">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
            id="file-upload-input"
          />
          <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-200">
            <Icons.Upload className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-slate-700 mt-3 group-hover:text-indigo-600 transition-colors">
            Upload eigen sticker-PDF
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Alleen .pdf bestanden (enkele ronde sticker)
          </span>
        </label>
      </div>

      {/* Stickers grid */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4 max-h-[calc(100vh-180px)]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Icons.Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm">Bibliotheek laden...</span>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  id={`sticker-btn-${sticker.id}`}
                  onClick={() => onAddSticker(sticker)}
                  className="group relative flex flex-col items-center text-center p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {/* Circle preview tag */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm relative shrink-0 transition-transform group-hover:scale-105 group-hover:shadow-md overflow-hidden mb-2.5"
                    style={{ backgroundColor: sticker.isCustom ? `${sticker.color}15` : '#ffffff', border: sticker.isCustom ? `2px solid ${sticker.color}` : '1px solid #e2e8f0' }}
                  >
                    {!sticker.isCustom && sticker.fileName ? (
                        <img 
                          src={`/thumbnails/${encodeURI(sticker.fileName.replace('.pdf', '.png')).replace(/#/g, '%23').replace(/\+/g, '%2B')}`} 
                          alt={sticker.name}
                        className="w-[120%] h-[120%] max-w-none object-cover absolute top-1/2 left-1/2"
                        style={{ transform: 'translate(-50%, -50%)' }}
                      />
                    ) : (
                      <>
                        <div
                          className="absolute inset-1 rounded-full border border-dashed border-white/50"
                          style={{ backgroundColor: sticker.color }}
                        ></div>
                        <div className="relative z-10 flex items-center justify-center">
                          <Icons.FileText className="w-5 h-5 text-white" />
                        </div>
                      </>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-indigo-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                      <Icons.Plus className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>

                  <div className="w-full px-1">
                    <h3 className="font-semibold text-xs leading-tight text-slate-700 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {sticker.name}
                    </h3>
                  </div>
                </button>
              ))}
            </div>

            {allStickers.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                Geen stickers beschikbaar. Upload er een!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Custom Sticker Modal / Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.FileText className="text-indigo-500 w-5 h-5" />
                Nieuwe Sticker Aanpassen
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedBytes(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomSticker} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Geselecteerd PDF Bestand:
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs truncate">
                  <Icons.FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{uploadedFileName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Sticker Naam / Label *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Bijv: Logo Bedankt"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Subtekst / Beschrijving (Optioneel)
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Bijv: Bedankt voor je bestelling"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Themakleur (voor UI & Fallback)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#6366f1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadedBytes(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4" /> Opslaan in Bieb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
