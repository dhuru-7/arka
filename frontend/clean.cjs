const fs = require('fs');
const content = fs.readFileSync('src/Arena.jsx');
const decoded = new TextDecoder('utf-8', { fatal: false }).decode(content);
const fixed = decoded.replace(/══════const TEMPLATES/, '══════ */\nconst TEMPLATES').replace(/══════const TEMPLATES/, '══════ */\nconst TEMPLATES');
fs.writeFileSync('src/Arena.jsx', fixed, 'utf-8');
console.log('Done!');
