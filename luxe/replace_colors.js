const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/vehicles/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
const replacements = [
  // Container Tabs
  ['bg-gray-100 p-1 rounded-lg', 'bg-neutral-100 p-1 rounded-xl'],
  ['bg-white shadow-sm', 'bg-white shadow-sm text-brand'],
  ['text-gray-600 hover:text-gray-900', 'text-neutral-500 hover:text-brand'],
  
  // Cards and Forms
  ['border rounded-xl overflow-hidden bg-white shadow-sm', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  ['bg-white border rounded-xl overflow-hidden shadow-sm', 'bg-neutral-50 rounded-2xl overflow-hidden'],
  ['bg-white border rounded-xl p-6 shadow-sm', 'bg-neutral-50 rounded-2xl p-6'],
  
  // Image placeholders
  ['bg-gray-100 relative', 'bg-neutral-100 relative'],
  ['text-gray-400', 'text-neutral-300'],
  
  // Status badges
  ['bg-red-100 text-red-800', 'bg-neutral-200 text-neutral-600'],
  ['bg-gray-100 px-2', 'bg-neutral-200 px-2'],
  ['text-green-600', 'text-brand'],
  ['bg-green-500', 'bg-accent'],
  ['text-red-600', 'text-neutral-400'],
  ['bg-red-500', 'bg-neutral-300'],
  
  // Text colors
  ['text-gray-500', 'text-neutral-500'],
  ['text-gray-600', 'text-neutral-500'],
  
  // Actions
  ['text-red-600 hover:text-red-800', 'text-neutral-400 hover:text-brand'],
  ['text-blue-600 hover:text-blue-800', 'text-neutral-400 hover:text-brand'],
  
  // Buttons
  ['bg-black text-white', 'bg-brand text-white'],
  ['hover:bg-gray-800', 'hover:bg-neutral-900'],
  ['hover:bg-gray-50', 'hover:bg-neutral-100'],
  
  // Table headers
  ['bg-gray-50 border-b', 'bg-white border-b border-neutral-200'],
  
  // Inputs
  ['border p-2 rounded', 'border border-neutral-200 p-2 rounded focus:ring-1 focus:ring-brand focus:border-brand outline-none'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully polished UI colors and layouts.');
