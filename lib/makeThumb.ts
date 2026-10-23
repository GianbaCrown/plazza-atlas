// Resize an image Blob to max 640px (long edge) and return a WebP blob (JPEG fallback)
export async function makeThumbBlob(source: Blob, maxEdge = 640): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(source)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8))
    let blob = await toBlob('image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
    return blob
  } catch {
    return null
  }
}