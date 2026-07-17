import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import SiteNav from '@/components/SiteNav'

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
    .from('theaters')
    .select('country')
    .eq('status', 'published')
  const countries = [...new Set(countryRows?.map((r) => r.country).filter(Boolean))]

  const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10) // 1900–2020

  return (
    <>
      <SiteNav />
      <div className="p-6">
        <div className="flex gap-3 mb-6 flex-wrap">
          <select className="border rounded px-3 py-2" defaultValue={country ?? ''}>
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="border rounded px-3 py-2" defaultValue={decade ?? ''}>
            <option value="">All decades</option>
            {decades.map((d) => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {theaters?.map((t) => {
            const featured = t.images?.find((i: any) => i.is_featured) ?? t.images?.[0]
            return (
              <Link key={t.id} href={`/theaters/${t.slug}`} className="group">
                <div className="aspect-[3/4] relative bg-gray-200 rounded overflow-hidden">
                  {featured && (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${featured.storage_path}`}
                      alt={t.name}
                      fill
                      className="object-cover group-hover:scale-105 transition"
                    />
                  )}
                </div>
                <p className="mt-2 font-medium">{t.name}</p>
                <p className="text-sm text-gray-500">{t.city}, {t.country}</p>
              </Link>
            )
          })}
        </div>
        {theaters?.length === 0 && <p className="text-gray-500">No theaters yet.</p>}
      </div>
    </>
  )
}