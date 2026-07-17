import TheaterModal from '@/components/TheaterModal'

export default async function InterceptedTheaterModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <TheaterModal slug={slug} />
}