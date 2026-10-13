import './globals.css';
export const metadata = {
  title: 'VIVIAN KIM STUDIO',
  description:
    'Vivian Kim is a director and photographer, based in New York and Los Angeles.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
