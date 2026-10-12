export interface Sticker {
  id: string | number;
  name: string;
  fileName: string;
  color: string;
  icon: string;
  text?: string;
  isCustom?: boolean;
  pdfBytes?: Uint8Array; // ArrayBuffer containing the custom uploaded PDF
  thumbnailUrl?: string; // Preview image data URL or URL
}

export interface SelectedItem {
  sticker: Sticker;
  quantity: number;
}

export interface GridLayout {
  id: string;
  name: string;
  rows: number;
  cols: number;
  labelWidth: number; // in mm
  labelHeight: number; // in mm
  spacingX: number; // in mm
  spacingY: number; // in mm
  marginTop: number; // in mm
  marginLeft: number; // in mm
}
