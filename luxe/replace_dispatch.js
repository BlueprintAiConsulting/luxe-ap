const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/dispatch/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ['bg-white p-2 rounded-xl shadow-sm border border-neutral-200', 'bg-neutral-50 p-2 rounded-xl'],
  ['p-6 bg-white border border-neutral-200 rounded-2xl', 'p-6 bg-neutral-50 rounded-2xl'],
  ['bg-white border-neutral-200 hover:border-neutral-300 shadow-sm', 'bg-neutral-50 border-transparent hover:border-neutral-200'],
  ['bg-red-50 border-red-200 hover:border-red-300', 'bg-neutral-100 border-neutral-200 hover:border-neutral-300'],
  ['text-red-600 bg-red-100', 'text-brand bg-accent/20'],
  ['bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  ['bg-neutral-50 text-neutral-500 text-xs r border-b border-neutral-200', 'bg-white text-neutral-500 text-xs border-b border-neutral-100'],
  
  // Status colors
  ['bg-emerald-100 text-emerald-800', 'bg-neutral-200 text-brand'],
  ['bg-red-100 text-red-800', 'bg-neutral-100 text-neutral-500 line-through'],
  ['bg-blue-100 text-blue-800', 'bg-neutral-800 text-white'],
  ['bg-indigo-100 text-indigo-800', 'bg-brand text-white'],
  ['bg-amber-100 text-amber-800', 'bg-neutral-300 text-brand'],
  ['bg-neutral-100 text-neutral-700', 'bg-neutral-200 text-neutral-600'],

  // Typography
  ['text-neutral-500 text-sm mt-1', 'text-neutral-500 text-sm mt-1 font-medium'],
  ['text-xl font-bold', 'text-xl font-semibold text-brand'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content, 'utf8');
