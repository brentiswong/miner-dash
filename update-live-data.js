const fs = require('fs');
const fetch = require('node-fetch');

const WALLET = process.env.WALLET; // Set this as an env var in the workflow
const PROXY = 'https://api.codetabs.com/v1/proxy?quest=';

async function updateLiveData() {
  try {
    const hrRes = await fetch(PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/user_hashrate_full/${WALLET}`));
    const uRes = await fetch(PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/statsnap/${WALLET}`));

    const u = (await uRes.json()).result || {};
    const ws = (await hrRes.json()).result?.workers || {};

    let t5 = 0;
    let activeCount = 0;
    Object.keys(ws).forEach(n => {
      const s = ws[n][0];
      const curH = parseFloat(s.hashrate_300s);
      t5 += curH;
      if (curH > 0) activeCount++;
    });

    const ph = (t5 / 1e15).toFixed(2);
    const label = new Date().toLocaleTimeString();
    const timestamp = Date.now();

    // Load existing data if file exists
    let data = [];
    if (fs.existsSync('live_data.json')) {
      data = JSON.parse(fs.readFileSync('live_data.json', 'utf8'));
    }

    // Add new entry
    data.push({ time: label, ph, miners: activeCount, timestamp });

    // Prune old data (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    data = data.filter(d => d.timestamp > sevenDaysAgo).slice(-10080); // Max ~1/min for 7 days

    // Write back to file
    fs.writeFileSync('live_data.json', JSON.stringify(data, null, 2));
    console.log(`Updated live data: PH/s=${ph}, Miners=${activeCount}`);
  } catch (e) {
    console.error('Error updating data:', e);
  }
}

updateLiveData();
