export const metadata = {
  title: 'Page not found | Vivian Kim Studio',
  robots: { index: false, follow: false },
};
export default function NotFound() {
  return (
    <section className="not-found">
      <h1>Page not found</h1>
      <a href="/">Return to the studio</a>
    </section>
  );
}
