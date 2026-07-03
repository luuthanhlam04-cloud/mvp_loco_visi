const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'VisiApp/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function test() {
  // Test OSRM
  const url = 'http://router.project-osrm.org/route/v1/driving/105.8576,21.0242;105.854166,21.028511?steps=true&geometries=geojson&overview=full';
  const http = require('http');
  const osrmData = await new Promise(resolve => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
  console.log('OSRM Route Distance:', osrmData.routes?.[0]?.distance);
  console.log('OSRM Steps[0]:', osrmData.routes?.[0]?.legs?.[0]?.steps?.[0]);

  // Test Wikipedia
  const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('Hồ Hoàn Kiếm')}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=600`;
  const wikiData = await fetchJson(wikiUrl);
  const pages = wikiData?.query?.pages || {};
  const firstPage = Object.values(pages)[0];
  console.log('Wiki Image:', firstPage?.thumbnail?.source);
}
test();
