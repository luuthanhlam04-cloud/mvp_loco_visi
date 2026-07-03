const fs = require('fs');
const https = require('https');
const http = require('http');

function fetchJsonHttp(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers: { 'User-Agent': 'VisiApp/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function fetchJsonHttps(url) {
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

const placesPath = './data/mock_hanoi_places.json';
const routesPath = './data/mock_routes.json';

const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
let routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

const CURRENT_LOC = { lat: 21.0242, lng: 105.8576 };

function translateInstruction(m) {
  if (!m) return "Đi thẳng";
  const type = m.type;
  const modifier = m.modifier;

  let modStr = '';
  switch(modifier) {
    case 'uturn': modStr = 'quay đầu'; break;
    case 'sharp right': modStr = 'rẽ ngoặt phải'; break;
    case 'right': modStr = 'rẽ phải'; break;
    case 'slight right': modStr = 'chếch sang phải'; break;
    case 'straight': modStr = 'đi thẳng'; break;
    case 'slight left': modStr = 'chếch sang trái'; break;
    case 'left': modStr = 'rẽ trái'; break;
    case 'sharp left': modStr = 'rẽ ngoặt trái'; break;
  }

  if (type === 'depart') return `Bắt đầu đi về phía ${modifier === 'left' ? 'trái' : modifier === 'right' ? 'phải' : 'trước'}`;
  if (type === 'arrive') return `Đến đích`;
  if (type === 'turn') return `Rẽ ${modStr || modifier}`;
  if (type === 'continue') return `Tiếp tục ${modStr || 'đi thẳng'}`;
  if (type === 'roundabout' || type === 'rotary') return `Đi vào vòng xuyến, rẽ ${modStr || 'ra'}`;
  if (type === 'new name') return `Đi tiếp vào`;
  if (type === 'end of road') return `Cuối đường rẽ ${modStr}`;
  if (type === 'merge') return `Hòa vào làn ${modStr}`;
  
  return type ? `${type} ${modStr}` : 'Đi thẳng';
}

// Ensure proper spacing and delay
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  // Update routes
  console.log('Fetching missing routes...');
  for (let place of places) {
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${CURRENT_LOC.lng},${CURRENT_LOC.lat};${place.lng},${place.lat}?steps=true&geometries=geojson&overview=full`;
      const osrmData = await fetchJsonHttp(url);
      
      if (osrmData && osrmData.routes && osrmData.routes[0]) {
        const route = osrmData.routes[0];
        
        let steps = [];
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          steps = route.legs[0].steps.map(step => {
            let sname = step.name || '';
            if (!sname && step.maneuver.type === 'arrive') sname = place.name;
            if (!sname) sname = 'Đường không tên / Nội bộ';
            
            return {
              instruction: translateInstruction(step.maneuver),
              distance: step.distance,
              name: sname
            };
          });
        }
        
        routes[place.place_id] = {
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          steps: steps
        };
      } else {
        console.log(`Failed to get route for ${place.name}`);
      }
      // Be nice to OSRM API
      await delay(200);
    } catch (e) {
      console.log(`Error fetching route for ${place.name}:`, e.message);
    }
  }
  
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
  console.log('Saved all routes!');

  // Update Images
  console.log('Fetching realistic images...');
  for (let place of places) {
    try {
      // 1. Search Wikipedia
      const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(place.name)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=800`;
      const wikiData = await fetchJsonHttps(searchUrl);
      let imgUrl = null;
      
      if (wikiData && wikiData.query && wikiData.query.pages) {
        const pages = wikiData.query.pages;
        const firstPage = Object.values(pages)[0];
        if (firstPage && firstPage.thumbnail && firstPage.thumbnail.source) {
          imgUrl = firstPage.thumbnail.source;
        }
      }
      
      // 2. If no Wiki image, use a realistic fallback (Pexels or Unsplash placeholder based on category)
      if (!imgUrl) {
         let keyword = 'hanoi';
         if (place.category === 'Ẩm thực') keyword = 'vietnam,food';
         if (place.category === 'Tâm linh' || place.category === 'Di tích lịch sử') keyword = 'temple,hanoi';
         if (place.category === 'Cảnh quan') keyword = 'nature,hanoi';
         if (place.category === 'Mua sắm') keyword = 'market,hanoi';
         
         // Using a realistic placeholder service that returns different images
         imgUrl = `https://loremflickr.com/600/400/${keyword}?lock=${Math.floor(Math.random() * 1000)}`;
      }
      
      place.image = imgUrl;
      console.log(`Updated image for ${place.name}: ${imgUrl ? 'Yes' : 'No'}`);
      await delay(100);
    } catch (e) {
      console.log(`Error fetching image for ${place.name}:`, e.message);
    }
  }

  fs.writeFileSync(placesPath, JSON.stringify(places, null, 2));
  console.log('Saved realistic images!');
}

main();
