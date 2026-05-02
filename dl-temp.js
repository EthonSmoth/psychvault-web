const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES = [
  {
    url: 'https://chatgpt.com/backend-api/estuary/content?id=file_000000005a24720693c7c8abe1c221c2&ts=493807&p=fs&cid=1&sig=3e078951c150239e40c6d506da75f0715fa64a961d35a60ce1f850f046272858&v=0',
    dest: path.join(__dirname, 'public', 'blog', 'raw', 'ahpra-psychology-internship-requirements-explained-tools.png')
  }
];

const fs2 = require('fs');
const COOKIES = process.argv[2] || fs2.readFileSync(require('path').join(__dirname, 'dl-cookies.txt'), 'utf8').trim();

function download(url, dest, cookies) {
  return new Promise((resolve, reject) => {
    const urlPath = url.replace('https://chatgpt.com', '');
    const options = {
      hostname: 'chatgpt.com',
      path: urlPath,
      headers: {
        'Cookie': cookies,
        'Referer': 'https://chatgpt.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.265 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      }
    };
    const file = fs.createWriteStream(dest);
    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0,200)}`)));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', reject);
  });
}

(async () => {
  for (const img of IMAGES) {
    try {
      const f = await download(img.url, img.dest, COOKIES);
      console.log('OK:', f, fs.statSync(f).size, 'bytes');
    } catch (e) {
      console.error('FAIL:', e.message);
      process.exit(1);
    }
  }
})();
