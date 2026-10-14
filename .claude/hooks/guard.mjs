// PreToolUse guard for content-editing sessions (see "Guardrails" in CLAUDE.md).
//
// - File edits (Edit/Write/MultiEdit/NotebookEdit) inside this repository are only
//   allowed under content/.
// - Shell commands that would change code/config, rewrite Git history, force-push
//   or install packages are blocked.
//
// This is a guardrail for an assistant, not a security boundary. Developers can
// disable it on their own machine with "env": { "VK_SITE_DEVELOPER": "1" } in
// .claude/settings.local.json.
import path from 'node:path';

if (process.env.VK_SITE_DEVELOPER === '1') process.exit(0);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}
const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd());
const tool = event.tool_name;
const input = event.tool_input || {};

const outOfScope =
  'This site is set up for content editing only (homepage copy, clients, featured work, Stills, Motion and Memories). ' +
  'Code, design and settings changes need Eric, the developer. Tell the user plainly and offer to write him a note.';

function block(reason) {
  process.stderr.write(`Blocked by the site guardrails: ${reason}\n${outOfScope}\n`);
  process.exit(2);
}

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const target = input.file_path || input.notebook_path;
  if (!target) process.exit(0);
  const abs = path.resolve(event.cwd || root, target);
  const rel = path.relative(root, abs);
  const insideRepo = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (insideRepo && !(rel === 'content' || rel.startsWith('content' + path.sep)))
    block(`editing ${rel} is outside content/.`);
  process.exit(0);
}

if (tool === 'Bash') {
  const cmd = String(input.command || '');
  const protectedPath =
    /(^|[\s'"=]|\.\/)(app|lib|scripts|components|public|tests|\.claude|\.github)(\/|['"]?(\s|$|;|&|\|))|(^|[\s'"=]|\.\/)(package(-lock)?\.json|vercel\.json|next\.config\.ts|vite\.config\.ts|tsconfig\.json|CLAUDE\.md|README\.md|\.gitignore|middleware\.ts)\b/;
  const writes = /(^|[;&|]\s*|\s)(rm|mv|cp|tee|truncate|chmod|chown|ln|touch|mkdir|rmdir)\s|sed\s+(-[a-zA-Z]*i|--in-place)|perl\s+-[a-zA-Z]*i|>{1,2}\s*[^&\s]/;
  const rules = [
    [/\bgit\s+push\b[^;&|]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s--delete\b|\s-d\b|\s--mirror\b|\s\+\S)/, 'force-pushing or deleting branches is not allowed.'],
    [/\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|filter-branch|filter-repo|reflog\s+expire|gc\s+--prune)/, 'that Git command can destroy history or work.'],
    [/\bgit\s+rebase\s+(-i|--interactive)\b/, 'interactive rebases are not allowed.'],
    [/\bgit\s+branch\s+-D\b|\bgit\s+tag\s+-d\b/, 'deleting branches or tags is not allowed.'],
    [/\bgit\s+push\b[^;&|]*\sorigin\s+(?!(HEAD:main|main|HEAD:refs\/heads\/main)\b)\S/, 'only publishing to main is allowed (git push origin HEAD:main).'],
    [/\bgit\s+config\s+(--global\s+)?(core\.hooksPath|alias\.)/, 'changing Git hooks or aliases is not allowed.'],
    [/\b(npm|pnpm|yarn)\s+(install|i|add|remove|uninstall|rm|update|up|upgrade|link)\s+\S/, 'installing or removing packages changes the site code.'],
    [/\b(npx|pnpm\s+dlx|bunx)\s/, 'running downloaded tools is not part of content editing.'],
    [/\bvercel\b|\bgh\s+(repo\s+(edit|delete|rename|archive)|secret|variable|api\s+-X\s*(DELETE|PATCH|PUT|POST))/i, 'changing hosting or repository settings is not allowed.'],
    [/\b(rm|rmdir)\s+(-[a-zA-Z]*\s+)*['"]?content\/?(projects|memories)?\/?['"]?(\s|$)/, 'deleting whole content folders is not allowed; use the remove scripts.'],
  ];
  for (const [re, why] of rules) if (re.test(cmd)) block(why);
  if (writes.test(cmd) && protectedPath.test(cmd)) block('that command would change files outside content/.');
}
process.exit(0);
