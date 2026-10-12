/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import Library from './components/Library';
import PreviewSheet from './components/PreviewSheet';
import SelectionPanel, { PRESET_LAYOUTS } from './components/SelectionPanel';
import { Sticker, SelectedItem, GridLayout } from './types';
import { generateA4StickerPDF } from './utils/pdfGenerator';
import { extractTextFromPDF } from './utils/pdfTextExtractor';
import {
  getAllCustomStickers,
  saveCustomSticker,
  saveMultipleCustomStickers,
  deleteCustomStickerFromDB,
} from './utils/stickerStorage';
import {
  canInstallPWA,
  onInstallableChange,
  promptPWAInstall,
  isRunningStandalone,
  getOfflineStatus,
  cacheAllStickersForOffline,
  CacheStatus,
  CacheProgress,
} from './utils/pwa';

export default function App() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [layout, setLayout] = useState<GridLayout>({ ...PRESET_LAYOUTS[2] }); // Default to 5x8 grid (30mm)
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // PWA and Offline states
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(isRunningStandalone());
  const [offlineStatus, setOfflineStatus] = useState<CacheStatus | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [showInstallHelpModal, setShowInstallHelpModal] = useState<boolean>(false);
  const [isCaching, setIsCaching] = useState<boolean>(false);
  const [cacheProgress, setCacheProgress] = useState<CacheProgress | null>(null);

  // Load custom stickers from IndexedDB on startup
  useEffect(() => {
    getAllCustomStickers().then((saved) => {
      if (saved && saved.length > 0) {
        setCustomStickers(saved);
      }
    });
  }, []);

  // Listen to network status, PWA install prompt, and cache status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = onInstallableChange((can) => {
      setCanInstall(can);
    });

    getOfflineStatus().then(setOfflineStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptPWAInstall();
      if (accepted) {
        setIsStandalone(true);
        triggerAlert('Geweldig! De app is nu geïnstalleerd en vindbaar in je programma\'s.');
      }
    } else {
      setShowInstallHelpModal(true);
    }
  };

  const handleStartCacheAll = async () => {
    try {
      setIsCaching(true);
      setCacheProgress({ completed: 0, total: 100, percentage: 0 });
      await cacheAllStickersForOffline((prog) => {
        setCacheProgress(prog);
      });
      const updated = await getOfflineStatus();
      setOfflineStatus(updated);
      triggerAlert('Alle stickers en thumbnails zijn succesvol offline opgeslagen in je browser!');
    } catch (err: any) {
      console.error(err);
      triggerAlert(`Fout bij offline cachen: ${err?.message || 'Onbekende fout'}`);
    } finally {
      setIsCaching(false);
    }
  };

  const totalCapacity = layout.rows * layout.cols;
  const currentTotal = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Helper to trigger temporary feedback alert messages
  const triggerAlert = (message: string) => {
    setAlertMessage(message);
    setTimeout(() => {
      setAlertMessage((prev) => (prev === message ? null : prev));
    }, 4500);
  };

  // Add sticker from library
  const handleAddSticker = (sticker: Sticker) => {
    if (currentTotal >= totalCapacity) {
      triggerAlert(`Het stickervel is al vol (${totalCapacity}/${totalCapacity} stickers). Wijzig de lay-out of verlaag andere aantallen.`);
      return;
    }

    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.sticker.id === sticker.id);
      if (existing) {
        return prev.map((item) =>
          item.sticker.id === sticker.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { sticker, quantity: 1 }];
      }
    });
  };

  // Add uploaded custom PDF sticker to library
  const handleAddCustomSticker = (newSticker: Sticker) => {
    setCustomStickers((prev) => [newSticker, ...prev]);
    saveCustomSticker(newSticker);
    // Auto add to selection as well for convenience
    handleAddSticker(newSticker);
    triggerAlert(`Sticker "${newSticker.name}" is toegevoegd aan de bibliotheek!`);
  };

  // Add multiple uploaded stickers in batch
  const handleAddMultipleCustomStickers = (newStickers: Sticker[]) => {
    setCustomStickers((prev) => [...newStickers, ...prev]);
    saveMultipleCustomStickers(newStickers);
    triggerAlert(`${newStickers.length} stickers zijn toegevoegd aan de bibliotheek!`);
  };

  // Delete custom sticker from library and IndexedDB
  const handleDeleteCustomSticker = (id: string | number) => {
    setCustomStickers((prev) => prev.filter((s) => s.id !== id));
    setSelectedItems((prev) => prev.filter((item) => item.sticker.id !== id));
    deleteCustomStickerFromDB(id);
    triggerAlert('Sticker is verwijderd uit je bibliotheek.');
  };

  // Import order form and auto-fill
  const handleImportOrderForm = async (file: File) => {
    try {
      triggerAlert(`Bestelbon "${file.name}" analyseren...`);
      const text = await extractTextFromPDF(file);
      
      const res = await fetch('/stickers.json');
      if (!res.ok) throw new Error('Kon stickers.json niet inladen');
      const allDefaultStickers: Sticker[] = await res.json();
      
      const lowerText = text.toLowerCase();
      const matchedStickers = allDefaultStickers.filter(sticker => {
        const nameLower = sticker.name.toLowerCase();
        // Specifically look for the name in quotes or just as a word
        return lowerText.includes(`'${nameLower}'`) || 
               lowerText.includes(`"${nameLower}"`) ||
               (nameLower.length > 3 && lowerText.includes(nameLower)); // Fallback for names > 3 chars
      });

      if (matchedStickers.length === 0) {
        triggerAlert('Geen bekende stickers gevonden op deze bestelbon.');
        return;
      }

      // Add them to the selection (1 of each)
      setSelectedItems((prev) => {
        let newSelection = [...prev];
        let addedCount = 0;

        for (const sticker of matchedStickers) {
          const existing = newSelection.find((item) => item.sticker.id === sticker.id);
          if (!existing) {
            newSelection.push({ sticker, quantity: 1 });
            addedCount++;
          }
        }
        return newSelection;
      });

      triggerAlert(`${matchedStickers.length} stickers herkend en toegevoegd aan je vel!`);
    } catch (err: any) {
      console.error(err);
      triggerAlert(`Er is een fout opgetreden bij inlezen: ${err.message}`);
    }
  };

  // Remove sticker from selection
  const handleRemoveItem = (stickerId: string | number) => {
    setSelectedItems((prev) => prev.filter((item) => item.sticker.id !== stickerId));
  };

  // Update sticker quantity in selection
  const handleUpdateQuantity = (stickerId: string | number, newQuantity: number) => {
    const itemToUpdate = selectedItems.find((item) => item.sticker.id === stickerId);
    if (!itemToUpdate) return;

    const currentOtherQty = selectedItems
      .filter((item) => item.sticker.id !== stickerId)
      .reduce((acc, item) => acc + item.quantity, 0);

    const targetTotal = currentOtherQty + newQuantity;

    if (targetTotal > totalCapacity) {
      // Limit to max remaining slots
      const maxAllowed = totalCapacity - currentOtherQty;
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.sticker.id === stickerId ? { ...item, quantity: maxAllowed } : item
        )
      );
      triggerAlert(`Aantal gelimiteerd tot ${maxAllowed} om binnen de lay-out capaciteit van ${totalCapacity} te blijven.`);
    } else {
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.sticker.id === stickerId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  // Clear entire selection
  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  // Fill remaining blank grid positions with one specific sticker
  const handleFillRemaining = (stickerId: string | number) => {
    const item = selectedItems.find((item) => item.sticker.id === stickerId);
    if (!item) return;

    const remaining = totalCapacity - currentTotal;
    if (remaining <= 0) return;

    setSelectedItems((prev) =>
      prev.map((item) =>
        item.sticker.id === stickerId
          ? { ...item, quantity: item.quantity + remaining }
          : item
      )
    );
    triggerAlert(`Vel gevuld met ${remaining} extra "${item.sticker.name}" stickers.`);
  };

  // Download compiled PDF
  const handleGeneratePDF = async () => {
    if (selectedItems.length === 0) return;
    setIsGenerating(true);
    
    // Simulate slight lag for delightful build animation
    setTimeout(async () => {
      try {
        await generateA4StickerPDF(selectedItems, layout);
      } catch (err) {
        console.error(err);
        triggerAlert('Er is een fout opgetreden bij het genereren van de PDF.');
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-100 shadow-xs sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-500/10 shrink-0">
              <Icons.Printer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-1.5">
                Ronde Sticker A4 Generator
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold font-sans">
                  v1.2
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Stel eenvoudig je eigen ronde stickervellen samen en print ze direct uit op A4-formaat.
              </p>
            </div>
          </div>

          {/* Header Action Badges & Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Online / Offline status badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'Online (en offline gereed)' : 'Geen internetverbinding (werkt offline)'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>{offlineStatus?.isFullyCached ? '100% Offline Gereed' : 'Online'}</span>
                </>
              ) : (
                <>
                  <Icons.WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Offline Modus</span>
                </>
              )}
            </div>

            {/* Offline Cache Button */}
            <button
              onClick={() => setShowOfflineModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200/70 transition-all cursor-pointer"
              title="Beheer offline opslag van stickers"
            >
              <Icons.HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Offline Opslag</span>
              {offlineStatus && offlineStatus.pdfCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-white text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                  {offlineStatus.pdfCount}
                </span>
              )}
            </button>

            {/* Install PWA Button (if not already opened in standalone mode) */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
                title="Installeer als standalone desktop app"
              >
                <Icons.Download className="w-3.5 h-3.5" />
                <span>Installeer App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Warning/Success Floating Toast notifications */}
      {alertMessage && (
        <div className="fixed bottom-6 left-6 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-xl p-4 border border-slate-800 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-5 duration-200 z-50">
          <Icons.Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs font-medium pr-4">{alertMessage}</div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded-md transition-colors absolute top-2.5 right-2.5"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global compilation loader overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center gap-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center max-w-xs text-center">
            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4 animate-bounce">
              <Icons.FileText className="w-8 h-8" />
            </div>
            <Icons.Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <h3 className="font-bold text-slate-900">PDF Opbouwen...</h3>
            <p className="text-xs text-slate-500 mt-1">
              Coördinaten berekenen en ronde vectoren insluiten. De download start over enkele ogenblikken.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Library & Uploader */}
        <section className="lg:col-span-4 h-full">
          <Library
            onAddSticker={handleAddSticker}
            customStickers={customStickers}
            onAddCustomSticker={handleAddCustomSticker}
            onAddMultipleCustomStickers={handleAddMultipleCustomStickers}
            onDeleteCustomSticker={handleDeleteCustomSticker}
          />
        </section>

        {/* Center: Live Preview Sheet */}
        <section className="lg:col-span-4 h-full flex flex-col">
          <PreviewSheet
            selectedItems={selectedItems}
            layout={layout}
          />
          
          {/* Quick Reset Action under the sheet */}
          {selectedItems.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100/80 hover:text-rose-600 rounded-xl border border-rose-100 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <Icons.Trash2 className="w-4 h-4" />
                Vel leegmaken
              </button>
            </div>
          )}
        </section>

        {/* Right Column: Selections & Formats */}
        <section className="lg:col-span-4 h-full">
          <SelectionPanel
            selectedItems={selectedItems}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onClearSelection={handleClearSelection}
            onFillRemaining={handleFillRemaining}
            layout={layout}
            onLayoutChange={setLayout}
            onGenerate={handleGeneratePDF}
            onImportOrderForm={handleImportOrderForm}
          />
        </section>
      </main>

      {/* Footer bar */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 mt-auto">
        <p>© 2026 Ronde Sticker A4 Generator. Gebouwd met React, Tailwind CSS en pdf-lib.</p>
      </footer>

      {/* Offline Storage Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Icons.HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Offline Opslag & Caching</h3>
                  <p className="text-xs text-slate-500">Gebruik de generator overal zonder internet</p>
                </div>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Door alle stickers vooraf offline op te slaan, worden de originele PDF-vectoren en afbeeldingen in je browser bewaard. Je kunt daarna overal stickervellen ontwerpen en downloaden, zelfs in een magazijn of onderweg zonder wifi.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-400">PDF Stickers Opgeslagen</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">
                    {offlineStatus?.pdfCount ?? 0}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      / {offlineStatus?.totalStickers || 163}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-400">Thumbnails Opgeslagen</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">
                    {offlineStatus?.thumbCount ?? 0}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      / {offlineStatus?.totalStickers || 163}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar during caching */}
              {isCaching && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Icons.Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Stickers downloaden & cachen...
                    </span>
                    <span>{cacheProgress?.percentage ?? 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200 rounded-full"
                      style={{ width: `${cacheProgress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-indigo-600 text-right">
                    {cacheProgress?.completed ?? 0} / {cacheProgress?.total ?? 0} bestanden
                  </div>
                </div>
              )}

              {offlineStatus?.isFullyCached && !isCaching && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                  <Icons.CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Alle {offlineStatus.totalStickers} stickers zijn 100% lokaal opgeslagen en direct offline klaar voor gebruik!</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Sluiten
              </button>
              <button
                onClick={handleStartCacheAll}
                disabled={isCaching}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isCaching ? (
                  <>
                    <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Downloaden...</span>
                  </>
                ) : (
                  <>
                    <Icons.DownloadCloud className="w-3.5 h-3.5" />
                    <span>{offlineStatus?.isFullyCached ? 'Opnieuw Cachen' : 'Alles Nu Offline Opslaan'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Help Modal */}
      {showInstallHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Icons.Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">App Installeren</h3>
                  <p className="text-xs text-slate-500">Gebruik als standalone programma</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallHelpModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <p>
                Je kunt deze generator rechtstreeks als losse desktop-applicatie op je computer installeren:
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Google Chrome of Microsoft Edge
                </div>
                <p className="text-slate-600">
                  Klik rechtsboven in de adresbalk op het <strong>Installatie-icoon</strong> (schermpje met pijltje naar beneden) of ga in het menu naar <em>Apps ➔ Deze app installeren</em>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Safari op Mac (macOS Sonoma / Sequoia)
                </div>
                <p className="text-slate-600">
                  Klik in de bovenste menubalk op <strong>Archief (File)</strong> ➔ <strong>Voeg toe aan Dock...</strong>. De generator opent dan als een echte Mac-app met een eigen venster!
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  iPad of iPhone
                </div>
                <p className="text-slate-600">
                  Tik op de Deel-knop onderaan en kies <strong>Zet op beginscherm</strong>.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowInstallHelpModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Begrepen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
