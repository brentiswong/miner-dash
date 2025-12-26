const fs = require('fs');
const https = require('https');

const WALLET = process.env.WALLET || '';
const BASE_URL = 'https://api.ocean.xyz/v1/';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.substring(0, 200)}...`));
        }
      });
    }).on('error', reject);
  });
}

async function updateHistorical() {
  console.log('Starting historical update for wallet:', WALLET || 'NOT SET');

  if (!WALLET) {
    console.error('ERROR: WALLET secret not set');
    return;
  }

  try {
    let allReports = [];
    let date = new Date();
    const monthsToFetch = 36; // up to 3 years

    for (let i = 0; i < monthsToFetch; i++) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const url = `${BASE_URL}monthly_user_report/${WALLET}/${y}-${m}`;

      console.log(`Fetching ${y}-${m}...`);
      try {
        const data = await fetchJson(url);
        if (data.result?.report) {
          allReports.push(...data.result.report);
          console.log(`Added ${data.result.report.length} entries`);
        }
      } catch (e) {
        console.log(`No data for ${y}-${m} or error: ${e.message}`);
      }

      date.setMonth(date.getMonth() - 1);
    }

    // Sort by date (newest first)
    allReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Optional: filter out invalid entries
    allReports = allReports.filter(r => r.date && parseFloat(r.hashrate_avg_24hr_thsec) > 0);

    fs.writeFileSync('historical_data.json', JSON.stringify(allReports, null, 2));
    console.log(`SUCCESS: historical_data.json updated with ${allReports.length} entries`);
  } catch (e) {
    console.error('Historical update failed:', e.message);
  }
}

updateHistorical();
