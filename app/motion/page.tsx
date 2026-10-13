import { pageContent } from '@/lib/content';
import Portfolio from '../portfolio';
export const metadata = {
  title: 'Motion | Vivian Kim Studio',
  description:
    'Motion by Vivian Kim, director and photographer based in New York and Los Angeles.',
};
export default function Page() {
  return <Portfolio content={pageContent('motion')} route="motion" />;
}
