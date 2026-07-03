const fs = require('fs');

const places = JSON.parse(fs.readFileSync('./data/mock_hanoi_places.json', 'utf8'));
const routes = JSON.parse(fs.readFileSync('./data/mock_routes.json', 'utf8'));

const missingRoutes = places.filter(p => !routes[p.place_id]);
console.log(`Missing routes for ${missingRoutes.length} places:`);
missingRoutes.forEach(p => console.log(`- ${p.place_id}: ${p.name}`));

// Check what the first route's steps look like
const firstRouteId = Object.keys(routes)[0];
console.log('\nSteps for first route:', JSON.stringify(routes[firstRouteId].steps, null, 2));
