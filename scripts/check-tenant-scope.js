const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'apps', 'api', 'src');
const tenantDelegates = [
  'organization',
  'department',
  'team',
  'user',
  'role',
  'lead',
  'contact',
  'company',
  'pipeline',
  'dealStage',
  'deal',
  'note',
  'activity',
  'tag',
  'campaignTemplate',
  'campaign',
  'channelAccount',
  'conversation',
  'notification',
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

const offenders = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const delegate of tenantDelegates) {
    const callPattern = new RegExp(`\\.prisma\\.${delegate}\\.(update|delete|findUnique)\\s*\\(([\\s\\S]*?)\\n\\s*\\}\\s*\\)`, 'g');
    let match;
    while ((match = callPattern.exec(source))) {
      const body = match[2];
      if (/where\s*:\s*\{\s*id\s*[:},]/.test(body) && !/orgId\s*:/.test(body)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        offenders.push(`${path.relative(process.cwd(), file)}:${line} ${delegate}.${match[1]} uses id without orgId`);
      }
    }
  }
}

if (offenders.length > 0) {
  console.error('Tenant-scope check failed:');
  for (const offender of offenders) console.error(` - ${offender}`);
  process.exit(1);
}

console.log('Tenant-scope check passed');
