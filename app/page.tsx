import { readContent, publicContent } from '@/lib/store';
import Portfolio from './portfolio';
export const dynamic = 'force-dynamic';
export default async function Page() {
  return <Portfolio content={publicContent(await readContent(), '')} />;
}
