const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES = [
  {
    url: 'https://chatgpt.com/backend-api/estuary/content?id=file_0000000060b072079af95536e3dcb4d0&ts=493837&p=fs&cid=1&sig=f43dbe0bd9fecb3db7c5309bd3cca6da0d03c0700157c7898ca28d7c900a9902&v=0',
    dest: path.join(__dirname, 'public', 'blog', 'raw', 'supervision-hours-that-count-flexible.jpg')
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
