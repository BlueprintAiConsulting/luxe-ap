const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/pricing/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Container Tabs
  ['bg-neutral-100 p-1 rounded-lg', 'bg-neutral-100 p-1 rounded-xl'],
  ['bg-white shadow-sm', 'bg-white shadow-sm text-brand font-semibold'],
  ['text-neutral-600 hover:text-neutral-900', 'text-neutral-500 hover:text-brand font-medium'],
  
  // Cards and Forms
  ['border rounded-xl bg-neutral-50', 'rounded-2xl bg-neutral-50'],
  ['bg-white border rounded-xl overflow-hidden shadow-sm p-6', 'bg-neutral-50 rounded-2xl overflow-hidden p-6'],
  ['bg-white border rounded-xl overflow-hidden shadow-sm', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  ['bg-white border rounded-xl p-6 shadow-sm', 'bg-neutral-50 rounded-2xl p-6'],
  
  // Inner containers
  ['bg-neutral-50 border-b', 'bg-white border-b border-neutral-100'],
  ['border p-4 rounded-lg bg-neutral-50', 'p-4 rounded-2xl bg-white border border-neutral-100'],
  ['bg-neutral-50 p-2 border rounded', 'bg-white p-2 rounded-xl border border-neutral-100'],
  ['border rounded-lg overflow-hidden', 'rounded-2xl overflow-hidden border border-neutral-100 bg-white'],
  ['bg-neutral-50 p-4 border-b', 'bg-white p-4 border-b border-neutral-100'],
  ['bg-neutral-50 p-4 rounded-lg border', 'bg-white p-4 rounded-2xl border border-neutral-100'],
  
  // Table head
  ['bg-neutral-100', 'bg-neutral-50 text-neutral-500'],
  
  // Inputs
  ['border p-2 rounded w-full', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white w-full'],
  ['border p-2 w-full rounded', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white w-full'],
  ['border p-1 rounded w-full', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white w-full'],
  ['border p-1 rounded w-24', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white w-24'],
  ['border p-1 rounded', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content, 'utf8');
