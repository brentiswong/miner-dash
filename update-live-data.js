const fs = require('fs');
const fetch = require('node-fetch'); // This MUST be here!

const WALLET = process.env.WALLET || '';
const PROXY = 'https://api.codetabs.com/v1/proxy?quest=';

async function updateLiveData() {
  console.log('Starting update for wallet:', WALLET || 'NOT SET');

  if (!WALLET) {
    console.error('Error: WALLET environment variable is not set');
    return;
  }

  try {
    console.log('Fetching hashrate data...');
    const hrUrl = PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/user_hashrate_full/${WALLET}`);
    const hrRes = await fetch(hrUrl);
    console.log('Hashrate response status:', hrRes.status);

    console.log('Fetching statsnap...');
    const statsUrl = PROXY + encodeURIComponent(`https://api.ocean.xyz/v1/statsnap/${WALLET}`);
    const uRes = await fetch(statsUrl);
    console.log('Statsnap response status:', uRes.status);

    if (!hrRes.ok || !uRes.ok) {
      throw new Error(`API fetch failed: ${hrRes.status} / ${uRes.status}`);
    }

    const hrData = await hrRes.json();
    const u = (await uRes.json()).result || {};

    const ws = hrData.result?.workers || {};

    let t5 = 0;
    let activeCount = 0;
    Object.keys(ws).forEach(n => {
      const s = ws[n][0];
      const curH = parseFloat(s.hashrate_300s || 0);
      t5 += curH;
      if (curH > 0) activeCount++;
    });

    const ph = (t5 / 1e15).toFixed(2);
    const label = new Date().toLocaleTimeString();
    const timestamp = Date.now();

    console.log('Calculated:', { ph, activeCount, timestamp });

    let data = [];
    if (fs.existsSync('live_data.json')) {
      console.log('Reading existing data');
      const content = fs.readFileSync('live_data.json', 'utf8');
      data = JSON.parse(content);
    } else {
      console.log('Starting with empty array');
    }

    data.push({ time: label, ph, miners: activeCount, timestamp });

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    data = data.filter(d => d.timestamp > sevenDaysAgo).slice(-10080);

    console.log('Writing file with', data.length, 'entries');
    fs.writeFileSync('live_data.json', JSON.stringify(data, null, 2));
    console.log('Success: live_data.json updated');
  } catch (e) {
    console.error('Update script failed:', e.message);
    console.error(e.stack);
  }
}

updateLiveData();
