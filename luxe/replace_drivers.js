const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/drivers/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Container Tabs
  ['bg-gray-100 p-1 rounded-lg', 'bg-neutral-100 p-1 rounded-xl'],
  ['bg-white shadow-sm', 'bg-white shadow-sm text-brand font-semibold'],
  ['text-gray-600 hover:text-gray-900', 'text-neutral-500 hover:text-brand'],
  
  // Cards and Forms
  ['border rounded-xl bg-white shadow-sm', 'bg-neutral-50 rounded-2xl'],
  ['bg-white border rounded-xl p-6 shadow-sm', 'bg-neutral-50 rounded-2xl p-6'],
  ['bg-white border rounded-xl overflow-hidden shadow-sm', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  
  // Images
  ['bg-gray-100', 'bg-neutral-200'],
  
  // Status text colors
  ['text-green-600', 'text-brand'],
  ['text-blue-600 hover:text-blue-800', 'text-neutral-400 hover:text-brand'],
  ['text-red-600 hover:text-red-800', 'text-neutral-400 hover:text-brand'],
  ['text-blue-600', 'text-brand'],
  ['text-red-600', 'text-neutral-400'],
  ['text-amber-600', 'text-accent'],
  
  // Text colors
  ['text-gray-300', 'text-neutral-200'],
  ['text-gray-400', 'text-neutral-400'],
  ['text-gray-500', 'text-neutral-500'],
  ['text-gray-600', 'text-neutral-600'],
  ['text-gray-900', 'text-brand'],
  
  // Backgrounds & Borders
  ['bg-gray-50 border-t', 'bg-white border-t border-neutral-100'],
  ['bg-gray-50 border-b', 'bg-white border-b border-neutral-100'],
  ['bg-gray-50', 'bg-neutral-100'],
  
  // Buttons
  ['bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800', 'bg-brand text-white px-4 py-2 rounded-xl hover:bg-neutral-900 transition-colors'],
  ['hover:bg-gray-50', 'hover:bg-neutral-100'],
  ['bg-black text-white rounded-lg hover:bg-gray-800', 'bg-brand text-white rounded-xl hover:bg-neutral-900 transition-colors'],
  
  // Inputs
  ['border p-2 rounded', 'border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content, 'utf8');
