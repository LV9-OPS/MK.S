// Détection du type réel d'un fichier par ses octets (« magic bytes »).
// L'extension et le type MIME déclarés par le navigateur ne sont jamais pris pour argent comptant.
// Le SVG est volontairement refusé : il peut contenir du script.

export type FileKind = {
  mime: string;
  extensions: string[];
  /** Peut être affiché en ligne comme image d'aperçu. */
  rasterImage: boolean;
};

const KINDS = {
  png: { mime: "image/png", extensions: ["png"], rasterImage: true },
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"], rasterImage: true },
  webp: { mime: "image/webp", extensions: ["webp"], rasterImage: true },
  gif: { mime: "image/gif", extensions: ["gif"], rasterImage: true },
  pdf: { mime: "application/pdf", extensions: ["pdf"], rasterImage: false },
  zip: { mime: "application/zip", extensions: ["zip"], rasterImage: false },
  psd: { mime: "image/vnd.adobe.photoshop", extensions: ["psd"], rasterImage: false },
  mp4: { mime: "video/mp4", extensions: ["mp4", "mov"], rasterImage: false },
  webm: { mime: "video/webm", extensions: ["webm"], rasterImage: false },
  otf: { mime: "font/otf", extensions: ["otf"], rasterImage: false },
  ttf: { mime: "font/ttf", extensions: ["ttf"], rasterImage: false },
} satisfies Record<string, FileKind>;

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.slice(start, start + len));

export function sniffFileKind(bytes: Uint8Array): FileKind | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return KINDS.png;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return KINDS.jpeg;
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return KINDS.webp;
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return KINDS.gif;
  if (ascii(bytes, 0, 5) === "%PDF-") return KINDS.pdf;
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) return KINDS.zip;
  if (ascii(bytes, 0, 4) === "8BPS") return KINDS.psd;
  if (ascii(bytes, 4, 4) === "ftyp") return KINDS.mp4;
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return KINDS.webm;
  if (ascii(bytes, 0, 4) === "OTTO") return KINDS.otf;
  if (startsWith(bytes, [0x00, 0x01, 0x00, 0x00, 0x00])) return KINDS.ttf;
  return null;
}

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export const MB = 1024 * 1024;

export type UploadRules = { maxBytes: number; allowRasterOnly: boolean; label: string };
export const RESOURCE_FILE_RULES: UploadRules = { maxBytes: 100 * MB, allowRasterOnly: false, label: "fichier" };
export const PREVIEW_RULES: UploadRules = { maxBytes: 5 * MB, allowRasterOnly: true, label: "aperçu" };
export const SCREENSHOT_RULES: UploadRules = { maxBytes: 10 * MB, allowRasterOnly: true, label: "capture d'écran" };
export const META_IMAGE_RULES: UploadRules = { maxBytes: 3 * MB, allowRasterOnly: true, label: "image" };

export const RESOURCE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.zip,.psd,.mp4,.mov,.webm,.otf,.ttf";
export const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";

export type ValidatedUpload = { bytes: Buffer; kind: FileKind; originalName: string; size: number; ext: string };

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** Un champ fichier rempli (le navigateur envoie un File vide quand rien n'est choisi). */
export function isFilled(v: FormDataEntryValue | null): v is File {
  return typeof v === "object" && v !== null && "size" in v && v.size > 0;
}

/** Valide un fichier envoyé ; lève une UploadError au message lisible en cas de refus. */
export async function validateUpload(file: FormDataEntryValue | null, rules: UploadRules): Promise<ValidatedUpload> {
  if (!isFilled(file)) throw new UploadError(`Aucun ${rules.label} sélectionné.`);
  if (file.size > rules.maxBytes) {
    throw new UploadError(`Le ${rules.label} dépasse la taille maximale (${Math.round(rules.maxBytes / MB)} Mo).`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffFileKind(bytes);
  if (!kind) throw new UploadError(`Type de ${rules.label} non pris en charge ou fichier corrompu.`);
  if (rules.allowRasterOnly && !kind.rasterImage) {
    throw new UploadError(`Le ${rules.label} doit être une image PNG, JPEG, WebP ou GIF.`);
  }
  const ext = extensionOf(file.name);
  if (!kind.extensions.includes(ext)) {
    throw new UploadError(`L'extension « .${ext || "?"} » ne correspond pas au contenu réel du fichier (${kind.mime}).`);
  }
  return { bytes, kind, originalName: sanitizeFilename(file.name), size: bytes.length, ext };
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "fichier";
  return base.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/\s+/g, " ").slice(0, 150) || "fichier";
}

/** En-tête Content-Disposition sûr (RFC 6266 / 5987). */
export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const asciiName = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
