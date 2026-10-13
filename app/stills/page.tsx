import { pageContent } from '@/lib/content';
import Portfolio from '../portfolio';
export const metadata = {
  title: 'Stills | Vivian Kim Studio',
  description:
    'Stills by Vivian Kim, director and photographer based in New York and Los Angeles.',
};
export default function Page() {
  return <Portfolio content={pageContent('stills')} route="stills" />;
}
