import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const extract = (a, b) => {
  const start = source.indexOf(a);
  const end = source.indexOf(b, start + a.length);
  assert.ok(start >= 0 && end > start, 'Không tìm thấy khối ' + a);
  return source.slice(start, end);
};
const syncCode = extract("const PENDING_SYNC_PREFIX = 'qldt:pending-cloud:';", '\nfunction getTodayStr()');
function harness(initialCloud = { classes: [], students: [], sessions: [], attendance: [], holidays: [], tuitions: [] }) {
  const store = new Map();
  const localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
    removeItem(key) { store.delete(key); }
  };
  const calls = [];
  const toasts = [];
  const widgets = { activeView: 'view-students', attendanceModalOpen: false };
  const document = {
    querySelector(selector) {
      if (selector === '.view.active') return {
        id: widgets.activeView, contains() { return false; }
      };
      return null;
    },
    getElementById(id) {
      if (id === 'modal-attendance') return {
        style: { display: widgets.attendanceModalOpen ? 'flex' : 'none' }
      };
      return null;
    },
    activeElement: null
  };
  const window = { addEventListener() {} };
  let remote = structuredClone(initialCloud);
  let callback = null;
  const onSnapshot = (_ref, next) => {
    callback = next;
    return () => { callback = null; };
  };
  const runTransaction = async (_db, fn) => {
    const transaction = {
      async get() {
        return { exists: () => remote !== null, data: () => structuredClone(remote) };
      },
      set(_ref, data) { remote = structuredClone(data); }
    };
    await fn(transaction);
    calls.push('cloud_write');
  };
  const noop = () => {};
  const factory = new Function(
    'currentUser', 'firestoreDb', 'billingCloudDataReady', 'billingAccountLocked',
    'localStorage', 'document', 'window', 'doc', 'onSnapshot', 'runTransaction',
    'defaultData', 'db', 'updateDashboard', 'renderClasses', 'renderStudents',
    'renderTuition', 'renderMonthlyTuition', 'renderStatistics', 'renderWeekCalendar',
    'renderHolidays', 'renderMakeups', 'renderMonthClasses', 'renderUpcomingClasses',
    'showToast', 'currentTuitionMethod', 'console',
    syncCode + '\nreturn {' +
      'saveData, startRealtimeCloudSync, canonicalCloudSignature, applyDeferredCloudData, ' +
      'getDb: () => db, setDb: d => { db = d; }, ' +
      'setBaseline: sig => { cloudBaselineSignature = sig; }, ' +
      'getBaseline: () => cloudBaselineSignature, ' +
      'getConflict: () => cloudHasConflict, ' +
      'getDirty: () => hasPendingSync(currentUser.uid)' +
    '};'
  );
  const API = factory(
    { uid: 'owner' }, {}, true, false,
    localStorage, document, window,
    (_db, col, uid) => ({ col, uid }),
    onSnapshot, runTransaction,
    { classes: [], students: [], sessions: [], attendance: [], holidays: [], tuitions: [] },
    structuredClone(initialCloud),
    () => calls.push('dashboard'), () => calls.push('classes'),
    () => calls.push('students'), () => calls.push('tuition'),
    () => calls.push('monthly'), () => calls.push('statistics'),
    () => calls.push('week'), () => calls.push('holidays'),
    () => calls.push('makeups'), () => calls.push('month'),
    () => calls.push('upcoming'),
    (message) => toasts.push(message),
    'sessions', { warn(){} }
  );
  API.setBaseline(API.canonicalCloudSignature(remote));
  return {
    ...API, calls, toasts, widgets, store,
    getRemote: () => structuredClone(remote),
    changeRemote(data) {
      remote = structuredClone(data);
      assert.ok(callback, 'Listener chưa được đăng ký');
      callback({
        exists: () => true,
        data: () => structuredClone(remote),
        metadata: { fromCache: false, hasPendingWrites: false }
      });
    }
  };
}

test('Lưu xong làm mới danh sách học sinh ngay mà không F5', async () => {
  const h = harness();
  const d = h.getDb();
  d.students.push({ id: 101, name: 'Học sinh thử', classId: 1 });
  const saved = await h.saveData();
  assert.equal(saved, true);
  assert.equal(h.getRemote().students.length, 1);
  assert.ok(h.calls.includes('students'));
  assert.ok(h.calls.includes('cloud_write'));
  assert.equal(h.getDirty(), false);
});

