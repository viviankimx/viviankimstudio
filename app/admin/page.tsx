'use client';
import { useState, useEffect, useRef, useContext, createContext } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Mosaic } from '../portfolio';
const UploadActivity = createContext<(delta: number) => void>(() => {});
const uid = () => crypto.randomUUID();
const move = (arr: any[], from: number, to: number) => {
  const a = [...arr];
  a.splice(to, 0, a.splice(from, 1)[0]);
  return a;
};
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
}: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) =>
            onChange(
              type === 'number' ? Number(e.target.value) : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}
function SortList({ items, render, onChange }: any) {
  const from = useRef<number | null>(null);
  return (
    <div className="sort-list">
      {items.map((x: any, i: number) => (
        <div
          key={x.id || x}
          className="sort-row"
          draggable
          onDragStart={(e) => {
            from.current = i;
            e.dataTransfer.setData('text/plain', String(i));
          }}
          onDragEnd={() => {
            from.current = null;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.currentTarget.closest('fieldset')?.disabled) return;
            if (from.current !== null) onChange(move(items, from.current, i));
            from.current = null;
          }}
        >
          <span aria-hidden="true" className="grip">
            ⠿
          </span>
          <div className="sort-content">{render(x, i)}</div>
          <div className="row-actions">
            <button
              type="button"
              aria-label={`Move item ${i + 1} up`}
              disabled={!i}
              onClick={() => onChange(move(items, i, i - 1))}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move item ${i + 1} down`}
              disabled={i === items.length - 1}
              onClick={() => onChange(move(items, i, i + 1))}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Remove item ${i + 1}`}
              onClick={() =>
                onChange(items.filter((_: any, j: number) => j !== i))
              }
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
async function upload(file: File) {
  let res: Response;
  try {
    res = await fetch('/api/upload', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-File-Size': String(file.size) } });
  } catch {
    throw Error(
      'Cannot reach the CMS server. Start the site, then choose the file again.',
    );
  }
  if (res.status === 401)
    throw Error(
      'Your sign-in expired. Sign in again in another tab, then retry this upload.',
    );
  const data: any = await res.json().catch(() => ({
    error: 'The server could not process the upload. Please retry.',
  }));
  if (!res.ok) throw Error(data.error || 'Upload failed');
  return data;
}
function Dropzone({
  onUpload,
  imagesOnly = false,
  videosOnly = false,
  label = 'Drop files here, or choose files',
}: any) {
  const activity = useContext(UploadActivity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handle(files: FileList | File[]) {
    setBusy(true);
    activity(1);
    setError('');
    const results = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50_000_000)
          throw Error('Choose a file smaller than 50 MB.');
        if (imagesOnly && !/\.(jpe?g|png|webp|gif)$/i.test(file.name))
          throw Error('Choose a JPG, PNG, WebP or GIF image.');
        if (videosOnly && !/\.(mp4|webm)$/i.test(file.name))
          throw Error('Choose an MP4 or WebM video.');
        const result = await upload(file);
        if (result.type === 'image') {
          const dimensions = await new Promise<{
            width: number;
            height: number;
          }>((resolve, reject) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(Error('Unable to read image'));
            img.src = result.src;
          });
          Object.assign(result, dimensions);
        }
        results.push({
          ...result,
          id: uid(),
          date: new Date().toISOString(),
          caption: '',
          span: 1,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (results.length) onUpload(results);
      setBusy(false);
      activity(-1);
    }
  }
  return (
    <div
      className="upload-zone"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.currentTarget.closest('fieldset')?.disabled) return;
        if (!busy && e.dataTransfer.files.length) handle(e.dataTransfer.files);
      }}
    >
      <label>
        {busy ? 'Uploading…' : label}
        <input
          type="file"
          multiple
          disabled={busy}
          accept={
            videosOnly
              ? 'video/mp4,video/webm'
              : imagesOnly
                ? 'image/jpeg,image/png,image/webp,image/gif'
                : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
          }
          onChange={(e) => {
            if (e.target.files) handle(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export default function Admin() {
  const [deletedProject, setDeletedProject] = useState<string | null>(null);
  const [uploads, setUploads] = useState(0);
  const [c, setC] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('Loading…');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [tab, setTab] = useState('general');
  const projectDrag = useRef<string | null>(null);
  useEffect(() => {
    fetch('/api/content')
      .then(async (r) => {
        if (!r.ok) throw Error('Could not load CMS. Reload to sign in.');
        return r.json();
      })
      .then((d) => {
        setC(d);
        setStatus('All changes saved');
      })
      .catch((e) => setStatus(e.message));
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function edit(fn: (d: any) => void) {
    if (savingRef.current) return;
    setC((old: any) => {
      const next = structuredClone(old);
      fn(next);
      return next;
    });
    setDirty(true);
    setStatus('Unsaved changes');
  }
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatus('Saving…');
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error || 'Save failed');
      setC(data);
      setDirty(false);
      setStatus('Saved — public site updated');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  if (!c)
    return (
      <main className="cms">
        <h1>Vivian Kim Studio</h1>
        <p role="status">{status}</p>
      </main>
    );
  const memoryIndex = c.memories.items.findIndex((i: any) => i.id === memoryId);
  const memory = memoryIndex < 0 ? null : memoryIndex;
  const setMemory = (index: number | null) =>
    setMemoryId(index === null ? null : c.memories.items[index]?.id || null);
  const p = c.projects.find((p: any) => p.id === selected);
  const patch = (key: string, value: any) =>
    edit((d) => {
      d.projects.find((x: any) => x.id === selected)[key] = value;
    });
  return (
    <UploadActivity.Provider value={(delta) => setUploads((n) => n + delta)}>
      <Dialog
        open={deletedProject !== null}
        onOpenChange={(open) => {
          if (!open) setDeletedProject(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Project marked for deletion</DialogTitle>
          <DialogDescription>
            “{deletedProject}” will only be deleted when you click Save changes.
            Until then, the public site stays unchanged. Reload the CMS before
            saving to discard this deletion and any other unsaved changes.
          </DialogDescription>
          <button type="button" onClick={() => setDeletedProject(null)}>
            Got it
          </button>
        </DialogContent>
      </Dialog>
      <div className="cms">
        <header className="cms-header">
          <div>
            <a href="/" target="_blank">
              VIVIAN KIM STUDIO ↗
            </a>
            <h1>Studio CMS</h1>
          </div>
          <div className="save-area">
            <span role="status" aria-live="polite">
              {status}
            </span>
            <button
              className="primary"
              disabled={!dirty || saving || uploads > 0}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </header>
        <fieldset disabled={saving} className="cms-fieldset">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="cms-tabs">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="memories">Memories</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <div className="editor-two">
                <section className="panel">
                  <h2>Hero</h2>
                  <Field
                    label="Homepage copy"
                    value={c.hero.copy}
                    multiline
                    onChange={(v: string) => edit((d) => (d.hero.copy = v))}
                  />
                  <Field
                    label="Hero video URL or local path"
                    value={c.hero.video}
                    onChange={(v: string) => edit((d) => (d.hero.video = v))}
                  />
                  <Dropzone
                    videosOnly
                    label="Drop a hero video, or choose a file"
                    onUpload={(files: any[]) =>
                      edit((d) => {
                        const v = files.find((f) => f.type === 'video');
                        if (v) d.hero.video = v.src;
                      })
                    }
                  />
                  <Field
                    label="Poster image"
                    value={c.hero.poster}
                    onChange={(v: string) => edit((d) => (d.hero.poster = v))}
                  />
                  <video
                    className="cms-video"
                    src={c.hero.video}
                    poster={c.hero.poster}
                    controls
                    muted
                  />
                </section>
                <section className="panel">
                  <h2>Select clients</h2>
                  <Field
                    label="One client per line; displayed in this order"
                    value={c.clients.join('\n')}
                    multiline
                    onChange={(v: string) =>
                      edit((d) => (d.clients = v.split('\n').filter(Boolean)))
                    }
                  />
                  <h2>Footer</h2>
                  <Field
                    label="Email"
                    value={c.footer.email}
                    onChange={(v: string) => edit((d) => (d.footer.email = v))}
                  />
                  <Field
                    label="Instagram URL"
                    value={c.footer.instagram}
                    onChange={(v: string) =>
                      edit((d) => (d.footer.instagram = v))
                    }
                  />
                  <Field
                    label="Location"
                    value={c.footer.location}
                    onChange={(v: string) =>
                      edit((d) => (d.footer.location = v))
                    }
                  />
                </section>
              </div>

              <section className="panel narrow">
                <h2>Navigation</h2>
                <p className="hint">
                  First link is the studio name. Last link sits on the right.
                  Drag to reorder.
                </p>
                <SortList
                  items={c.navigation}
                  onChange={(v: any) => edit((d) => (d.navigation = v))}
                  render={(n: any, i: number) => (
                    <div className="two-fields">
                      <Field
                        label="Label"
                        value={n.label}
                        onChange={(v: string) =>
                          edit((d) => (d.navigation[i].label = v))
                        }
                      />
                      <Field
                        label="Destination"
                        value={n.href}
                        onChange={(v: string) =>
                          edit((d) => (d.navigation[i].href = v))
                        }
                      />
                    </div>
                  )}
                />
                <button
                  onClick={() =>
                    edit((d) =>
                      d.navigation.splice(-1, 0, {
                        id: uid(),
                        label: 'New link',
                        href: '/',
                      }),
                    )
                  }
                >
                  + Add link
                </button>
              </section>
            </TabsContent>
            <TabsContent value="projects">
              <div className="project-editor">
                <aside className="panel">
                  <h2>Projects · {c.projects.length}</h2>
                  <Field
                    label="Find a project"
                    value={query}
                    onChange={setQuery}
                  />
                  <button
                    className="primary"
                    onClick={() => {
                      const id = uid();
                      edit((d) => {
                        d.projects.unshift({
                          id,
                          slug: 'new-project-' + id.slice(0, 8),
                          title: 'New project',
                          subtitle: '',
                          description: '',
                          cover: '',
                          categories: ['stills'],
                          published: false,
                          date: new Date().toISOString().slice(0, 10),
                          layout: 'stack',
                          blocks: [],
                        });
                        d.orders.stills.unshift(id);
                      });
                      setSelected(id);
                    }}
                  >
                    + New project
                  </button>
                  <p className="hint">
                    Drag projects to set their order on the homepage, Stills and
                    Motion. New projects start at the top. Alt + ↑ / ↓ also
                    reorders.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      edit((d) => {
                        d.projects.sort(
                          (a: any, b: any) =>
                            (Date.parse(b.date) || 0) -
                            (Date.parse(a.date) || 0),
                        );
                      })
                    }
                  >
                    Sort newest first
                  </button>
                  <div className="project-picker">
                    {c.projects
                      .filter((p: any) =>
                        (p.title + ' ' + p.subtitle)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((p: any) => (
                        <button
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            projectDrag.current = p.id;
                            e.dataTransfer.setData('text/plain', p.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = projectDrag.current;
                            if (id && id !== p.id)
                              edit((d) => {
                                d.projects = move(
                                  d.projects,
                                  d.projects.findIndex((x: any) => x.id === id),
                                  d.projects.findIndex(
                                    (x: any) => x.id === p.id,
                                  ),
                                );
                              });
                            projectDrag.current = null;
                          }}
                          onDragEnd={() => {
                            projectDrag.current = null;
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.altKey &&
                              ['ArrowUp', 'ArrowDown'].includes(e.key)
                            ) {
                              e.preventDefault();
                              edit((d) => {
                                const i = d.projects.findIndex(
                                  (x: any) => x.id === p.id,
                                );
                                d.projects = move(
                                  d.projects,
                                  i,
                                  Math.max(
                                    0,
                                    Math.min(
                                      d.projects.length - 1,
                                      i + (e.key === 'ArrowDown' ? 1 : -1),
                                    ),
                                  ),
                                );
                              });
                            }
                          }}
                          className={selected === p.id ? 'selected' : ''}
                          onClick={() => setSelected(p.id)}
                        >
                          <img src={p.cover || undefined} alt="" />
                          <span>
                            {p.title}
                            <small>
                              {p.subtitle}
                              {!p.published ? ' · Draft' : ''}
                            </small>
                          </span>
                        </button>
                      ))}
                  </div>
                </aside>
                <section className="panel">
                  {!p ? (
                    <>
                      <h2>Select a project</h2>
                      <p>
                        Edit the images, films and copy for any Stills or Motion
                        deep dive.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="section-heading">
                        <h2>{p.title}</h2>
                        <button
                          type="button"
                          className="delete-project"
                          disabled={uploads > 0}
                          onClick={() => {
                            const id = p.id;
                            setDeletedProject(p.title || 'Untitled project');
                            edit((d) => {
                              d.projects = d.projects.filter(
                                (project: any) => project.id !== id,
                              );
                              for (const kind of Object.keys(d.orders)) {
                                d.orders[kind] = d.orders[kind].filter(
                                  (projectId: string) => projectId !== id,
                                );
                              }
                            });
                            setSelected('');
                          }}
                        >
                          Delete project
                        </button>
                        <a href={'/project/' + p.slug} target="_blank">
                          View project ↗
                        </a>
                      </div>
                      <div className="project-summary-editor">
                        <div className="project-cover-editor">
                          {p.cover ? (
                            <img
                              className="project-cover-preview"
                              src={p.cover}
                              alt="Project cover preview"
                            />
                          ) : (
                            <div className="project-cover-empty">
                              No cover image yet
                            </div>
                          )}
                          <Field
                            label="Cover image"
                            value={p.cover}
                            onChange={(v: string) => patch('cover', v)}
                          />
                          <Dropzone
                            imagesOnly
                            label="Drop a cover image"
                            onUpload={(f: any[]) => patch('cover', f[0].src)}
                          />
                        </div>
                        <div className="project-metadata-editor">
                          <div className="two-fields">
                            <Field
                              label="Title"
                              value={p.title}
                              onChange={(v: string) => patch('title', v)}
                            />
                            <Field
                              label="Subtitle"
                              value={p.subtitle}
                              onChange={(v: string) => patch('subtitle', v)}
                            />
                          </div>
                          <Field
                            label="Project date"
                            type="date"
                            value={p.date || ''}
                            onChange={(v: string) => patch('date', v)}
                          />
                          <Field
                            label="URL slug"
                            value={p.slug}
                            onChange={(v: string) => patch('slug', v)}
                          />
                          <Field
                            label="Description / credits"
                            multiline
                            value={p.description}
                            onChange={(v: string) => patch('description', v)}
                          />
                          <div className="check-row">
                            <label>
                              <Switch
                                aria-label="Published"
                                checked={p.published}
                                onCheckedChange={(v) => patch('published', v)}
                              />{' '}
                              Published
                            </label>
                            {['stills', 'motion'].map((kind) => (
                              <label key={kind}>
                                <Checkbox
                                  checked={p.categories.includes(kind)}
                                  onCheckedChange={(v) =>
                                    edit((d) => {
                                      const x = d.projects.find(
                                        (x: any) => x.id === selected,
                                      );
                                      x.categories = v
                                        ? [...x.categories, kind]
                                        : x.categories.filter(
                                            (s: string) => s !== kind,
                                          );
                                      d.orders[kind] = v
                                        ? [
                                            selected,
                                            ...d.orders[kind].filter(
                                              (id: string) => id !== selected,
                                            ),
                                          ]
                                        : d.orders[kind].filter(
                                            (id: string) => id !== selected,
                                          );
                                    })
                                  }
                                />{' '}
                                {kind}
                              </label>
                            ))}
                          </div>
                          <label className="field">
                            <span>Deep dive layout</span>
                            <select
                              value={p.layout}
                              onChange={(e) => patch('layout', e.target.value)}
                            >
                              <option value="stack">
                                Full width image stack
                              </option>
                              <option value="grid">
                                Two columns with full width video
                              </option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <h2>Images, video and text</h2>
                      <Dropzone
                        onUpload={(files: any[]) =>
                          edit((d) => {
                            const current = d.projects.find(
                              (x: any) => x.id === p.id,
                            );
                            if (current) current.blocks.push(...files);
                          })
                        }
                      />
                      <SortList
                        items={p.blocks}
                        onChange={(v: any[]) => patch('blocks', v)}
                        render={(b: any, i: number) => (
                          <div className="media-block-editor">
                            <div className="media-block-visual">
                              {b.type === 'image' && (
                                <img
                                  className="block-preview"
                                  src={b.src}
                                  alt=""
                                />
                              )}
                              {b.type === 'video' && (
                                <video
                                  className="block-preview"
                                  src={b.src}
                                  controls
                                  preload="metadata"
                                />
                              )}
                              {['embed', 'text'].includes(b.type) && (
                                <div className="project-cover-empty">
                                  {b.type === 'embed'
                                    ? 'Video embed'
                                    : 'Text block'}
                                </div>
                              )}
                            </div>
                            <div className="media-block-fields">
                              <label className="field">
                                <span>Type</span>
                                <select
                                  value={b.type}
                                  onChange={(e) =>
                                    patch(
                                      'blocks',
                                      p.blocks.map((x: any, j: number) =>
                                        j === i
                                          ? { ...x, type: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                >
                                  <option value="image">Image</option>
                                  <option value="video">Video file</option>
                                  <option value="embed">
                                    Vimeo / YouTube embed
                                  </option>
                                  <option value="text">Text</option>
                                </select>
                              </label>
                              {b.type !== 'text' && (
                                <Field
                                  label="Media URL or local path"
                                  value={b.src}
                                  onChange={(v: string) =>
                                    patch(
                                      'blocks',
                                      p.blocks.map((x: any, j: number) =>
                                        j === i ? { ...x, src: v } : x,
                                      ),
                                    )
                                  }
                                />
                              )}
                              <Field
                                label={
                                  b.type === 'text'
                                    ? 'Text'
                                    : 'Caption / alternative text'
                                }
                                value={b.caption}
                                multiline={b.type === 'text'}
                                onChange={(v: string) =>
                                  patch(
                                    'blocks',
                                    p.blocks.map((x: any, j: number) =>
                                      j === i ? { ...x, caption: v } : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      />
                      <button
                        onClick={() =>
                          patch('blocks', [
                            ...p.blocks,
                            {
                              id: uid(),
                              type: 'embed',
                              src: '',
                              caption: '',
                              span: 1,
                            },
                          ])
                        }
                      >
                        + Add video embed or text
                      </button>
                    </>
                  )}
                </section>
              </div>
            </TabsContent>
            <TabsContent value="memories">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Memories · {c.memories.items.length}</h2>
                    <p className="hint">
                      Drag images to rearrange. Alt + Left / Right also moves a
                      focused image. Save to update the public gallery.
                    </p>
                  </div>
                  <a href="/memories" target="_blank">
                    View gallery ↗
                  </a>
                </div>
                <Field
                  label="Gallery heading"
                  value={c.memories.title}
                  onChange={(v: string) => edit((d) => (d.memories.title = v))}
                />
                <Dropzone
                  imagesOnly
                  onUpload={(files: any[]) =>
                    edit((d) => {
                      const sorted = files.sort(
                        (a, b) => Date.parse(b.date) - Date.parse(a.date),
                      );
                      d.memories.items = d.memories.manualOrder
                        ? [...sorted, ...d.memories.items]
                        : [...d.memories.items, ...sorted].sort(
                            (a, b) => Date.parse(b.date) - Date.parse(a.date),
                          );
                    })
                  }
                />
                <div className="gallery-toolbar">
                  <Field
                    label="Desktop columns"
                    type="number"
                    value={c.memories.columns}
                    onChange={(v: number) =>
                      edit(
                        (d) =>
                          (d.memories.columns = Math.max(1, Math.min(6, v))),
                      )
                    }
                  />
                  <Field
                    label="Gap (px)"
                    type="number"
                    value={c.memories.gap}
                    onChange={(v: number) =>
                      edit(
                        (d) => (d.memories.gap = Math.max(0, Math.min(64, v))),
                      )
                    }
                  />
                  <button
                    onClick={() => {
                      edit((d) => {
                        d.memories.items.sort(
                          (a: any, b: any) =>
                            Date.parse(b.date) - Date.parse(a.date),
                        );
                        d.memories.manualOrder = false;
                      });
                      setMemory(null);
                    }}
                  >
                    Reset to newest first
                  </button>
                  <span>
                    {c.memories.manualOrder
                      ? 'Custom positioning'
                      : 'Newest first'}
                  </span>
                </div>
                {memory !== null && c.memories.items[memory] && (
                  <div className="memory-settings">
                    <Field
                      label="Image date"
                      type="date"
                      value={
                        c.memories.items[memory].date.startsWith('1970-')
                          ? ''
                          : c.memories.items[memory].date.slice(0, 10)
                      }
                      onChange={(v: string) =>
                        edit((d) => {
                          if (!v) return;
                          d.memories.items[memory].date = v + 'T12:00:00.000Z';
                          if (!d.memories.manualOrder) {
                            d.memories.items.sort(
                              (a: any, b: any) =>
                                Date.parse(b.date) - Date.parse(a.date),
                            );
                            setMemory(null);
                          }
                        })
                      }
                    />
                    <Field
                      label="Alternative text"
                      value={c.memories.items[memory].caption}
                      onChange={(v: string) =>
                        edit((d) => (d.memories.items[memory].caption = v))
                      }
                    />
                    <button
                      onClick={() => {
                        edit((d) => d.memories.items.splice(memory, 1));
                        setMemory(null);
                      }}
                    >
                      Remove from gallery
                    </button>
                    <button onClick={() => setMemory(null)}>Done</button>
                  </div>
                )}
                <Mosaic
                  items={c.memories.items}
                  columns={c.memories.columns}
                  gap={c.memories.gap}
                  onOpen={setMemory}
                  onReorder={(a, b) => {
                    edit((d) => {
                      d.memories.items = move(d.memories.items, a, b);
                      d.memories.manualOrder = true;
                    });
                    setMemory(null);
                  }}
                />
                {!c.memories.items.length && (
                  <p className="empty">Drop your first images above.</p>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </fieldset>
      </div>
    </UploadActivity.Provider>
  );
}
