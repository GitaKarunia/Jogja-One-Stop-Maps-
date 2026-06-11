const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Lenovo/.gemini/antigravity/brain/60217b18-1b68-4582-bd74-4ece99bff0fd/mobile-description-audit.csv', 'utf8').split('\n');
let count = 0;
console.log('| Destinasi | Kategori | Sebelum (Potongan Kasar) | Sesudah (1 Kalimat Utuh/Fallback) |');
console.log('| --- | --- | --- | --- |');
for(let i=1; i<lines.length; i++) {
  if(!lines[i].trim()) continue;
  const cols = lines[i].match(/(?:\"([^\"]*)\")|([^\,]+)/g).map(c => c.replace(/^\"|\"$/g, '').replace(/\"\"/g, '\"'));
  if(cols[7] === 'CHANGED' && count < 20) {
    console.log(`| ${cols[2]} | ${cols[3]} | ${cols[5].slice(0, 50)}... | ${cols[6]} |`);
    count++;
  }
}
