const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const normalize = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

function distance(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
}

function matches(requested, routeStages) {
  const wanted = normalize(requested);
  const exact = routeStages.filter((stage) => normalize(stage.stagename) === wanted);
  if (exact.length) return exact;
  return routeStages.filter((stage) => {
    const current = normalize(stage.stagename);
    if (Math.min(current.length, wanted.length) >= 6 && (current.includes(wanted) || wanted.includes(current))) return true;
    const threshold = Math.max(1, Math.floor(Math.min(current.length, wanted.length) * 0.15));
    return Math.min(current.length, wanted.length) >= 8 && distance(current, wanted) <= threshold;
  });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Pass the tab-separated PLACE / BOARDING PLACE file path as the first argument.');
  const lines = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1);
  const pairs = new Map();
  for (const line of lines) {
    const [place, ...stageParts] = line.split('\t');
    const stage = stageParts.join(' ').trim();
    if (!place?.trim() || !stage) continue;
    pairs.set(`${normalize(place)}|${normalize(stage)}`, { place: place.trim(), stage });
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT || 3306)
  });
  try {
    const [routes] = await connection.query('SELECT routeid, routename, city FROM route');
    const [stages] = await connection.query('SELECT routeid, stagename FROM stage');
    const additions = [];
    const review = [];
    for (const pair of pairs.values()) {
      let candidates = routes.filter((route) => normalize(route.city) === normalize(pair.place));
      if (!candidates.length) candidates = routes.filter((route) => normalize(route.routename).startsWith(normalize(pair.place)));
      if (!candidates.length) candidates = routes.filter((route) => {
        const city = normalize(route.city);
        const wanted = normalize(pair.place);
        const threshold = Math.max(1, Math.floor(Math.min(city.length, wanted.length) * 0.2));
        return Math.min(city.length, wanted.length) >= 8 && distance(city, wanted) <= threshold;
      });
      const routeIds = new Set(candidates.map((route) => String(route.routeid)));
      const routeStages = stages.filter((stage) => routeIds.has(String(stage.routeid)));
      const stageMatches = matches(pair.stage, routeStages);
      const matchingRouteIds = new Set(stageMatches.map((stage) => String(stage.routeid)));
      if (matchingRouteIds.size === 1) continue;
      if (stageMatches.length > 1 || candidates.length > 1) {
        review.push({ ...pair, reason: 'More than one route is possible' });
        continue;
      }
      if (candidates.length === 1) {
        additions.push({ ...pair, route: candidates[0] });
      } else {
        review.push({ ...pair, reason: 'No matching route found' });
      }
    }

    await connection.beginTransaction();
    for (const item of additions) {
      const [[duplicate]] = await connection.query(
        'SELECT stageid FROM stage WHERE routeid = ? AND LOWER(TRIM(stagename)) = LOWER(TRIM(?)) LIMIT 1',
        [item.route.routeid, item.stage]
      );
      if (duplicate) continue;
      const stageid = `ST-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      await connection.query(
        'INSERT INTO stage (stageid, stagename, city, routeid, arrivaltime, departureTime, fee) VALUES (?, ?, ?, ?, NULL, NULL, NULL)',
        [stageid, item.stage, item.route.city || item.place, item.route.routeid]
      );
      await connection.query('UPDATE route SET totalstages = COALESCE(totalstages, 0) + 1 WHERE routeid = ?', [item.route.routeid]);
    }
    await connection.commit();
    console.log(JSON.stringify({ uniquePairs: pairs.size, stagesAdded: additions.length, needingRouteReview: review.length, review: review.slice(0, 25) }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Boarding stage reconciliation failed: ${error.message}`);
  process.exitCode = 1;
});
