/* global XLSX */
'use strict';

// Load SheetJS from our own static bundle — no CDN dependency, no bundler magic needed.
// This file is a classic Web Worker loaded via new Worker('/import-worker.js').
importScripts('/xlsx.full.min.js');

// ── Helpers (matches lib/clean.ts) ───────────────────────────────────────────

var NULL_SET = new Set(['-', '--', 'na', 'n/a', 'null', 'none', 'nil', '#n/a', 'n.a.', 'n.a']);

function cleanCell(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    var s = val.trim();
    return NULL_SET.has(s.toLowerCase()) || s === '' ? null : s;
  }
  return val;
}

function fmtISO(d) {
  var y = d.getUTCFullYear();
  var m = String(d.getUTCMonth() + 1).padStart(2, '0');
  var dd = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function toText(val) {
  var v = cleanCell(val);
  if (v === null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    var n = Math.round(v);
    if (Math.abs(v - n) < 1e-9) return String(n);
    return String(v).replace(/\.?0+$/, '');
  }
  if (v instanceof Date) return fmtISO(v);
  return String(v).trim() || null;
}

var MON = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function parseDate(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : fmtISO(val);
  if (typeof val === 'number') {
    if (val < 1 || val > 2958465) return null;
    return fmtISO(new Date((val - 25569) * 86400 * 1000));
  }
  if (typeof val !== 'string') return null;
  var s = val.trim();
  if (!s || NULL_SET.has(s.toLowerCase())) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var mon = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (mon) {
    var mIdx = MON[mon[2].toLowerCase()];
    if (mIdx === undefined) return null;
    var yr = parseInt(mon[3], 10);
    if (yr < 100) yr += yr >= 50 ? 1900 : 2000;
    return yr + '-' + String(mIdx + 1).padStart(2, '0') + '-' + String(parseInt(mon[1], 10)).padStart(2, '0');
  }
  var dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : fmtISO(d);
}

function parseBool(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  var s = String(val).trim().toLowerCase();
  if (['paid', 'yes', 'true', '1', 'y'].indexOf(s) >= 0) return true;
  if (['unpaid', 'no', 'false', '0', 'n'].indexOf(s) >= 0) return false;
  return null;
}

function normaliseHeader(h) {
  return String(h === null || h === undefined ? '' : h).toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function makeHeaders(anonKey, accessToken) {
  return {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  };
}

async function sbCount(supabaseUrl, table, headers) {
  var r = await fetch(supabaseUrl + '/rest/v1/' + table + '?select=*', {
    method: 'HEAD',
    headers: Object.assign({}, headers, { 'Prefer': 'count=exact' }),
  });
  if (!r.ok) return null;
  var cr = r.headers.get('content-range');
  if (!cr) return null;
  var parts = cr.split('/');
  return parts[1] ? parseInt(parts[1], 10) : null;
}

async function sbUpsert(supabaseUrl, table, headers, batch) {
  var r = await fetch(supabaseUrl + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(batch),
  });
  if (!r.ok) {
    var body = '';
    try { body = await r.text(); } catch (_) {}
    throw new Error('Supabase upsert error ' + r.status + ': ' + body);
  }
}

async function sbInsert(supabaseUrl, table, headers, record) {
  var r = await fetch(supabaseUrl + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign({}, headers, { 'Prefer': 'return=minimal' }),
    body: JSON.stringify(record),
  });
  if (!r.ok) {
    var body = '';
    try { body = await r.text(); } catch (_) {}
    throw new Error('Supabase insert error ' + r.status + ': ' + body);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

self.onmessage = async function(e) {
  var post = function(d) { self.postMessage(d); };
  var data = e.data;
  var buffer = data.buffer;
  var supabaseUrl = data.supabaseUrl;
  var anonKey = data.anonKey;
  var accessToken = data.accessToken;
  var sheetName = data.sheetName;
  var table = data.table;
  var columns = data.columns;
  var ignoredHeaders = data.ignoredHeaders;
  var fileName = data.fileName;
  var userId = data.userId;
  var userName = data.userName;
  var brandKey = data.brandKey;

  var hdrs = makeHeaders(anonKey, accessToken);

  try {
    post({ type: 'progress', msg: 'Reading file…', pct: 5 });

    var wb = XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: false,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      bookVBA: false,
    });

    var wsName = wb.SheetNames.find(function(n) {
      return n.trim().toLowerCase() === sheetName.toLowerCase();
    }) || wb.SheetNames[0];

    if (!wsName) throw new Error('No sheets found in the workbook.');

    post({ type: 'progress', msg: 'Parsing rows…', pct: 10 });

    var ws = wb.Sheets[wsName];
    var rows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: null });

    if (rows.length === 0) {
      post({ type: 'done', result: { total: 0, inserted: 0, updated: 0, skipped: 0, skippedRows: [] } });
      return;
    }

    post({ type: 'progress', msg: 'Validating headers…', pct: 15 });

    var headerToField = new Map();
    columns.forEach(function(col) { headerToField.set(normaliseHeader(col.header), col.field); });

    var ignoredNorm = new Set(ignoredHeaders.map(normaliseHeader));

    var fileHeaders = Object.keys(rows[0]).map(normaliseHeader);
    var missing = columns.filter(function(c) {
      return c.required && !fileHeaders.includes(normaliseHeader(c.header));
    });
    if (missing.length > 0) {
      throw new Error('Missing required columns: ' + missing.map(function(c) { return c.header; }).join(', '));
    }

    post({ type: 'progress', msg: 'Processing rows…', pct: 20 });

    var recordMap = new Map();
    var skippedRows = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      var raw = {};

      var rowKeys = Object.keys(row);
      for (var j = 0; j < rowKeys.length; j++) {
        var rawKey = rowKeys[j];
        var rawVal = row[rawKey];
        var normKey = normaliseHeader(rawKey);
        var field = headerToField.get(normKey);

        if (field) {
          var col = columns.find(function(c) { return c.field === field; });
          if (col.type === 'date') {
            record[field] = parseDate(rawVal);
          } else if (col.type === 'boolean') {
            record[field] = parseBool(rawVal);
          } else if (col.type === 'status') {
            var txt = toText(rawVal);
            record[field] = txt !== null ? txt.replace(/\s+/g, ' ') : null;
          } else {
            record[field] = toText(rawVal);
          }
        } else if (!ignoredNorm.has(normKey) && normKey !== '') {
          raw[rawKey] = rawVal instanceof Date ? rawVal.toISOString().slice(0, 10) : rawVal;
        }
      }

      var code = record['activation_code'];
      if (!code) { skippedRows.push(row); continue; }
      record['raw'] = Object.keys(raw).length > 0 ? raw : null;
      recordMap.set(String(code), record);
    }

    var records = Array.from(recordMap.values());

    var countBefore = await sbCount(supabaseUrl, table, hdrs);

    var BATCH = 1000;
    var now = new Date().toISOString();

    for (var k = 0; k < records.length; k += BATCH) {
      var batch = records.slice(k, k + BATCH).map(function(r) {
        return Object.assign({}, r, { updated_at: now });
      });
      var pct = 20 + Math.round((k / Math.max(records.length, 1)) * 70);
      post({
        type: 'progress',
        msg: 'Uploading rows ' + (k + 1) + '–' + Math.min(k + BATCH, records.length) + '…',
        pct: pct,
      });
      await sbUpsert(supabaseUrl, table, hdrs, batch);
    }

    post({ type: 'progress', msg: 'Saving import record…', pct: 92 });

    var countAfter = await sbCount(supabaseUrl, table, hdrs);
    var inserted = (countBefore !== null && countAfter !== null) ? Math.max(0, countAfter - countBefore) : 0;
    var updated = records.length - inserted;

    await sbInsert(supabaseUrl, 'imports', hdrs, {
      brand: brandKey,
      file_name: fileName,
      total_rows: records.length,
      inserted: inserted,
      updated: updated,
      skipped: skippedRows.length,
      uploaded_by: userId,
      uploaded_by_name: userName,
      status: 'completed',
    });

    post({ type: 'progress', msg: 'Done!', pct: 100 });
    post({ type: 'done', result: { total: records.length, inserted: inserted, updated: updated, skipped: skippedRows.length, skippedRows: skippedRows } });

  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
