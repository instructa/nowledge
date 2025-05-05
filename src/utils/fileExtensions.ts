/**
 * A set of file extensions to skip when processing web content
 * This is used to filter out non-HTML resources
 */
export const NON_HTML_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.mp4',
  '.mp3',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.m4a',
  '.ogg',
  '.wav',
  '.bmp',
  '.tiff',
  '.psd',
  '.exe',
  '.dmg',
  '.apk',
  '.bin',
  '.7z',
  '.rar',
  '.xml',
  '.rss',
  '.atom',
  '.map',
  '.txt',
  '.csv',
  '.md',
  '.yml',
  '.yaml',
  '.log',
  '.rtf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.db',
  '.sqlite',
  '.bak',
  '.swf',
  '.dat'
])

/**
 * Check if a file path has a non-HTML extension
 * @param path The file path to check
 * @returns true if the path has a non-HTML extension, false otherwise
 */
export function hasNonHtmlExtension(path: string): boolean {
  const lowercasePath = path.toLowerCase()
  return Array.from(NON_HTML_EXTENSIONS).some(ext => lowercasePath.endsWith(ext))
}