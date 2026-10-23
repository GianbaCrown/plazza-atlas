'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import MovieAutosuggest from './MovieAutosuggest'
import { makeThumbBlob } from '@/lib/makeThumb'

interface ImageRecord {
  id: string
  storage_path: string
  thumb_path?: string | null
  caption: string
  credit: string
  is_featured: boolean
  sort_order: number
  image_movies?: any[]
}

interface Props {
  theaterId: string
  initialImages?: ImageRecord[]
  isPending?: boolean
  onPendingImagesChange?: (images: ImageRecord[]) => void
}

export default function ImageManager({ theaterId, initialImages, isPending, onPendingImagesChange }: Props) {
  const supabase = createClient()
  const [images, setImages] = useState<ImageRecord[]>(initialImages ?? [])
  const [uploading, setUploading] = useState(false)
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/`

  function notify(updated: ImageRecord[]) {
    if (isPending) onPendingImagesChange?.(updated)
  }

  function updateLocal(id: string, fields: Partial<ImageRecord>) {
    setImages((prev) => {
      const updated = prev.map((img) => img.id === id ? { ...img, ...fields } : img)
      notify(updated)
      return updated
    })
  }

  async function uploadThumb(file: File): Promise<string | null> {
    const blob = await makeThumbBlob(file)
    if (!blob) return null
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const thumbPath = `${theaterId}/thumbs/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const { error } = await supabase.storage
      .from('theater-images')
      .upload(thumbPath, blob, { cacheControl: '31536000', upsert: false })
    return error ? null : thumbPath
  }

       

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    let current = [...images]
    for (const file of Array.from(files)) {
      const path = `${theaterId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('theater-images').upload(path, file, { cacheControl: '31536000', upsert: false })
      if (uploadError) { alert(uploadError.message); continue }
            const thumbPath = await uploadThumb(file)

           const newImage: ImageRecord = {
        id: crypto.randomUUID(),
        storage_path: path,
        thumb_path: thumbPath,
        caption: '',
        credit: '',
        is_featured: current.length === 0,
        sort_order: current.length,
        image_movies: [],
      }

      if (!isPending) {
        const { data, error } = await supabase.from('images')
          .insert({ theater_id: theaterId, storage_path: path, thumb_path: thumbPath, caption: '', credit: '', is_featured: newImage.is_featured, sort_order: newImage.sort_order })
          .select('*, image_movies(movie_id, movies(id, title, year, poster_path))').single()
        if (error) { alert(error.message); continue }
        current = [...current, data]
      } else {
        current = [...current, newImage]
      }
    }
    setImages(current)
    notify(current)
    setUploading(false)
    e.target.value = ''
  }

   async function handleReplace(id: string, oldPath: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const oldThumb = images.find((i) => i.id === id)?.thumb_path
    const newPath = `${theaterId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('theater-images').upload(newPath, file, { cacheControl: '31536000', upsert: false })
    if (uploadError) { alert(uploadError.message); return }
    const newThumb = await uploadThumb(file)
    await supabase.storage.from('theater-images').remove([oldPath, ...(oldThumb ? [oldThumb] : [])])
    if (!isPending) {
      await supabase.from('images').update({ storage_path: newPath, thumb_path: newThumb }).eq('id', id)
    }
    updateLocal(id, { storage_path: newPath, thumb_path: newThumb })
    e.target.value = ''
  }

    const replaceThumbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleReplaceThumb(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const oldThumb = images.find((i) => i.id === id)?.thumb_path
    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const newThumb = `${theaterId}/thumbs/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    // Uploaded as-is: your own file is used exactly as provided
    const { error: uploadError } = await supabase.storage
      .from('theater-images')
      .upload(newThumb, file, { cacheControl: '31536000', upsert: false })
    if (uploadError) { alert(uploadError.message); return }
    if (oldThumb) await supabase.storage.from('theater-images').remove([oldThumb])
    if (!isPending) {
      await supabase.from('images').update({ thumb_path: newThumb }).eq('id', id)
    }
    updateLocal(id, { thumb_path: newThumb })
    e.target.value = ''
  }

  async function updateImageField(id: string, fields: Partial<ImageRecord>) {
    updateLocal(id, fields)
    if (!isPending) {
      await supabase.from('images').update(fields).eq('id', id)
    }
  }

  async function setFeatured(id: string) {
    if (!isPending) {
      await supabase.from('images').update({ is_featured: false }).eq('theater_id', theaterId)
      await supabase.from('images').update({ is_featured: true }).eq('id', id)
    }
    setImages((prev) => {
      const updated = prev.map((img) => ({ ...img, is_featured: img.id === id }))
      notify(updated)
      return updated
    })
  }

  async function deleteImage(id: string, storagePath: string) {
    if (!confirm('Delete this image?')) return
    const thumb = images.find((i) => i.id === id)?.thumb_path
    await supabase.storage.from('theater-images').remove([storagePath, ...(thumb ? [thumb] : [])])
    if (!isPending) await supabase.from('images').delete().eq('id', id)
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id)
      notify(updated)
      return updated
    })
  }

  async function addMovie(imageId: string, movie: any) {
    if (isPending) {
      // Just update local state for pending mode
           updateLocal(imageId, {
        image_movies: [
          ...(images.find(i => i.id === imageId)?.image_movies ?? []),
          { movie_id: movie.tmdb_id, movies: { id: movie.tmdb_id, tmdb_id: movie.tmdb_id, title: movie.title, year: movie.year, poster_path: movie.poster_path } }
        ]
      })
      return
    }
    let { data: existing } = await supabase.from('movies').select('id').eq('tmdb_id', movie.tmdb_id).maybeSingle()
    let movieId = existing?.id
    if (!movieId) {
          const { data: created, error: createError } = await supabase.from('movies')
        .insert({
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year ? Number(movie.year) : null,
          poster_path: movie.poster_path,
          popularity: movie.popularity ?? 0,
        })
        .select('id').single()
      if (createError) { alert(createError.message); return }
      movieId = created.id
    }
    const { error } = await supabase.from('image_movies').insert({ image_id: imageId, movie_id: movieId })
    if (error) { alert(error.message); return }
    updateLocal(imageId, {
      image_movies: [
        ...(images.find(i => i.id === imageId)?.image_movies ?? []),
        { movie_id: movieId, movies: { id: movieId, title: movie.title, year: movie.year, poster_path: movie.poster_path } }
      ]
    })
  }

  async function removeMovie(imageId: string, movieId: string) {
    if (!isPending) {
      await supabase.from('image_movies').delete().eq('image_id', imageId).eq('movie_id', movieId)
    }
    updateLocal(imageId, {
      image_movies: images.find(i => i.id === imageId)?.image_movies?.filter((im: any) => im.movie_id !== movieId) ?? []
    })
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-amber-400 transition">
        <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : '+ Add images'}</span>
        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>

      {images.map((img) => (
        <div key={img.id} className="border rounded-xl p-3 flex gap-3 bg-gray-50">
          <div className="relative flex-shrink-0">
            <img
              src={baseUrl + img.storage_path}
              className="w-28 h-28 object-cover rounded-lg"
              alt=""
            />
            <button
              type="button"
              onClick={() => replaceInputRefs.current[img.id]?.click()}
              className="absolute bottom-1 right-1 bg-white/90 text-xs px-1.5 py-0.5 rounded shadow text-gray-700 hover:bg-amber-50"
            >
              Replace
            </button>
                        <input
              ref={(el) => { replaceInputRefs.current[img.id] = el }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleReplace(img.id, img.storage_path, e)}
            />

            {/* Thumbnail */}
            <div className="mt-2 flex items-center gap-2">
              {img.thumb_path ? (
                <img src={baseUrl + img.thumb_path} className="w-10 h-10 object-cover rounded border" alt="" />
              ) : (
                <div className="w-10 h-10 rounded border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400">none</div>
              )}
              <button
                type="button"
                onClick={() => replaceThumbInputRefs.current[img.id]?.click()}
                className="text-xs text-amber-600 hover:underline"
              >
                {img.thumb_path ? 'Replace thumb' : 'Add thumb'}
              </button>
              <input
                ref={(el) => { replaceThumbInputRefs.current[img.id] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleReplaceThumb(img.id, e)}
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <input
              placeholder="Caption"
              defaultValue={img.caption}
              onBlur={(e) => updateImageField(img.id, { caption: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              placeholder="Photo credit"
              defaultValue={img.credit}
              onBlur={(e) => updateImageField(img.id, { credit: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="radio"
                checked={img.is_featured}
                onChange={() => setFeatured(img.id)}
                className="accent-amber-600"
              />
              Featured image
            </label>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Films visible in this image</p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {img.image_movies?.map((im: any) => (
                  <span key={im.movie_id} className="text-xs bg-white border rounded-full px-2 py-0.5 flex items-center gap-1">
                    {im.movies.title} {im.movies.year && `(${im.movies.year})`}
                    <button type="button" onClick={() => removeMovie(img.id, im.movie_id)} className="text-red-400 hover:text-red-600 ml-0.5">×</button>
                  </span>
                ))}
              </div>
              <MovieAutosuggest onSelect={(movie) => addMovie(img.id, movie)} />
            </div>

            <button
              type="button"
              onClick={() => deleteImage(img.id, img.storage_path)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete image
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}