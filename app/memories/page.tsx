import { pageContent } from '@/lib/content';
import Portfolio from '../portfolio';
export const metadata = {
  title: 'Memories | Vivian Kim Studio',
  description:
    'Memories by Vivian Kim, director and photographer based in New York and Los Angeles.',
};
export default function Page() {
  return <Portfolio content={pageContent('memories')} route="memories" />;
}
