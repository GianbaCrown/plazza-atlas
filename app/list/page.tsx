import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import SiteHeader from '@/components/SiteHeader'

export const revalidate = 60

export default async function ListPage({
  searchParams,
}: { searchParams: Promise<{ country?: string; decade?: string }> }) {
  const { country, decade } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('theaters')
    .select('id, name, slug, city, country, year_opened, images(storage_path, is_featured)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (country) query = query.eq('country', country)

  const { data: theaters } = await query

  const { data: countryRows } = await supabase
    .from('theaters').select('country').eq('status', 'published')
  const countries = [...new Set(countryRows?.map((r) => r.country).filter(Boolean))]

  const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10)

  const theatersForSearch = (theaters ?? []).map((t: any) => ({
    id: t.id, name: t.name, slug: t.slug,
    lat: 0, lng: 0, city: t.city, country: t.country,
  }))

  return (
    <div className="min-h-screen">
      <SiteHeader variant="page" theaters={theatersForSearch} />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
        <div className="flex gap-3 mb-6 flex-wrap">
          <select className="border rounded-lg px-3 py-2 text-sm cursor-pointer" defaultValue={country ?? ''}>
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm cursor-pointer" defaultValue={decade ?? ''}>
            <option value="">All decades</option>
            {decades.map((d) => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {theaters?.map((t: any) => {
            const featured = t.images?.find((i: any) => i.is_featured) ?? t.images?.[0]
            return (
              <Link key={t.id} href={`/theaters/${t.slug}`} className="group cursor-pointer">
                <div className="aspect-[3/4] relative bg-gray-200 rounded-xl overflow-hidden">
                  {featured && (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${featured.storage_path}`}
                      alt={t.name} fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}
                </div>
                <p className="mt-2 font-medium text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.city}, {t.country}</p>
              </Link>
            )
          })}
        </div>
        {theaters?.length === 0 && <p className="text-gray-400">No theaters yet.</p>}
      </div>
    </div>
  )
}