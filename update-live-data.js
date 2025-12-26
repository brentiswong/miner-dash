const fs = require('fs');
const https = require('https');

const WALLET = process.env.WALLET || '';
const BASE_URL = 'https://api.ocean.xyz/v1/';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect manually
        console.log('Redirect to:', res.headers.location);
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}...`));
        }
      });
    }).on('error', reject);
  });
}

async function updateLiveData() {
  console.log('Starting update for wallet:', WALLET || 'NOT SET');

  if (!WALLET) {
    console.error('ERROR: WALLET secret not set');
    return;
  }

  try {
    console.log('Fetching hashrate data...');
    const hrData = await fetchJson(`${BASE_URL}user_hashrate_full/${WALLET}`);
    console.log('Hashrate data received');

    console.log('Fetching statsnap...');
    const statsData = await fetchJson(`${BASE_URL}statsnap/${WALLET}`);
    console.log('Statsnap data received');

    const ws = hrData.result?.workers || {};
    let t5 = 0, activeCount = 0;

    Object.keys(ws).forEach(n => {
      const s = ws[n][0];
      const curH = parseFloat(s?.hashrate_300s || 0);
      t5 += curH;
      if (curH > 0) activeCount++;
    });

    const ph = (t5 / 1e15).toFixed(2);
    const label = new Date().toLocaleTimeString();
    const timestamp = Date.now();

    console.log(`PH/s: ${ph}, Active miners: ${activeCount}`);

    let data = [];
    if (fs.existsSync('live_data.json')) {
      data = JSON.parse(fs.readFileSync('live_data.json', 'utf8'));
    }

    data.push({ time: label, ph: parseFloat(ph), miners: activeCount, timestamp });

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    data = data.filter(d => d.timestamp > sevenDaysAgo).slice(-10080);

    fs.writeFileSync('live_data.json', JSON.stringify(data, null, 2));
    console.log(`SUCCESS: Updated live_data.json (${data.length} entries)`);
  } catch (e) {
    console.error('SCRIPT ERROR:', e.message);
  }
}

updateLiveData();
