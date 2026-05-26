// ========== SHAREPOINT SYNC MODULE ==========
// Zebra Project Management – SharePoint 365 integration
// Uses SharePoint REST API + cookie auth (no Azure AD / MSAL needed)
// Load this AFTER state.js, BEFORE builders.js

const SP = (() => {
  // ─────────────────────────────────────────
  // CONFIGURATION – chỉnh 2 dòng này
  // ─────────────────────────────────────────
  const LIST_NAME   = 'ZebraAppData';   // Tên SharePoint List bạn tạo
  const DATA_TITLE  = 'main';           // Title của record duy nhất trong List
  // ─────────────────────────────────────────

  const LOCAL_KEY   = 'planboard_data_msproject';
  const SYNC_TS_KEY = 'planboard_sp_last_sync';

  let _siteUrl = null;
  let _digest  = null;
  let _digestExpiry = 0;
  let _ready   = false;   // true khi chạy trong SharePoint
  let _syncing = false;

  // ── Detect SharePoint context ──────────────────────────────────────────────
  function detectSP() {
    try {
      // SharePoint inject _spPageContextInfo vào mọi trang
      if (typeof _spPageContextInfo !== 'undefined' && _spPageContextInfo.webAbsoluteUrl) {
        _siteUrl = _spPageContextInfo.webAbsoluteUrl.replace(/\/$/, '');
        _ready = true;
      }
    } catch (e) {}
    return _ready;
  }

  // ── Lấy Request Digest (thay thế cho auth token) ───────────────────────────
  async function getDigest() {
    const now = Date.now();
    if (_digest && now < _digestExpiry) return _digest;
    const res = await fetch(`${_siteUrl}/_api/contextinfo`, {
      method: 'POST',
      headers: { Accept: 'application/json;odata=verbose' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Cannot get digest');
    const json = await res.json();
    _digest = json.d.GetContextWebInformation.FormDigestValue;
    // Digest hợp lệ 30 phút, làm mới sớm hơn 1 phút
    _digestExpiry = now + 29 * 60 * 1000;
    return _digest;
  }

  // ── Tạo payload data để lưu ────────────────────────────────────────────────
  function buildPayload() {
    return {
      buckets:    state.buckets,
      globalTags: state.globalTags,
      projects:   state.projects,
      nextId:     state.nextId,
      theme:      state.theme,
      todoTasks:  state.todoTasks || [],
      version:    3,
      savedAt:    new Date().toISOString()
    };
  }

  // ── Áp dụng data từ cloud vào state ───────────────────────────────────────
  function applyData(d) {
    state.buckets    = d.buckets    || state.buckets;
    state.globalTags = d.globalTags || state.globalTags || [];
    state.projects   = d.projects   || state.projects;
    state.nextId     = d.nextId     || state.nextId;
    state.theme      = d.theme      || 'light';
    state.todoTasks  = d.todoTasks  || [];
    state.selectedBucketId = state.buckets[0]?.id || 1;

    // Migration giống state.js
    state.projects.forEach(p => {
      if (!p.tagIds)  p.tagIds = [];
      if (!p.finance) p.finance = { budget:'', actualInvest:'', monthlySaving:'', investType:'CAPEX', refs:[] };
      if (p.finance?.refs) p.finance.refs.forEach(r => {
        if (r.type === 'PO')        r.type = 'CAPEX';
        if (r.type === 'Contract')  r.type = 'IO';
        if (r.type === 'Quotation') r.type = 'Cost Center';
      });
      p.tasks.forEach(t => { if (!t.subtasks) t.subtasks = []; });
    });
  }

  // ── Đọc item từ SharePoint List ───────────────────────────────────────────
  async function fetchItem() {
    const url = `${_siteUrl}/_api/web/lists/getbytitle('${LIST_NAME}')/items` +
                `?$filter=Title eq '${DATA_TITLE}'&$select=Id,DataJSON,UpdatedAt&$top=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json;odata=verbose' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error(`SP fetch error ${res.status}`);
    const json = await res.json();
    return json.d.results[0] || null;
  }

  // ── Ghi data lên SharePoint List ──────────────────────────────────────────
  async function writeItem(payload) {
    const digest   = await getDigest();
    const jsonStr  = JSON.stringify(payload);
    const existing = await fetchItem();
    const body     = JSON.stringify({
      __metadata: { type: `SP.Data.${LIST_NAME}ListItem` },
      Title:      DATA_TITLE,
      DataJSON:   jsonStr,
      UpdatedAt:  payload.savedAt
    });

    if (existing) {
      // Update (MERGE)
      await fetch(
        `${_siteUrl}/_api/web/lists/getbytitle('${LIST_NAME}')/items(${existing.Id})`,
        {
          method: 'POST',
          headers: {
            Accept:           'application/json;odata=verbose',
            'Content-Type':   'application/json;odata=verbose',
            'X-RequestDigest': digest,
            'X-HTTP-Method':  'MERGE',
            'IF-MATCH':       '*'
          },
          credentials: 'include',
          body
        }
      );
    } else {
      // Create
      await fetch(
        `${_siteUrl}/_api/web/lists/getbytitle('${LIST_NAME}')/items`,
        {
          method: 'POST',
          headers: {
            Accept:           'application/json;odata=verbose',
            'Content-Type':   'application/json;odata=verbose',
            'X-RequestDigest': digest
          },
          credentials: 'include',
          body
        }
      );
    }
    localStorage.setItem(SYNC_TS_KEY, Date.now().toString());
  }

  // ── PUBLIC: load data từ SP khi mở app ────────────────────────────────────
  async function loadFromSP() {
    if (!_ready) return false;
    try {
      const item = await fetchItem();
      if (!item || !item.DataJSON) return false;

      const cloudData  = JSON.parse(item.DataJSON);
      const cloudTime  = new Date(cloudData.savedAt || 0).getTime();
      const localTime  = parseInt(localStorage.getItem(SYNC_TS_KEY) || '0', 10);

      if (cloudTime > localTime) {
        applyData(cloudData);
        saveLocal();
        localStorage.setItem(SYNC_TS_KEY, cloudTime.toString());
        console.log('[SP] Loaded newer data from SharePoint:', cloudData.savedAt);
        return true;
      }
      console.log('[SP] Local data is up-to-date, skipping SP load.');
      return false;
    } catch (e) {
      console.warn('[SP] loadFromSP error:', e.message);
      return false;
    }
  }

  // ── PUBLIC: push data lên SP ───────────────────────────────────────────────
  async function pushToSP(silent = false) {
    if (!_ready || _syncing) return;
    _syncing = true;
    try {
      await writeItem(buildPayload());
      if (!silent) notif('Synced to SharePoint ✓', 'success');
    } catch (e) {
      console.error('[SP] pushToSP error:', e);
      if (!silent) notif('SharePoint sync failed – data saved locally', 'error');
    } finally {
      _syncing = false;
    }
  }

  // ── PUBLIC: khởi động và setup auto-sync ──────────────────────────────────
  async function init() {
    if (!detectSP()) {
      console.info('[SP] Not running inside SharePoint – SP sync disabled.');
      return;
    }
    console.info('[SP] SharePoint context detected:', _siteUrl);

    // 1. Load data từ SP nếu mới hơn local
    const updated = await loadFromSP();
    if (updated && typeof render === 'function') render();

    // 2. Auto-push mỗi 5 phút
    setInterval(() => pushToSP(true), 5 * 60 * 1000);

    // 3. Push khi đóng tab / reload
    window.addEventListener('beforeunload', () => pushToSP(true));

    // 4. Hiện indicator trên UI
    _showSyncBadge();
  }

  // ── Badge trạng thái sync (nhỏ, không ảnh hưởng UI) ──────────────────────
  function _showSyncBadge() {
    const badge = document.createElement('div');
    badge.id = 'sp-sync-badge';
    badge.title = 'Connected to SharePoint 365';
    badge.innerHTML = '<i class="ti ti-cloud-check"></i> SharePoint';
    badge.style.cssText = [
      'position:fixed', 'bottom:14px', 'right:14px',
      'background:#0f6e56', 'color:#fff',
      'font-size:11px', 'padding:4px 10px', 'border-radius:20px',
      'display:flex', 'align-items:center', 'gap:5px',
      'z-index:9999', 'cursor:pointer', 'opacity:0.85'
    ].join(';');
    badge.addEventListener('click', () => pushToSP(false));
    document.body.appendChild(badge);
  }

  // ── Hook vào saveLocal gốc để auto-push sau mỗi lần lưu ──────────────────
  // Ghi đè saveLocal để sau khi lưu local thì push lên SP (debounced 3s)
  let _debounceTimer = null;
  function hookSaveLocal() {
    const _originalSaveLocal = window.saveLocal;
    window.saveLocal = function () {
      _originalSaveLocal();
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => pushToSP(true), 3000);
    };
  }

  return { init, pushToSP, loadFromSP, hookSaveLocal };
})();

// Khởi động sau khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  // Hook saveLocal trước
  SP.hookSaveLocal();
  // Rồi init (load từ SP nếu cần)
  await SP.init();
});
