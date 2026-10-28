const normalizePayload = (payload) => {
  if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) return payload;
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch (_) { return {}; }
  }
  return {};
};

async function listRecords(connection, type) {
  const [rows] = await connection.promise().query(
    'SELECT id, record_key, payload FROM app_records WHERE record_type = ? ORDER BY id DESC',
    [type]
  );
  return rows.map((row) => ({ ...normalizePayload(row.payload), id: Number(row.id), record_key: row.record_key }));
}

async function getRecord(connection, type, key) {
  const [rows] = await connection.promise().query(
    'SELECT id, record_key, payload FROM app_records WHERE record_type = ? AND record_key = ? LIMIT 1',
    [type, String(key)]
  );
  if (!rows.length) return null;
  return { ...normalizePayload(rows[0].payload), id: Number(rows[0].id), record_key: rows[0].record_key };
}

async function saveRecord(connection, type, key, payload) {
  await connection.promise().query(
    `INSERT INTO app_records (record_type, record_key, payload)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [type, String(key), JSON.stringify(payload)]
  );
  return getRecord(connection, type, key);
}

async function updateRecord(connection, type, id, payload) {
  const [result] = await connection.promise().query(
    'UPDATE app_records SET payload = ? WHERE id = ? AND record_type = ?',
    [JSON.stringify(payload), id, type]
  );
  return result.affectedRows > 0;
}

async function deleteRecord(connection, type, id) {
  const [result] = await connection.promise().query(
    'DELETE FROM app_records WHERE id = ? AND record_type = ?',
    [id, type]
  );
  return result.affectedRows > 0;
}

async function saveNotification(connection, payload) {
  const key = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return saveRecord(connection, 'notification', key, payload);
}

module.exports = { listRecords, getRecord, saveRecord, updateRecord, deleteRecord, saveNotification };
