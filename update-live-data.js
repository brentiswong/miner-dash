const fs = require('fs');
const fetch = require('node-fetch'); // This is crucial!

const WALLET = process.env.WALLET;
const PROXY = 'https://api.codetabs.com/v1/proxy?quest=';

async function updateLiveData() {
  console.log('Starting update for wallet:', WALLET || 'NOT SET');

  try {
    console.log('Fetching user hashrate...');
    const hrRes = await fetch(PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/user_hashrate_full/${WALLET}`));
    console.log('HR response status:', hrRes.status);
    if (!hrRes.ok) throw new Error(`HR fetch failed: ${hrRes.status}`);

    console.log('Fetching statsnap...');
    const uRes = await fetch(PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/statsnap/${WALLET}`));
    console.log('Statsnap response status:', uRes.status);
    if (!uRes.ok) throw new Error(`Statsnap fetch failed: ${uRes.status}`);

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

    console.log('Calculated:', { ph, activeCount, timestamp });

    let data = [];
    if (fs.existsSync('live_data.json')) {
      console.log('Reading existing live_data.json');
      const content = fs.readFileSync('live_data.json', 'utf8');
      data = JSON.parse(content);
    } else {
      console.log('No existing live_data.json - starting new array');
    }

    data.push({ time: label, ph, miners: activeCount, timestamp });

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    data = data.filter(d => d.timestamp > sevenDaysAgo).slice(-10080);

    console.log('Writing to live_data.json - new entry count:', data.length);
    fs.writeFileSync('live_data.json', JSON.stringify(data, null, 2));
    console.log('File written successfully');
  } catch (e) {
    console.error('Error in update script:', e.message);
    console.error(e.stack);
  }
}

updateLiveData();
