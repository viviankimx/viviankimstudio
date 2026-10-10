export function sniffMedia(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  let ext = '';
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) ext = '.jpg';
  else if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = '.png';
  else if (/^GIF8[79]a/.test(b.subarray(0, 6).toString())) ext = '.gif';
  else if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') ext = '.webp';
  else if (b.subarray(4, 8).toString() === 'ftyp') ext = '.mp4';
  else if (b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) ext = '.webm';
  if (!ext) throw Error('Use JPG, PNG, GIF, WebP, MP4 or WebM');
  const type = ['.mp4', '.webm'].includes(ext) ? 'video' : 'image';
  const mime = ({ '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' } as Record<string,string>)[ext];
  return { ext, type, mime };
}
