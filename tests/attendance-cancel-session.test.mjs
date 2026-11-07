import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const between = (from, to) => {
    const start = source.indexOf(from);
    const end = source.indexOf(to, start + from.length);
    assert.ok(start >= 0 && end > start, `Missing code section: ${from}`);
    return source.slice(start, end);
};

const factory = new Function('db', 'events', 'document',
    between('function isHoliday(', 'function generateSchedules(') +
    between('function generateSchedules(', '// ================= BẢNG ĐIỀU KHIỂN =================') +
    between('function getQuickAttendanceHoliday(', 'let currentAttSessionId = null;') +
    `
    let currentAttSessionId = null;
    const saveData = () => events.push('save');
    const confirm = () => true;
    const showToast = text => events.push(text);
    const closeModal = () => events.push('closed');
    const refreshVisibleDataView = () => events.push('refreshed');
    const parseDateVi = text => text;
    return {
        generateSchedules, isHoliday, getQuickAttendanceHoliday,
        quickCancelAttendanceSession, restoreQuickHolidayById,
        setCurrent: id => { currentAttSessionId = String(id); }
    };
    `
);

function setup() {
    const startDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const db = {
        classes: [{ id: 1, name: 'Test', cycle: 10, startDate,
            tkb: [2, 3, 4, 5, 6, 7, 8].map(dayOfWeek => ({ dayOfWeek, start: '18:00', end: '20:00' })) }],
        students: [], sessions: [], holidays: [], attendance: [], tuitions: []
    };
    const events = [];
    const api = factory(db, events, { getElementById: () => ({ style: { display: 'none' } }) });
    api.generateSchedules();
    const active = () => db.sessions.filter(s => s.classId === 1 && s.status !== 'canceled')
        .sort((a, b) => a.date.localeCompare(b.date));
    return { db, api, events, active };
}

test('Nghỉ từ điểm danh lùi ngày đạt mốc buổi 10 và 20, khôi phục được', () => {
    const { db, api, active } = setup();
    assert.ok(active().length >= 21);
    const original10 = active()[9].date;
    const original20 = active()[19].date;
    const target = active()[1];
    api.setCurrent(target.id);
    api.quickCancelAttendanceSession();

    assert.equal(target.status, 'canceled');
    assert.equal(db.holidays.length, 1);
    assert.equal(db.holidays[0].quickAttendance, true);
    assert.ok(active()[9].date > original10);
    assert.ok(active()[19].date > original20);
    assert.equal(api.isHoliday(target.date, 1, '16:00'), null, 'Không hủy ca khác cùng ngày');

    const cancellationId = db.holidays[0].id;
    api.generateSchedules(true);
    assert.equal(db.sessions.find(s => s.classId === 1 && s.date === target.date &&
        s.start === target.start).status, 'canceled', 'Không mất buổi nghỉ khi tạo lại lịch');

    api.restoreQuickHolidayById(cancellationId);
    assert.equal(db.holidays.length, 0);
    assert.equal(active()[9].date, original10);
    assert.equal(active()[19].date, original20);
});

test('Không hủy buổi đã hoàn thành để bảo vệ dữ liệu học phí', () => {
    const { db, api, active } = setup();
    const session = active()[0];
    session.status = 'completed';
    api.setCurrent(session.id);
    api.quickCancelAttendanceSession();
    assert.equal(session.status, 'completed');
    assert.equal(db.holidays.length, 0);
});

test('Nghỉ riêng ca dạy bù không tự hủy ca trong thời khóa biểu', () => {
    const { db, api, active } = setup();
    const regular = active()[0];
    const makeup = { id: 'makeup-test', classId: 1, date: regular.date,
        start: regular.start, end: '20:00', isMakeup: true, status: 'pending' };
    db.sessions.push(makeup);
    api.setCurrent(makeup.id);
    api.quickCancelAttendanceSession();
    assert.equal(makeup.status, 'canceled');
    assert.equal(api.isHoliday(regular.date, 1, regular.start), null);
    assert.equal(regular.status, 'pending');
});

test('Các nút trong phần điểm danh và hàm xử lý đều được nối', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const id of ['att-cancel-session', 'att-restore-session', 'att-complete-session', 'att-session-alert']) {
        assert.ok(html.includes(`id="${id}"`), `Missing ${id}`);
    }
    assert.ok(html.includes('onclick="quickCancelAttendanceSession()"'));
    assert.ok(html.includes('onclick="restoreQuickCanceledSession()"'));
    assert.ok(source.includes('window.quickCancelAttendanceSession = quickCancelAttendanceSession;'));
});
