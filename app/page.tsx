import { pageContent } from '@/lib/content';
import Portfolio from './portfolio';
export default function Page() {
  return <Portfolio content={pageContent('')} />;
}
