declare module "pdfkit" {
  import { Writable } from "stream"
  import { EventEmitter } from "events"

  interface PDFDocumentOptions {
    bufferPages?: boolean
    autoFirstPage?: boolean
    margin?: number | { top?: number; left?: number; right?: number; bottom?: number }
    size?: string | number[]
    layout?: "portrait" | "landscape"
    info?: Record<string, any>
  }

  interface PDFKitFontOptions {
    features?: string[]
  }

  class PDFDocument extends EventEmitter {
    constructor(options?: PDFDocumentOptions)
    addPage(options?: PDFDocumentOptions): PDFDocument
    font(font: string | Buffer, options?: PDFKitFontOptions): PDFDocument
    fontSize(size: number): PDFDocument
    fillColor(color: string): PDFDocument
    text(text: string, options?: Record<string, any>): PDFDocument
    text(text: string, x: number, options?: Record<string, any>): PDFDocument
    text(text: string, x: number, y: number, options?: Record<string, any>): PDFDocument
    moveDown(count?: number): PDFDocument
    image(src: string | Buffer | Uint8Array, x?: number, y?: number, options?: Record<string, any>): PDFDocument
    pipe(destination: Writable): PDFDocument
    end(): void
    y: number
  }

  export = PDFDocument
}
