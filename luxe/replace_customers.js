const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/customers/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ['<h1 className="text-3xl font-bold">', '<h1 className="text-3xl font-bold text-brand uppercase tracking-tight">'],
  ['bg-white border border-neutral-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-black', 'bg-white border border-neutral-200 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand'],
  ['p-12 bg-white border border-neutral-200 rounded-2xl', 'p-12 bg-neutral-50 rounded-2xl'],
  ['bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  ['bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200', 'bg-white text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100'],
  
  // Table headers
  ['<th className="p-4 font-bold">', '<th className="p-4 font-semibold">'],
  
  // Avatars
  ['bg-neutral-200 flex items-center justify-center text-neutral-500', 'bg-neutral-200 flex items-center justify-center text-brand'],
  
  // Text
  ['<div className="font-bold text-sm">', '<div className="font-medium text-brand text-sm">'],
  ['text-amber-500', 'text-accent'],
  ['<div className="text-sm font-semibold flex items-center mb-1">', '<div className="text-sm font-medium text-brand flex items-center mb-1">'],
  ['<div className="text-sm text-neutral-600 flex items-center">', '<div className="text-sm text-brand font-medium flex items-center">'],
  
  // Status labels
  ['bg-red-100 text-red-800 text-xs font-bold', 'bg-neutral-200 text-neutral-600 text-xs font-semibold'],
  ['bg-emerald-100 text-emerald-800 text-xs font-bold', 'bg-brand text-white text-xs font-semibold']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content, 'utf8');
