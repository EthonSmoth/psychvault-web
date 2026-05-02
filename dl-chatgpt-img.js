const https = require('https');
const fs = require('fs');
const path = require('path');

const SLUG = 'npe';

const downloads = [
  {
    dest: `${SLUG}-hero.png`,
    url: process.argv[2]  // pass URL as first arg
  }
];

function download(url, dest, cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'chatgpt.com',
      path: url.replace('https://chatgpt.com', ''),
      headers: {
        'Cookie': cookies,
        'Referer': 'https://chatgpt.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.265 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'sec-fetch-dest': 'image',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-site': 'same-origin',
      }
    };
    const file = fs.createWriteStream(dest);
    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body}`)));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', reject);
  });
}

const cookies = process.argv[3];
const url = process.argv[2];
const dest = path.join(__dirname, 'public', 'blog', 'raw', path.basename(url.split('?')[0]) || `${SLUG}-hero.png`);
const realDest = path.join(__dirname, 'public', 'blog', 'raw', `${SLUG}-img.png`);

download(url, realDest, cookies)
  .then(f => console.log('OK:', f, fs.statSync(f).size, 'bytes'))
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
