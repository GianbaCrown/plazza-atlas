'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import MovieAutosuggest from './MovieAutosuggest'

export default function ImageManager({ theaterId, initialImages }: { theaterId: string; initialImages: any[] }) {
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const path = `${theaterId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('theater-images').upload(path, file)
      if (uploadError) { alert(uploadError.message); continue }
      const { data: row, error: insertError } = await supabase.from('images')
        .insert({ theater_id: theaterId, storage_path: path, is_featured: images.length === 0, sort_order: images.length })
        .select('*').single()
      if (insertError) { alert(insertError.message); continue }
      setImages((prev) => [...prev, { ...row, image_movies: [] }])
    }
    setUploading(false)
    e.target.value = ''
  }

  async function updateImage(id: string, fields: any) {
    await supabase.from('images').update(fields).eq('id', id)
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...fields } : img)))
  }

  async function setFeatured(id: string) {
    await supabase.from('images').update({ is_featured: false }).eq('theater_id', theaterId)
    await supabase.from('images').update({ is_featured: true }).eq('id', id)
    setImages((prev) => prev.map((img) => ({ ...img, is_featured: img.id === id })))
  }

  async function deleteImage(id: string, storagePath: string) {
    if (!confirm('Delete this image?')) return
    await supabase.storage.from('theater-images').remove([storagePath])
    await supabase.from('images').delete().eq('id', id)
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  async function addMovie(imageId: string, movie: any) {
    let { data: existing } = await supabase.from('movies').select('id').eq('tmdb_id', movie.tmdb_id).maybeSingle()
    let movieId = existing?.id
    if (!movieId) {
      const { data: created, error } = await supabase.from('movies')
        .insert({ tmdb_id: movie.tmdb_id, title: movie.title, year: movie.year ? Number(movie.year) : null, poster_path: movie.poster_path })
        .select('id').single()
      if (error) { alert(error.message); return }
      movieId = created.id
    }
    await supabase.from('image_movies').insert({ image_id: imageId, movie_id: movieId })
    setImages((prev) => prev.map((img) => img.id === imageId
      ? { ...img, image_movies: [...(img.image_movies ?? []), { movie_id: movieId, movies: { id: movieId, title: movie.title, year: movie.year, poster_path: movie.poster_path } }] }
      : img))
  }

  async function removeMovie(imageId: string, movieId: string) {
    await supabase.from('image_movies').delete().eq('image_id', imageId).eq('movie_id', movieId)
    setImages((prev) => prev.map((img) => img.id === imageId
      ? { ...img, image_movies: img.image_movies?.filter((im: any) => im.movie_id !== movieId) }
      : img))
  }

  return (
    <div className="space-y-6">
      <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} />
      {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
      {images.map((img) => (
        <div key={img.id} className="border rounded p-4 flex gap-4">
          <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${img.storage_path}`} className="w-32 h-32 object-cover rounded" alt="" />
          <div className="flex-1 space-y-2">
            <input placeholder="Caption (optional)" defaultValue={img.caption ?? ''} onBlur={(e) => updateImage(img.id, { caption: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
            <input placeholder="Credit (optional)" defaultValue={img.credit ?? ''} onBlur={(e) => updateImage(img.id, { credit: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={img.is_featured} onChange={() => setFeatured(img.id)} /> Featured image
            </label>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Films visible in this image</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {img.image_movies?.map((im: any) => (
                  <span key={im.movie_id} className="text-xs bg-gray-100 rounded px-2 py-1 flex items-center gap-1">
                    {im.movies.title} {im.movies.year && `(${im.movies.year})`}
                    <button onClick={() => removeMovie(img.id, im.movie_id)} className="text-red-500">×</button>
                  </span>
                ))}
              </div>
              <MovieAutosuggest onSelect={(movie) => addMovie(img.id, movie)} />
            </div>
            <button onClick={() => deleteImage(img.id, img.storage_path)} className="text-xs text-red-600">Delete image</button>
          </div>
        </div>
      ))}
    </div>
  )
}