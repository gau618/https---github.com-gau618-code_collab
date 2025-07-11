// utils/extractCleanContent.ts
export function extractCleanContent(content: any): string {
  if (!content) return '';
  
  let rawContent = '';
  if (typeof content === 'string') {
    rawContent = content;
  } else if (content instanceof Uint8Array) {
    rawContent = new TextDecoder('utf-8', { ignoreBOM: true }).decode(content);
  } else if (Array.isArray(content)) {
    rawContent = new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(content));
  } else {
    rawContent = String(content);
  }
  
  // More aggressive cleaning for Monaco Editor artifacts
  let cleaned = rawContent
    // Remove all non-printable characters except newlines, tabs, and carriage returns
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove Monaco Editor specific metadata
    .replace(/monaco[^a-zA-Z0-9\s]*/g, '')
    // Remove any remaining control characters
    .replace(/\uFEFF/g, '') // Remove BOM
    .replace(/\u200B/g, '') // Remove zero-width space
    // Split into lines and clean each line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^[\x00-\x1F\x7F-\x9F]*$/))
    .join('\n')
    .trim();
  
  return cleaned;
}
