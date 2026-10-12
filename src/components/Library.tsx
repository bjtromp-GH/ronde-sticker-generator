import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { Sticker } from '../types';
import { generatePdfThumbnail, cleanStickerName } from '../utils/pdfThumbnail';

interface LibraryProps {
  onAddSticker: (sticker: Sticker) => void;
  customStickers: Sticker[];
  onAddCustomSticker: (sticker: Sticker) => void;
  onAddMultipleCustomStickers?: (stickers: Sticker[]) => void;
  onDeleteCustomSticker?: (id: string | number) => void;
}

export default function Library({
  onAddSticker,
  customStickers,
  onAddCustomSticker,
  onAddMultipleCustomStickers,
  onDeleteCustomSticker,
}: LibraryProps) {
  const [defaultStickers, setDefaultStickers] = useState<Sticker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'default' | 'custom'>('all');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Single upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('#6366f1');
  const [uploadedBytes, setUploadedBytes] = useState<Uint8Array | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedThumbnail, setUploadedThumbnail] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stickers from stickers.json
  const loadDefaultStickers = () => {
    setIsLoading(true);
    fetch('/stickers.json')
      .then((res) => {
        if (!res.ok) throw new Error('Kon stickers.json niet laden');
        return res.json();
      })
      .then((data) => {
        setDefaultStickers(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Kon standaard stickerbibliotheek niet inladen.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadDefaultStickers();
  }, []);

  // Helper to reliably convert a File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Fallback helper to convert Uint8Array to base64
  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Try saving to local Vite server if in development mode
  const trySaveToServer = async (
    filesPayload: { name: string; dataBase64: string }[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/upload-stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Reload default stickers so the newly saved files show up in standard library
          loadDefaultStickers();
          return true;
        }
      }
    } catch {
      // Endpoint not available (e.g. running on Vercel static build)
    }
    return false;
  };

  // Handle file selection (single or multiple)
  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      alert('Selecteer a.u.b. geldige PDF bestanden.');
      return;
    }

    // Single file upload: open customizer modal with instant live thumbnail
    if (pdfFiles.length === 1) {
      const file = pdfFiles[0];
      setIsProcessing(true);
      setProcessingStatus(`Thumbnail genereren voor ${file.name}...`);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const thumb = await generatePdfThumbnail(bytes);
        const cleanedName = cleanStickerName(file.name);

        setUploadedBytes(bytes);
        setUploadedFile(file);
        setUploadedFileName(file.name);
        setCustomName(cleanedName);
        setCustomText('');
        setCustomColor('#6366f1');
        setUploadedThumbnail(thumb);
        setShowUploadModal(true);
      } catch (err) {
        console.error('Fout bij verwerken van PDF:', err);
        alert('Er is een fout opgetreden bij het inlezen van het PDF bestand.');
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
      return;
    }

    // Batch upload (multiple PDFs)
    setIsProcessing(true);
    setProcessingStatus(`0 / ${pdfFiles.length} stickers verwerken...`);

    const newStickers: Sticker[] = [];
    const serverPayload: { name: string; dataBase64: string }[] = [];
    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e'];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setProcessingStatus(`${i + 1} / ${pdfFiles.length}: "${cleanStickerName(file.name)}"...`);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const thumb = await generatePdfThumbnail(bytes);
        const name = cleanStickerName(file.name);
        const safeBase = name
          .replace(/[/\\?%*:|"<>]/g, '')
          .trim()
          .replace(/\s+/g, '_');
        const targetFileName = `VE_Ø30mm_${safeBase}.pdf`;

        const base64Data = await fileToBase64(file);

        serverPayload.push({
          name: targetFileName,
          dataBase64: base64Data,
        });

        newStickers.push({
          id: `custom_${Date.now()}_${i}`,
          name,
          fileName: targetFileName,
          color: colors[i % colors.length],
          icon: 'FileText',
          text: name,
          isCustom: true,
          pdfBytes: bytes.slice(0),
          thumbnailUrl: thumb,
        });
      } catch (err) {
        console.error(`Fout bij verwerken van ${file.name}:`, err);
      }
    }

    // Check if we can sync directly to localhost server public/PDFs/
    const savedToServer = await trySaveToServer(serverPayload);

    if (!savedToServer && newStickers.length > 0) {
      // Save locally to IndexedDB/state
      if (onAddMultipleCustomStickers) {
        onAddMultipleCustomStickers(newStickers);
      } else {
        newStickers.forEach((st) => onAddCustomSticker(st));
      }
    }

    setIsProcessing(false);
    setProcessingStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSingleCustomSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedBytes || !customName.trim()) return;

    const cleanName = customName.trim();
    const safeBase = cleanName
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const targetFileName = `VE_Ø30mm_${safeBase}.pdf`;

    let base64Data = '';
    if (uploadedFile) {
      try {
        base64Data = await fileToBase64(uploadedFile);
      } catch (err) {
        console.error('Fout bij converteren naar base64:', err);
      }
    }
    if (!base64Data) {
      base64Data = uint8ToBase64(uploadedBytes);
    }

    const serverPayload = [
      {
        name: targetFileName,
        dataBase64: base64Data,
      },
    ];

    const savedToServer = await trySaveToServer(serverPayload);

    const createdSticker: Sticker = {
      id: `custom_${Date.now()}`,
      name: cleanName,
      fileName: targetFileName,
      color: customColor,
      icon: 'FileText',
      text: customText.trim() || cleanName,
      isCustom: !savedToServer,
      pdfBytes: uploadedBytes.slice(0),
      thumbnailUrl: uploadedThumbnail,
    };

    if (savedToServer) {
      onAddSticker(createdSticker);
    } else {
      onAddCustomSticker(createdSticker);
    }

    // Reset state & close modal
    setCustomName('');
    setCustomText('');
    setCustomColor('#6366f1');
    setUploadedBytes(null);
    setUploadedFile(null);
    setUploadedFileName('');
    setUploadedThumbnail('');
    setShowUploadModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const allStickers = [...defaultStickers, ...customStickers];

  const tabFilteredStickers = allStickers.filter((sticker) => {
    if (activeTab === 'default') return !sticker.isCustom;
    if (activeTab === 'custom') return sticker.isCustom;
    return true;
  });

  const filteredStickers = tabFilteredStickers.filter(
    (sticker) =>
      sticker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sticker.fileName && sticker.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col" id="sticker-library">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            <Icons.Library className="w-5 h-5 text-indigo-500 shrink-0" />
            1. De Bibliotheek
          </h2>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Kies uit standaard stickers of sleep nieuwe PDF-stickers hierheen.
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

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Alle ({allStickers.length})
        </button>
        <button
          onClick={() => setActiveTab('default')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'default'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Standaard ({defaultStickers.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'custom'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>Eigen ({customStickers.length})</span>
          {customStickers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Upload Drag & Drop area */}
      <div className="mb-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-200 ease-in-out text-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            ref={fileInputRef}
            id="file-upload-input"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center py-2 space-y-2">
              <Icons.Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">
                {processingStatus || 'PDF bestanden verwerken...'}
              </span>
            </div>
          ) : (
            <>
              <div className="p-2.5 bg-white rounded-full shadow-xs border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-200">
                <Icons.Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-700 mt-2 group-hover:text-indigo-600 transition-colors">
                Nieuwe sticker(s) uploaden
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Sleep 1 of meerdere PDF's hierheen, of klik om te kiezen
              </span>
            </>
          )}
        </label>
      </div>

      {/* Stickers grid */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4 max-h-[calc(100vh-230px)]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Icons.Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm">Bibliotheek laden...</span>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
              {filteredStickers.map((sticker) => (
                <div key={sticker.id} className="relative group">
                  <button
                    id={`sticker-btn-${sticker.id}`}
                    onClick={() => onAddSticker(sticker)}
                    className="w-full relative flex flex-col items-center text-center p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {/* Circle preview */}
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-xs relative shrink-0 transition-transform group-hover:scale-105 group-hover:shadow-md overflow-hidden mb-2.5"
                      style={{
                        backgroundColor: '#ffffff',
                        border: sticker.isCustom ? `2px solid ${sticker.color}` : '1px solid #e2e8f0',
                      }}
                    >
                      {sticker.thumbnailUrl || (!sticker.isCustom && sticker.fileName) ? (
                        <img
                          src={
                            sticker.thumbnailUrl ||
                            `/thumbnails/${encodeURI(sticker.fileName.replace('.pdf', '.png'))
                              .replace(/#/g, '%23')}`
                          }
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
                      {sticker.isCustom && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                          Eigen sticker
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Delete button for custom stickers */}
                  {sticker.isCustom && onDeleteCustomSticker && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Weet je zeker dat je sticker "${sticker.name}" wilt verwijderen uit je bibliotheek?`
                          )
                        ) {
                          onDeleteCustomSticker(sticker.id);
                        }
                      }}
                      title="Verwijder deze eigen sticker"
                      className="absolute top-1.5 right-1.5 z-30 p-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full shadow-xs border border-slate-200 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Icons.Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {filteredStickers.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                {activeTab === 'custom'
                  ? 'Nog geen eigen stickers geüpload. Sleep een PDF hierboven naar binnen!'
                  : 'Geen stickers gevonden voor deze zoekopdracht.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Upload Custom Sticker Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.Sparkles className="text-indigo-500 w-5 h-5" />
                Nieuwe Sticker Toevoegen
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedBytes(null);
                  setUploadedThumbnail('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleCustomSticker} className="p-6 space-y-4">
              {/* Live Thumbnail Preview */}
              <div className="flex flex-col items-center justify-center pb-2">
                <div
                  className="w-24 h-24 rounded-full shadow-md border-2 overflow-hidden flex items-center justify-center relative bg-white"
                  style={{ borderColor: customColor }}
                >
                  {uploadedThumbnail ? (
                    <img
                      src={uploadedThumbnail}
                      alt={customName}
                      className="w-[120%] h-[120%] max-w-none object-cover"
                    />
                  ) : (
                    <Icons.FileText className="w-8 h-8 text-indigo-500" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-2 font-mono truncate max-w-[280px]">
                  {uploadedFileName}
                </span>
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
                  placeholder="Bijv: Oude Kaas 48+"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Themakleur Rand
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
                    setUploadedThumbnail('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4" /> Toevoegen aan Bieb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
