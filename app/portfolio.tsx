'use client';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
export function Mosaic({
  items,
  columns = 4,
  gap = 8,
  onOpen,
  onReorder,
}: {
  items: any[];
  columns?: number;
  gap?: number;
  onOpen?: (i: number) => void;
  onReorder?: (a: number, b: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const drag = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  useLayoutEffect(() => {
    const el = ref.current!;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    // Cached images may finish before React attaches onLoad during hydration.
    const measured: Record<string, { width: number; height: number }> = {};
    el.querySelectorAll<HTMLImageElement>('a.mosaic-item img').forEach(
      (img) => {
        if (img.complete && img.naturalWidth && !img.hasAttribute('width'))
          measured[img.getAttribute('src')!] = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
      },
    );
    if (Object.keys(measured).length)
      setDimensions((old) => ({ ...old, ...measured }));
    return () => ro.disconnect();
  }, []);
  const cols =
    width < 550
      ? Math.min(2, columns)
      : width < 850
        ? Math.min(3, columns)
        : columns;
  const w = Math.max(0, (width - gap * (cols - 1)) / cols);
  const heights = Array(cols).fill(0);
  const boxes = items.map((i) => {
    const col = heights.indexOf(Math.min(...heights));
    const size = dimensions[i.src] || i;
    const h = (w * (size.height || 1)) / (size.width || 1);
    const box = {
      left: col * (w + gap),
      top: heights[col],
      width: w,
      height: h,
    };
    heights[col] += h + gap;
    return box;
  });
  return (
    <div
      ref={ref}
      className={onReorder ? 'mosaic mosaic-editable' : 'mosaic'}
      style={{
        height: Math.max(0, ...heights),
        visibility: width > 0 ? 'visible' : 'hidden',
      }}
    >
      {items.map((item, i) => {
        const Element = item.href ? 'a' : 'button';
        return (
          <Element
            href={item.href}
            key={item.id}
            type="button"
            className="mosaic-item"
            aria-label={
              item.href
                ? item.caption
                : `${onReorder ? 'Move' : 'View'} ${item.caption || `memory ${i + 1}`}`
            }
            draggable={!!onReorder}
            onDragStart={(e) => {
              drag.current = i;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragOver={(e) => {
              if (
                onReorder &&
                !ref.current?.closest('fieldset')?.disabled &&
                drag.current !== null
              ) {
                e.preventDefault();
                if (drag.current !== i) {
                  onReorder(drag.current, i);
                  drag.current = i;
                }
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              drag.current = null;
            }}
            onDragEnd={() => (drag.current = null)}
            onKeyDown={(e) => {
              if (
                onReorder &&
                e.altKey &&
                ['ArrowLeft', 'ArrowRight'].includes(e.key)
              ) {
                e.preventDefault();
                onReorder(
                  i,
                  Math.max(
                    0,
                    Math.min(
                      items.length - 1,
                      i + (e.key === 'ArrowRight' ? 1 : -1),
                    ),
                  ),
                );
              }
            }}
            onClick={() => onOpen?.(i)}
            style={boxes[i]}
          >
            <img
              src={item.src}
              srcSet={item.srcSet}
              sizes={item.sizes}
              width={item.width}
              height={item.height}
              decoding="async"
              onLoad={(e) => {
                if (item.href && !item.width) {
                  const image = e.currentTarget;
                  setDimensions((old) => ({
                    ...old,
                    [item.src]: {
                      width: image.naturalWidth,
                      height: image.naturalHeight,
                    },
                  }));
                }
              }}
              alt={
                item.caption ||
                `Memory ${i + 1} from Vivian Kim’s photo journal`
              }
              loading="lazy"
              draggable={false}
            />
            {onReorder && <span className="position-badge">{i + 1}</span>}
            {item.href && (
              <span className="mosaic-project-caption">{item.caption}</span>
            )}
          </Element>
        );
      })}
    </div>
  );
}
export function Gallery({
  items,
  columns,
  gap,
}: {
  items: any[];
  columns: number;
  gap: number;
}) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <Mosaic items={items} columns={columns} gap={gap} onOpen={setIndex} />
      <Dialog
        open={index !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
      >
        <DialogContent
          className="lightbox"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight')
              setIndex(((index || 0) + 1) % items.length);
            if (e.key === 'ArrowLeft')
              setIndex(((index || 0) + items.length - 1) % items.length);
          }}
        >
          <DialogTitle className="sr-only">
            Memory {(index || 0) + 1}
          </DialogTitle>
          {index !== null && (
            <>
              <img
                src={items[index].src}
                alt={items[index].caption || `Memory ${index + 1}`}
              />
              <div className="lightbox-controls">
                <button
                  onClick={() =>
                    setIndex((index + items.length - 1) % items.length)
                  }
                >
                  ← Previous
                </button>
                <span>
                  {index + 1} / {items.length}
                </span>
                <button onClick={() => setIndex((index + 1) % items.length)}>
                  Next →
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function HeroFilm({ src, poster }: { src: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!preference.matches) video.current?.play().catch(() => {});
    const stop = () => {
      if (preference.matches) video.current?.pause();
    };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, [src]);
  return (
    <div className="hero-film">
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        src={src}
        aria-label="Vivian Kim portfolio showreel"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      <button
        className="hero-playback"
        onClick={() => {
          const el = video.current;
          if (!el) return;
          if (el.paused) el.play().catch(() => {});
          else el.pause();
        }}
      >
        {paused ? 'Play film' : 'Pause film'}
      </button>
    </div>
  );
}
export default function Portfolio({
  content: c,
  route = '',
}: {
  content: any;
  route?: string;
}) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.hero h1, .hero video, .clients > *, .featured > h2, .project-listing > h1, .memory-intro > h1, main .mosaic-item, main .project-card, .project-detail > h1, .project-description, .project-blocks > figure, footer > *',
      ),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left,
          );
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty('--reveal-delay', `${Math.min(i, 5) * 65}ms`);
          el.classList.add('content-revealed');
          observer.unobserve(el);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    );
    nodes.forEach((el) => {
      el.classList.add('content-reveal');
      observer.observe(el);
    });
    const reset = () => {
      observer.disconnect();
      nodes.forEach((el) => {
        el.classList.remove('content-reveal', 'content-revealed');
        el.style.removeProperty('--reveal-delay');
      });
    };
    reduced.addEventListener('change', reset);
    return () => {
      reset();
      reduced.removeEventListener('change', reset);
    };
  }, [route]);
  const ordered = (kind: string) =>
    c.projects.filter(
      (p: any) =>
        p.published && (kind === 'featured' || p.categories.includes(kind)),
    );
  const p = route.startsWith('project/')
    ? c.projects.find((p: any) => p.slug === route.slice(8) && p.published)
    : null;
  const cards = (kind: string) =>
    kind === 'stills' || kind === 'featured' ? (
      <Mosaic
        items={ordered(kind).map((p: any) => ({
          id: p.id,
          src: p.cover,
          ...p.coverMedia,
          sizes:
            kind === 'featured'
              ? '(max-width: 767px) 50vw, 38vw'
              : '(max-width: 569px) 50vw, (max-width: 880px) 33vw, 25vw',
          caption: [p.title, p.subtitle].filter(Boolean).join(' — '),
          href: '/project/' + p.slug,
        }))}
        columns={kind === 'featured' ? 2 : 4}
        gap={kind === 'featured' ? 24 : 12}
      />
    ) : (
      <div className="motion-grid">
        {ordered(kind).map((p: any) => (
          <a className="project-card" href={'/project/' + p.slug} key={p.id}>
            <img
              src={p.cover}
              srcSet={p.coverMedia?.srcSet}
              sizes="(max-width: 700px) 100vw, 50vw"
              width={p.coverMedia?.width}
              height={p.coverMedia?.height}
              decoding="async"
              alt={`${p.title} ${p.subtitle}`}
              loading="lazy"
            />
            <div className="card-label">
              <span>{p.title}</span>
              <span>{p.subtitle}</span>
            </div>
          </a>
        ))}
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="top-nav" aria-label="Main navigation">
        <a className="brand" href={c.navigation[0].href}>
          {c.navigation[0].label}
        </a>
        <div>
          {c.navigation.slice(1, -1).map((n: any) => (
            <a key={n.id} href={n.href}>
              {n.label}
            </a>
          ))}
        </div>
        <a href={c.navigation.at(-1).href}>{c.navigation.at(-1).label}</a>
      </nav>
      <main id="main-content" tabIndex={-1}>
        {!route ? (
          <>
            <section className="hero">
              <div className="hero-content">
                <h1>{c.hero.copy}</h1>
                <HeroFilm src={c.hero.video} poster={c.hero.poster} />
              </div>
            </section>
            <section className="base-grid clients">
              <h2>Select Clients</h2>
              <p>{c.clients.join(' / ')}</p>
            </section>
            <section className="base-grid featured" id="featured">
              <h2>Featured Work</h2>
              {cards('featured')}
            </section>
          </>
        ) : route === 'stills' || route === 'motion' ? (
          <section className={'project-listing ' + route + '-listing'}>
            <h1>{route === 'stills' ? 'Stills' : 'Motion'}</h1>
            {cards(route)}
          </section>
        ) : route === 'memories' ? (
          <>
            <section className="memory-intro">
              <h1>{c.memories.title}</h1>
            </section>
            <section className="memory-gallery">
              <Gallery
                items={c.memories.items}
                columns={c.memories.columns}
                gap={c.memories.gap}
              />
            </section>
          </>
        ) : p ? (
          <section className="base-grid listing">
            <a
              className="back-link"
              href={p.categories.includes('motion') ? '/motion' : '/stills'}
            >
              ← &nbsp; Back to List
            </a>
            <article className={'project-detail ' + p.layout}>
              <h1>
                {p.title}
                <br />
                {p.subtitle}
              </h1>
              {p.description && (
                <p className="project-description">{p.description}</p>
              )}
              <div className="project-blocks">
                {p.blocks.map((b: any, i: number) => (
                  <figure
                    className={
                      b.type === 'embed' || b.type === 'video'
                        ? 'embed-block'
                        : ''
                    }
                    key={b.id || i}
                  >
                    {b.type === 'image' ? (
                      <img
                        src={b.src}
                        width={b.media?.width}
                        height={b.media?.height}
                        decoding="async"
                        alt={b.caption || `${p.title}, image ${i + 1}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                    ) : b.type === 'embed' ? (
                      <iframe
                        src={b.src}
                        title={p.title + ' video'}
                        loading="lazy"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : b.type === 'video' ? (
                      <video
                        src={b.src}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : null}
                    {b.caption && <figcaption>{b.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </article>
          </section>
        ) : (
          <section className="not-found">
            <h1>Page not found</h1>
            <a href="/">Return to the studio</a>
          </section>
        )}
      </main>
      <footer className="base-grid">
        <a href={c.footer.instagram} target="_blank" rel="noreferrer">
          @viviankimx
        </a>
        <p>
          Send inquiries to
          <br />
          <a href={'mailto:' + c.footer.email}>{c.footer.email}</a>
        </p>
        <p>{c.footer.location}</p>
      </footer>
    </>
  );
}
