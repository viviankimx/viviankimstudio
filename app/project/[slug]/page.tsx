import { getSite, pageContent } from '@/lib/content';
import Portfolio from '../../portfolio';
import { notFound } from 'next/navigation';
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(getSite().projects).map((slug) => ({ slug }));
}
type Props = { params: Promise<{ slug: string }> };
export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!getSite().projects[slug]) notFound();
  const route = `project/${slug}` as const;
  return <Portfolio content={pageContent(route)} route={route} />;
}
export async function generateMetadata({ params }: Props) {
  const p = getSite().projects[(await params).slug];
  if (!p) return {};
  const title = [p.title, p.subtitle].filter(Boolean).join(' — ');
  return {
    title: title + ' | Vivian Kim Studio',
    description:
      p.description ||
      `${title} by Vivian Kim, director and photographer based in New York and Los Angeles.`,
  };
}
