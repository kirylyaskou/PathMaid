import { invoke } from '@tauri-apps/api/core'

export interface StatblockOcrLine {
  text: string
  score?: number | null
}

export interface StatblockOcrPage {
  pageIndex: number
  lines: StatblockOcrLine[]
}

export interface StatblockOcrResult {
  text: string
  pages: StatblockOcrPage[]
}

export async function recognizeStatblockFile(file: File, lang = 'en'): Promise<StatblockOcrResult> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()))
  return invoke<StatblockOcrResult>('ocr_statblock_file_bytes', {
    fileName: file.name,
    fileBytes: bytes,
    lang,
  })
}
