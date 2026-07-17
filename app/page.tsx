import { createClient } from '@/lib/supabase/server'
import MapView from '@/components/MapView'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: theaters } = await supabase
    .from('theaters')
    .select('id, name, slug, lat, lng, city, country, year_opened, year_closed, images(storage_path, is_featured)')
    .eq('status', 'published')

  const mapped = (theaters ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    lat: t.lat,
    lng: t.lng,
    city: t.city,
    country: t.country,
    year_opened: t.year_opened,
    year_closed: t.year_closed,
    image_path: t.images?.find((i: any) => i.is_featured)?.storage_path ?? t.images?.[0]?.storage_path ?? null,
  }))

  return <MapView theaters={mapped} />
}