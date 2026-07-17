"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pdfjsLib = require("pdfjs-dist/build/pdf");
var pdf_worker_url_1 = require("pdfjs-dist/build/pdf.worker?url");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdf_worker_url_1.default;