test('Tự nhận dữ liệu từ thiết bị thứ hai khi Cloud thay đổi', () => {
  const h = harness();
  h.startRealtimeCloudSync('owner');
  const remote = h.getRemote();
  remote.students.push({ id: 22, name: 'Học sinh thêm từ thiết bị 2' });
  h.changeRemote(remote);
  assert.equal(h.getDb().students[0].id, 22);
  assert.ok(h.calls.includes('students'));
  assert.ok(h.toasts.some(m => m.includes('tự cập nhật')));
});

test('Không ghi đè dữ liệu khi một thiết bị dùng bản Cloud cũ', async () => {
  const h = harness();
  h.startRealtimeCloudSync('owner');
  const remote = h.getRemote();
  remote.students.push({ id: 2, name: 'HS từ thiết bị khác' });
  // Thay đổi trực tiếp trên máy chủ trước khi transaction gửi dữ liệu cũ.
  h.changeRemote = null;
  const old = h.getDb();
  old.students.push({ id: 1, name: 'HS từ máy hiện tại' });
  // Cloud giả lập bị sửa đồng thời nhưng không có snapshot mới.
  // Trong thực tế runTransaction đọc bản Cloud mới nhất.
  const fake = harness();
  fake.setDb({ ...fake.getDb(), students: [{ id: 1, name: 'Sửa cục bộ' }] });
  fake.setBaseline('old-cloud-version');
  const saved = await fake.saveData();
  assert.equal(saved, false);
  assert.equal(fake.getDirty(), true);
  assert.equal(fake.getConflict(), true);
  assert.equal(fake.getDb().students[0].name, 'Sửa cục bộ');
});

test('Dấu phiên bản dữ liệu không phụ thuộc thứ tự khóa', () => {
  const h = harness();
  assert.equal(h.canonicalCloudSignature({ a: 1, z: { b: 2, a: 3 } }),
    h.canonicalCloudSignature({ z: { a: 3, b: 2 }, a: 1 }));
});

test('Không xóa học sinh hoặc giao dịch chỉ vì hiển thị Dashboard', () => {
  const dashboard = extract('function updateDashboard() {', '\nfunction openAttendance(');
  const leading = dashboard.split('\n').slice(0, 20).join('\n');
  assert.doesNotMatch(leading, /db\.(students|tuitions|attendance|sessions)\s*=\s*db\./);
});

test('Khi chỉ tải lại app, không xóa buổi pending đã tạo', () => {
  const schedule = extract('function generateSchedules(rebuildPending = false) {', '// ================= BẢNG ĐIỀU KHIỂN =================');
  assert.match(schedule, /if \(rebuildPending\) db\.sessions = db\.sessions\.filter/);
  assert.match(schedule, /if \(JSON\.stringify\(db\.sessions\) !== before\) saveData\(\)/);
});

test('Phục hồi JSON phải chờ Cloud xác nhận trước khi tải lại trang', () => {
  const restore = extract('function restoreData(event) {', '\nlet parsedData = [];');
  assert.match(restore, /const synced = await saveData\(\)/);
  assert.match(restore, /if \(synced\) \{/);
  assert.match(restore, /Không tự tải lại/);
});

test('Ghi học phí theo tháng chỉ báo Cloud thành công khi đã lưu', () => {
  const code = extract('async function collectMonthlyTuition(', '\nasync function cancelMonthlyTuition(');
  assert.match(code, /if \(synced\) showToast/);
  assert.match(code, /chưa được Cloud xác nhận/);
});

test('Không sửa Rules của app Dạy thêm', () => {
  assert.match(source, /runTransaction/);
  assert.match(source, /onSnapshot/);
  assert.match(source, /hasPendingSync/);
  assert.doesNotMatch(source, /firebase\.rules/);
});


test('Khi đang sửa phiếu điểm danh không ghi đè lựa chọn chưa lưu', () => {
  const h = harness();
  h.startRealtimeCloudSync('owner');
  h.widgets.attendanceModalOpen = true;
  const next = h.getRemote();
  next.students.push({ id: 99, name: 'Dữ liệu Cloud mới' });
  h.changeRemote(next);
  assert.equal(h.getDb().students.length, 0);
  h.widgets.attendanceModalOpen = false;
  h.applyDeferredCloudData();
  assert.equal(h.getDb().students[0].id, 99);
});

test('Hai lượt lưu liên tiếp đều được đồng bộ, không rơi lượt cuối', async () => {
  const h = harness();
  h.getDb().students.push({ id: 1, name: 'A' });
  const a = h.saveData();
  h.getDb().students.push({ id: 2, name: 'B' });
  const b = h.saveData();
  await Promise.all([a, b]);
  assert.equal(h.getRemote().students.length, 2);
  assert.equal(h.getDirty(), false);
});
