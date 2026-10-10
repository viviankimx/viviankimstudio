import { readContent, publicContent } from '@/lib/store';
import Portfolio from '../portfolio';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const route = path.join('/');
  const c = await readContent();
  if (
    !['stills', 'motion', 'memories'].includes(route) &&
    !(
      route.startsWith('project/') &&
      c.projects.some((p: any) => p.slug === route.slice(8) && p.published)
    )
  )
    notFound();
  return <Portfolio content={publicContent(c, route)} route={route} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const route = (await params).path.join('/');
  const c = await readContent();
  const project = c.projects.find(
    (p: any) => p.published && route === 'project/' + p.slug,
  );
  const title = project
    ? [project.title, project.subtitle].filter(Boolean).join(' — ')
    : (
        { stills: 'Stills', motion: 'Motion', memories: 'Memories' } as Record<
          string,
          string
        >
      )[route];
  return title
    ? {
        title: title + ' | Vivian Kim Studio',
        description:
          project?.description ||
          `${title} by Vivian Kim, director and photographer based in New York and Los Angeles.`,
      }
    : {
        title: 'Page not found | Vivian Kim Studio',
        robots: { index: false, follow: false },
      };
}
