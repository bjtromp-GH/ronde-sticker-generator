/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import Library from './components/Library';
import PreviewSheet from './components/PreviewSheet';
import SelectionPanel, { PRESET_LAYOUTS } from './components/SelectionPanel';
import { Sticker, SelectedItem, GridLayout } from './types';
import { generateA4StickerPDF } from './utils/pdfGenerator';
import { extractTextFromPDF } from './utils/pdfTextExtractor';

export default function App() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [layout, setLayout] = useState<GridLayout>({ ...PRESET_LAYOUTS[2] }); // Default to 5x8 grid (30mm)
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
    // Auto add to selection as well for convenience
    handleAddSticker(newSticker);
    triggerAlert(`Sticker "${newSticker.name}" is toegevoegd aan de bibliotheek!`);
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
        const aliases = [nameLower];

        // Slimme alias generator voor prijs-stickers (bijv: "Prijs 295" -> "€2,95")
        if (nameLower.startsWith('prijs ')) {
          const numPart = nameLower.replace('prijs ', '').split(' ')[0]; // haalt "rood" eraf
          if (numPart.includes('voor')) {
            const parts = numPart.split('voor');
            const amount = parts[0];
            const priceRaw = parts[1].replace(',', '');
            const p1 = priceRaw.length >= 3 ? priceRaw.slice(0, -2) + ',' + priceRaw.slice(-2) : priceRaw;
            const p2 = priceRaw.length >= 3 ? priceRaw.slice(0, -2) + ',' + priceRaw.slice(-2) : priceRaw + ',00';
            aliases.push(`${amount} voor €${p1}`, `${amount} voor €${p2}`, `${amount} voor ${p1}`, `${amount} voor ${p2}`);
          } else {
            const priceRaw = numPart.replace(',', '');
            const p1 = priceRaw.length >= 3 ? priceRaw.slice(0, -2) + ',' + priceRaw.slice(-2) : priceRaw;
            const p2 = priceRaw.length >= 3 ? priceRaw.slice(0, -2) + ',' + priceRaw.slice(-2) : priceRaw + ',00';
            aliases.push(`€${p1}`, `€${p2}`, p1, p2);
          }
        }

        return aliases.some(alias => 
          lowerText.includes(`'${alias}'`) || 
          lowerText.includes(`"${alias}"`) ||
          (alias.length >= 3 && lowerText.includes(alias))
        );
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
    </div>
  );
}
