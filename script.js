// --- HỆ THỐNG FIREBASE ĐĂNG NHẬP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQz-4TAujSNhDV8wQY82-wnCTGJtdxhsM",
  authDomain: "quan-ly-day-them-f7b1e.firebaseapp.com",
  projectId: "quan-ly-day-them-f7b1e",
  storageBucket: "quan-ly-day-them-f7b1e.firebasestorage.app",
  messagingSenderId: "613673074776",
  appId: "1:613673074776:web:639fe0c51ae83b56a8ca2d"
};

let app = null;
let auth = null;
let firestoreDb = null;
let provider = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestoreDb = getFirestore(app);
    provider = new GoogleAuthProvider();
} catch (err) {
    console.warn("Firebase initialization warning:", err);
}

const loginScreen = document.getElementById('login-screen');
const btnLogin = document.getElementById('btn-login');
const btnGuest = document.getElementById('btn-guest');

if (btnGuest && loginScreen) {
    btnGuest.addEventListener('click', () => {
        loginScreen.style.display = 'none';
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof generateSchedules === 'function') generateSchedules();
        if (typeof renderClasses === 'function') renderClasses();
    });
}

if (btnLogin && auth && provider) {
    btnLogin.addEventListener('click', () => {
        signInWithPopup(auth, provider).then((result) => {
            console.log("Đăng nhập thành công:", result.user.email);
        }).catch((error) => {
            try {
                alert("Lỗi đăng nhập: " + error.message);
            } catch (e) {
                console.error("Lỗi đăng nhập:", error);
            }
        });
    });
}

let currentUser = null; 

if (auth) {
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (loginScreen) loginScreen.style.display = 'none';
        console.log("Đã đăng nhập:", user.email);

        const userRef = doc(firestoreDb, 'nguoi_dung', user.uid);
        let hasAccess = true; 

        try {
            const docUserSnap = await getDoc(userRef);
            const ngayHienTai = new Date();

            if (!docUserSnap.exists()) {
                let ngayHetHan = new Date();
                ngayHetHan.setDate(ngayHienTai.getDate() + 30);
                await setDoc(userRef, { email: user.email, ngay_dang_ky: ngayHienTai.toISOString(), ngay_het_han: ngayHetHan.toISOString() });
            } else {
                const duLieu = docUserSnap.data();
                const ngayHetHan = new Date(duLieu.ngay_het_han);
                const timeDiff = ngayHetHan.getTime() - ngayHienTai.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysLeft <= 0) {
                    hasAccess = false;
                    document.getElementById('man-hinh-thu-phi').style.display = 'block';
                    let emailElements = document.getElementsByClassName('email-user');
                    for (let i = 0; i < emailElements.length; i++) { emailElements[i].innerText = user.email.split('@')[0]; }
                } else {
                    document.getElementById('man-hinh-thu-phi').style.display = 'none';
                    if (daysLeft <= 5) {
                        const banner = document.getElementById('trial-warning-banner');
                        if (banner) {
                            banner.style.display = 'flex';
                            document.getElementById('trial-days-left').innerText = daysLeft;
                            const upgradePrefix = document.getElementById('upgrade-email-prefix');
                            if (upgradePrefix) upgradePrefix.innerText = user.email.split('@')[0];
                        }
                    }
                }
            }
        } catch (error) { console.log("Lỗi kiểm tra bản quyền:", error); }

        if (hasAccess) {
            const docRef = doc(firestoreDb, "DuLieuDayThem", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) { db = docSnap.data(); } 
            else { await setDoc(docRef, db); }
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof generateSchedules === 'function') generateSchedules();
            if (typeof renderClasses === 'function') renderClasses();
        }

    } else {
        currentUser = null;
        if (loginScreen) loginScreen.style.display = 'flex';
    }
});
}

function logoutApp() {
    let ok = false;
    try {
        ok = confirm("Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?");
    } catch (e) {
        ok = true;
    }
    if(ok) {
        if (auth) {
            signOut(auth).then(() => { localStorage.removeItem('tutoringData'); location.reload(); }).catch(() => { location.reload(); });
        } else {
            localStorage.removeItem('tutoringData');
            location.reload();
        }
    }
}

// ================= DỮ LIỆU & TIỆN ÍCH =================
const defaultData = { classes: [], students: [], holidays: [], sessions: [], attendance: [], tuitions: [] };

let stored = JSON.parse(localStorage.getItem('tutoringData'));
let db = stored ? Object.assign({}, defaultData, stored) : defaultData;
db.classes = db.classes || []; db.students = db.students || []; db.holidays = db.holidays || [];
db.sessions = db.sessions || []; db.attendance = db.attendance || []; db.tuitions = db.tuitions || [];

async function saveData() {
    localStorage.setItem('tutoringData', JSON.stringify(db));
    updateDashboard(); 
    if (currentUser) {
        try {
            const docRef = doc(firestoreDb, "DuLieuDayThem", currentUser.uid);
            await setDoc(docRef, db);
        } catch (e) { console.error("Lỗi khi đồng bộ lên mây: ", e); }
    }
}

function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function parseDateVi(dStr) { 
    if(!dStr) return '--/--';
    const d = new Date(dStr); 
    const dd = String(d.getDate()).padStart(2, '0'); 
    const mm = String(d.getMonth() + 1).padStart(2, '0'); 
    return `${dd}/${mm}`; 
}

window.onload = () => { 
    generateSchedules(); updateDashboard(); renderClasses(); populateClassSelects(); 
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err)); }
};

function showToast(msg, type='success') {
    const box = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i> <span>${msg}</span>`; box.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(), 300); }, 2500);
}

function switchView(id, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
    if(id === 'view-home') updateDashboard();
    if(id === 'view-classes') renderClasses();
    if(id === 'view-students') renderStudents();
    if(id === 'view-tuition') renderTuition();
    if(id === 'view-statistics') renderStatistics();
    if(id === 'view-calendar') {
        let activeTabBtn = document.querySelector('#view-calendar .tab-btn.active');
        if(activeTabBtn) activeTabBtn.click(); else switchCalTab('study', document.querySelectorAll('#view-calendar .tab-btn')[0]);
    }
}

function openModal(id) { 
    if (id === 'modal-zalo-settings') {
        let settings = getZaloSettings();
        if (document.getElementById('bank-select')) document.getElementById('bank-select').value = settings.bank;
        if (document.getElementById('bank-account')) document.getElementById('bank-account').value = settings.accountNumber;
        if (document.getElementById('bank-holder')) document.getElementById('bank-holder').value = settings.accountHolder;
        if (document.getElementById('teacher-zalo-phone')) document.getElementById('teacher-zalo-phone').value = settings.teacherZalo;
        if (document.getElementById('zalo-template')) document.getElementById('zalo-template').value = settings.template;
        if (typeof updateTeacherQrPreviews === 'function') updateTeacherQrPreviews();
    }
    document.getElementById(id).style.display = 'flex'; 
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function showLoading(show, text="Đang xử lý...") { document.getElementById('loading-text').innerText = text; document.getElementById('loading-overlay').classList.toggle('hidden', !show); }

// ================= LỊCH HỌC =================
function switchCalTab(tabId, el) {
    document.querySelectorAll('#view-calendar .tab-btn').forEach(btn => btn.classList.remove('active')); el.classList.add('active');
    document.querySelectorAll('.cal-tab').forEach(tab => tab.classList.add('hidden')); document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    if(tabId === 'holiday') renderHolidays();
    if(tabId === 'study') renderUpcomingClasses();
    if(tabId === 'makeup') renderMakeups();
    if(tabId === 'month') renderMonthClasses();
}

function renderUpcomingClasses() {
    const list = document.getElementById('upcoming-list'); list.innerHTML = ''; let todayStr = getTodayStr();
    let upcomings = db.sessions.filter(s => s.date >= todayStr && s.status !== 'canceled').sort((a,b) => { if(a.date !== b.date) return (a.date || "").localeCompare(b.date || ""); return String(a.start || "").localeCompare(String(b.start || "")); }).slice(0, 20); 
    if(upcomings.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Không có lịch học sắp tới.</div>'; return; }
    upcomings.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        let badge = s.isMakeup ? `<span class="date-badge" style="background:var(--warning-bg); color:var(--warning);">Dạy bù</span>` : '';
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong style="color:var(--primary-dark); font-size:1.05rem;">${cls.name}</strong><small style="color:var(--text-main); font-weight:700;">${parseDateVi(s.date)} • Từ ${s.start||'--:--'} đến ${s.end||'--:--'} ${s.note ? `(${s.note})` : ''}</small></div>${badge}</div>`;
    });
}

function renderMakeups() {
    const list = document.getElementById('makeup-list'); list.innerHTML = '';
    let makeups = db.sessions.filter(s => s.isMakeup).sort((a,b) => (b.date||"").localeCompare(a.date||""));
    if(makeups.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Chưa có lịch dạy bù nào được tạo.</div>'; return; }
    makeups.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong style="color:var(--primary-dark); font-size:1.05rem;">${cls.name}</strong><small>${parseDateVi(s.date)} • ${s.start||'--:--'} - ${s.end||'--:--'}</small><small class="text-orange">${s.note||''}</small></div><button class="btn-outline-action text-red" onclick="deleteSession('${s.id}')"><i class="fas fa-trash"></i></button></div>`;
    });
}

function saveMakeup() {
    let classId = document.getElementById('makeup-class').value; let date = document.getElementById('makeup-date').value; let start = document.getElementById('makeup-start').value; let end = document.getElementById('makeup-end').value; let note = document.getElementById('makeup-note').value || 'Dạy bù';
    if(!classId || !date || !start || !end) return showToast("Vui lòng nhập đủ ngày và giờ!", "error");
    db.sessions.push({ id: 'sess_' + Date.now(), classId: parseInt(classId), date: date, start: start, end: end, status: 'pending', isMakeup: true, note: note });
    saveData(); closeModal('modal-add-makeup'); renderMakeups(); showToast("✅ Đã thêm lịch dạy bù vào Hệ thống!");
}

function deleteSession(id) { if(confirm("Xóa lịch dạy bù này?")) { db.sessions = db.sessions.filter(s => String(s.id) !== String(id)); saveData(); renderMakeups(); showToast("Đã xóa lịch bù!"); } }

function renderMonthClasses() {
    const list = document.getElementById('month-list'); list.innerHTML = '';
    let today = new Date(); let y = today.getFullYear(), m = today.getMonth();
    let monthStart = new Date(y, m, 1).toISOString().split('T')[0]; let monthEnd = new Date(y, m + 1, 0).toISOString().split('T')[0];
    let monthSessions = db.sessions.filter(s => s.date >= monthStart && s.date <= monthEnd).sort((a,b) => (a.date||"").localeCompare(b.date||""));
    if(monthSessions.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Tháng này không có lịch học.</div>'; return; }
    let byDate = {}; monthSessions.forEach(s => { if(!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s); });
    Object.keys(byDate).forEach(date => {
        let items = byDate[date].sort((a,b)=>String(a.start||"").localeCompare(String(b.start||""))).map(s => {
            let cls = db.classes.find(c => c.id == s.classId);
            let color = s.status === 'canceled' ? 'color:var(--danger)' : (s.isMakeup ? 'color:var(--warning)' : 'color:var(--primary-dark)');
            let strike = s.status === 'canceled' ? 'text-decoration:line-through; opacity:0.6;' : '';
            let pointer = s.status !== 'canceled' ? 'cursor:pointer;' : '';
            let onClick = s.status !== 'canceled' ? `onclick="openAttendance('${s.id}', '${cls?cls.name:''}')"` : '';
            let checkIcon = s.status === 'completed' ? '<i class="fas fa-check-circle text-green" style="margin-left:5px;"></i>' : '';
            return `<div ${onClick} style="margin-top:6px; font-size:0.85rem; font-weight:700; ${strike} ${color} ${pointer}">• ${s.start||'--:--'}: ${cls?cls.name:'Lớp xóa'} ${s.status === 'canceled' ? '(Nghỉ)' : ''} ${s.isMakeup ? '(Dạy bù)' : ''} ${checkIcon}</div>`;
        }).join('');
        list.innerHTML += `<div class="list-item" style="flex-direction:column; align-items:flex-start;"><strong style="color:var(--text-main); font-size:1.1rem;"><i class="fas fa-calendar-day" style="color:#cbd5e1;"></i> ${parseDateVi(date)}</strong><div style="width:100%; border-top:1px dashed #eee; margin-top:8px; padding-top:4px;">${items}</div></div>`;
    });
}

function isHoliday(dateStr, classId) {
    const d = new Date(dateStr);
    for(let h of db.holidays) {
        if(h.classId === 'ALL' || h.classId == classId) {
            let start = new Date(h.start); start.setHours(0,0,0,0); let end = new Date(h.end); end.setHours(23,59,59,999);
            if(d >= start && d <= end) return h;
        }
    }
    return null;
}

function generateSchedules() {
    const today = new Date(); const maxDate = new Date(); maxDate.setDate(today.getDate() + 90);
    db.classes.forEach(cls => {
        if(!cls.tkb || cls.tkb.length === 0) return; let currDate = new Date(cls.startDate); if(isNaN(currDate)) return;
        db.sessions = db.sessions.filter(s => { if (s.classId != cls.id) return true; if (s.isMakeup) return true; if (s.status === 'completed') return true; return false; });
        while(currDate <= maxDate) {
            let dStr = currDate.toISOString().split('T')[0]; let dow = currDate.getDay() === 0 ? 8 : currDate.getDay() + 1; 
            cls.tkb.forEach(t => {
                if(t.dayOfWeek == dow) {
                    let hol = isHoliday(dStr, cls.id);
                    let exist = db.sessions.find(s => s.classId == cls.id && s.date === dStr && s.start === t.start && !s.isMakeup);
                    if(!exist) { db.sessions.push({ id: 'sess_' + Date.now() + Math.floor(Math.random()*10000), classId: cls.id, date: dStr, start: t.start, end: t.end, status: hol ? 'canceled' : 'pending', isMakeup: false, note: hol ? `Nghỉ: ${hol.name}` : '' }); }
                }
            });
            currDate.setDate(currDate.getDate() + 1);
        }
    });
    saveData(); 
}

// ================= BẢNG ĐIỀU KHIỂN =================
function updateDashboard() {
    db.sessions = db.sessions.filter(s => db.classes.some(c => c.id == s.classId)); 
    db.students = db.students.filter(s => db.classes.some(c => c.id == s.classId)); 
    db.tuitions = db.tuitions.filter(t => db.classes.some(c => c.id == t.classId)); 
    db.attendance = db.attendance.filter(a => db.sessions.some(s => String(s.id) === String(a.sessionId)));
    
    document.getElementById('dash-total-classes').innerText = db.classes.length; 
    
    // Tổng HS đang học (bỏ qua đã nghỉ)
    let activeStudents = db.students.filter(s => s.status !== 'inactive').length;
    document.getElementById('dash-total-students').innerText = activeStudents;
    
    let todayStr = getTodayStr(); document.getElementById('dash-today-date').innerText = parseDateVi(todayStr);
    
    const missedList = document.getElementById('dash-missed-list'); if (missedList) missedList.innerHTML = '';
    let missedSessions = db.sessions.filter(s => s.date < todayStr && s.status === 'pending').sort((a,b) => (a.date||"").localeCompare(b.date||""));
    if(missedSessions.length > 0 && missedList) {
        missedList.innerHTML = `<div class="section-title"><h3 class="text-red">⚠️ QUÊN ĐIỂM DANH (${missedSessions.length})</h3></div>`;
        missedSessions.forEach(s => {
            let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
            let classSessions = db.sessions.filter(x => x.classId == cls.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
            let sessionIndex = classSessions.findIndex(x => String(x.id) === String(s.id)) + 1;
            missedList.innerHTML += `<div class="dash-sched-card" style="border-left-color: var(--danger); background: #fef2f2;"><div class="dsc-time">${parseDateVi(s.date)} • ${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class text-red">🔴 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex}</div><button class="btn-att-now" style="background: var(--danger);" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-exclamation-triangle"></i> ĐIỂM DANH BÙ NGAY</button></div>`;
        });
    }

    let todays = db.sessions.filter(s => s.date === todayStr).sort((a,b) => String(a.start||"").localeCompare(String(b.start||"")));
    let activeTodays = todays.filter(s => s.status !== 'canceled'); document.getElementById('dash-today-sessions').innerText = activeTodays.length;
    let dueCount = calculateTuitionDue().length; document.getElementById('dash-tuition-due').innerText = dueCount;

    let globalHol = db.holidays.find(h => { let sd = new Date(h.start); sd.setHours(0,0,0,0); let ed = new Date(h.end); ed.setHours(23,59,59,999); let td = new Date(todayStr); return h.classId === 'ALL' && td >= sd && td <= ed; });
    const list = document.getElementById('dash-schedule-list'); list.innerHTML = '';
    if(activeTodays.length === 0) { 
        if (globalHol) { list.innerHTML = `<div class="holiday-card-large"><h3>🎉 HÔM NAY NGHỈ</h3><span>${globalHol.name}</span></div>`; } 
        else { list.innerHTML = '<div class="text-center text-muted mt-20" style="font-weight:600;">Hôm nay không có lịch học.</div>'; }
        return; 
    }

    const now = new Date(); const currentMins = now.getHours() * 60 + now.getMinutes();

    activeTodays.forEach(s => {
        let cls = db.classes.find(c => c.id == s.classId); if(!cls) return;
        let stuCount = db.students.filter(st => st.classId == cls.id && st.status !== 'inactive').length;
        let classSessions = db.sessions.filter(x => x.classId == cls.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
        let sessionIndex = classSessions.findIndex(x => String(x.id) === String(s.id)) + 1;
        let isDone = s.status === 'completed'; let startParts = (s.start||"00:00").split(':'); let startMins = parseInt(startParts[0]||0)*60 + parseInt(startParts[1]||0); let isUpcoming = !isDone && (startMins - currentMins <= 60 && startMins - currentMins >= -120);

        if (isUpcoming) { list.innerHTML += `<div class="dash-sched-card highlight"><div class="dsc-badge">🔔 SẮP ĐẾN GIỜ HỌC</div><div class="dsc-time">${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class">🔵 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex} • ${stuCount} học sinh</div><button class="btn-att-now" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-clipboard-check"></i> ĐIỂM DANH NGAY</button></div>`;
        } else { list.innerHTML += `<div class="dash-sched-card ${isDone ? 'done' : ''}"><div class="dsc-time">${s.start||'--:--'} - ${s.end||'--:--'}</div><div class="dsc-class">🔵 ${cls.name}</div><div class="dsc-meta">Buổi ${sessionIndex} • ${stuCount} học sinh</div>${isDone ? `<button class="btn-att done" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-check-double"></i> ĐÃ ĐIỂM DANH (Bấm sửa)</button>` : `<button class="btn-att" onclick="openAttendance('${s.id}', '${cls.name}')"><i class="fas fa-clipboard-check"></i> ĐIỂM DANH</button>`}</div>`; }
    });
}

// ================= ĐIỂM DANH =================
let currentAttSessionId = null;
let currentAbsenceZaloPayload = null;

function openAttendance(sessionId, className) {
    currentAttSessionId = String(sessionId); const session = db.sessions.find(s => String(s.id) === currentAttSessionId);
    if(!session) return showToast("Không tìm thấy dữ liệu buổi học!", "error");
    document.getElementById('att-class-name').innerText = className; document.getElementById('att-date-info').innerText = `${parseDateVi(session.date)} (${session.start||'--:--'} - ${session.end||'--:--'})`;
    
    // Ẩn học sinh nghỉ ngang khỏi màn hình điểm danh
    let stus = db.students.filter(s => s.classId == session.classId && s.status !== 'inactive'); 
    let html = '';
    
    if(stus.length === 0) {
        html = '<div style="text-align:center; padding: 20px; color: #64748b;">Chưa có học sinh nào đang học trong lớp này.</div>';
    }
    
    stus.forEach(stu => {
        let record = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stu.id);
        let status = record ? record.status : 'có mặt'; 
        let cl = status === 'vắng' ? 'vắng' : (status === 'phép' ? 'phép' : '');
        let isAbsent = status === 'vắng' || status === 'phép';
        let btnText = status === 'phép' ? 'Nhắn Zalo (Nghỉ phép)' : 'Báo Zalo phụ huynh';
        let btnColor = status === 'phép' ? '#d97706' : '#ef4444';
        let btnBg = status === 'phép' ? '#fffbeb' : '#fef2f2';
        let btnBorder = status === 'phép' ? '#fde68a' : '#fecaca';

        html += `
        <div class="att-student ${cl}" id="att-row-${stu.id}">
            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 5px; flex: 1; min-width: 0;">
                <div class="att-name" style="padding-left: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${stu.name}</div>
                <div id="att-zalo-wrap-${stu.id}" style="display: ${isAbsent ? 'block' : 'none'};">
                    <button type="button" class="btn-att-zalo-quick" id="att-zalo-btn-${stu.id}" onclick="openAbsenceZaloModal(${stu.id})" style="color: ${btnColor}; background: ${btnBg}; border-color: ${btnBorder};" title="Nhắn Zalo thông báo phụ huynh">
                        <i class="fas fa-comment-dots"></i> <span id="att-zalo-text-${stu.id}">${btnText}</span>
                    </button>
                </div>
            </div>
            <div class="att-actions" style="flex-shrink: 0;">
                <button type="button" class="att-btn ${status==='có mặt'?'active có mặt':''}" onclick="setAtt(${stu.id}, 'có mặt')" title="Có mặt"><i class="fas fa-check"></i></button>
                <button type="button" class="att-btn ${status==='phép'?'active phép':''}" onclick="setAtt(${stu.id}, 'phép')" title="Nghỉ có phép">P</button>
                <button type="button" class="att-btn ${status==='vắng'?'active vắng':''}" onclick="setAtt(${stu.id}, 'vắng')" title="Vắng không phép"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    });
    document.getElementById('att-student-list').innerHTML = html; openModal('modal-attendance');
}

function setAtt(stuId, status) {
    const row = document.getElementById(`att-row-${stuId}`); 
    if (row) row.className = `att-student ${status === 'có mặt' ? '' : status}`;
    const btns = row ? row.querySelectorAll('.att-btn') : []; 
    btns.forEach(b => b.className = 'att-btn');
    if(status==='có mặt' && btns[0]) btns[0].classList.add('active', 'có', 'mặt'); 
    if(status==='phép' && btns[1]) btns[1].classList.add('active', 'phép'); 
    if(status==='vắng' && btns[2]) btns[2].classList.add('active', 'vắng');
    
    // Cập nhật hiển thị nút Zalo báo vắng
    const zaloWrap = document.getElementById(`att-zalo-wrap-${stuId}`);
    const zaloBtn = document.getElementById(`att-zalo-btn-${stuId}`);
    const zaloText = document.getElementById(`att-zalo-text-${stuId}`);
    if (zaloWrap && zaloBtn && zaloText) {
        if (status === 'vắng') {
            zaloWrap.style.display = 'block';
            zaloText.innerText = 'Báo Zalo phụ huynh';
            zaloBtn.style.color = '#ef4444';
            zaloBtn.style.background = '#fef2f2';
            zaloBtn.style.borderColor = '#fecaca';
        } else if (status === 'phép') {
            zaloWrap.style.display = 'block';
            zaloText.innerText = 'Nhắn Zalo (Nghỉ phép)';
            zaloBtn.style.color = '#d97706';
            zaloBtn.style.background = '#fffbeb';
            zaloBtn.style.borderColor = '#fde68a';
        } else {
            zaloWrap.style.display = 'none';
        }
    }

    let exist = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stuId);
    if(exist) exist.status = status; 
    else db.attendance.push({ sessionId: currentAttSessionId, studentId: stuId, status: status });
}

function submitAttendance() {
    try {
        let session = db.sessions.find(s => String(s.id) === currentAttSessionId);
        if(!session) throw new Error("Dữ liệu buổi học bị mất, vui lòng F5 trang!");
        let stus = db.students.filter(s => s.classId == session.classId && s.status !== 'inactive');
        stus.forEach(stu => { let exist = db.attendance.find(a => String(a.sessionId) === currentAttSessionId && a.studentId == stu.id); if(!exist) db.attendance.push({ sessionId: currentAttSessionId, studentId: stu.id, status: 'có mặt' }); });
        
        session.status = 'completed'; saveData(); 
        if(document.getElementById('view-classes').classList.contains('active')) renderClasses();
        closeModal('modal-attendance'); showToast("Đã lưu điểm danh!");
    } catch(err) { showToast("Lỗi: " + err.message, "error"); }
}

function openAbsenceZaloModal(studentId) {
    let stu = db.students.find(s => s.id == studentId);
    if (!stu) return showToast("Không tìm thấy học sinh!", "error");
    
    let session = db.sessions.find(s => String(s.id) === String(currentAttSessionId));
    let cls = session ? db.classes.find(c => c.id == session.classId) : null;
    let className = cls ? cls.name : 'Lớp học';
    
    let record = db.attendance.find(a => String(a.sessionId) === String(currentAttSessionId) && a.studentId == stu.id);
    let status = record ? record.status : 'vắng';

    let cleanPhone = cleanPhoneNumber(stu.phone);
    let targetInfoText = `${stu.name} • ${className} • ${cleanPhone ? `SĐT: ${cleanPhone}` : '⚠️ Chưa có SĐT'}`;
    
    let targetEl = document.getElementById('zalo-absence-target-info');
    if (targetEl) targetEl.innerText = targetInfoText;
    
    let dateStr = session ? parseDateVi(session.date) : 'Hôm nay';
    let timeStr = session && session.start ? `${session.start} - ${session.end || ''}` : '';
    let fullDateTime = timeStr ? `${dateStr} (${timeStr})` : dateStr;

    let msg = "";
    if (status === 'phép') {
        msg = `[THÔNG BÁO NGHỈ HỌC CÓ PHÉP]\nKính gửi Quý Phụ huynh em ${stu.name} (${className}),\n\nThầy/Cô xin xác nhận: Buổi học ${fullDateTime}, em ${stu.name} nghỉ học có phép.\nThầy/Cô nhắn tin để Quý Phụ huynh nắm được thông tin chuyên cần của em. Nếu cần sắp xếp lịch học bù, Quý Phụ huynh vui lòng liên hệ Thầy/Cô nhé.\n\nThầy/Cô xin cảm ơn Quý Phụ huynh!`;
    } else {
        msg = `[THÔNG BÁO HỌC SINH VẮNG HỌC]\nKính gửi Quý Phụ huynh em ${stu.name} (${className}),\n\nThầy/Cô xin thông báo: Buổi học ${fullDateTime}, em ${stu.name} vắng mặt.\nThầy/Cô nhắn tin để Quý Phụ huynh nắm được tình hình học tập của em.\nQuý Phụ huynh vui lòng liên hệ Thầy/Cô nếu cần sắp xếp lịch học bù hoặc trao đổi thêm nhé.\n\nThầy/Cô xin cảm ơn Quý Phụ huynh!`;
    }

    let txtEl = document.getElementById('zalo-absence-text');
    if (txtEl) txtEl.value = msg;

    currentAbsenceZaloPayload = {
        phone: cleanPhone,
        studentName: stu.name
    };

    openModal('modal-zalo-absence');
}

function copyAbsenceZaloText() {
    const txtEl = document.getElementById('zalo-absence-text');
    if (!txtEl) return;
    navigator.clipboard.writeText(txtEl.value).then(() => {
        showToast("📋 Đã sao chép tin nhắn báo vắng!");
    }).catch(err => {
        showToast("Lỗi sao chép!", "error");
    });
}

function executeSendAbsenceZalo() {
    const txtEl = document.getElementById('zalo-absence-text');
    const text = txtEl ? txtEl.value : '';
    let phone = currentAbsenceZaloPayload ? currentAbsenceZaloPayload.phone : '';

    navigator.clipboard.writeText(text).then(() => {
        if (phone && phone !== '') {
            window.open(`https://zalo.me/${phone}`, '_blank');
            showToast(`✅ Đã copy & mở Zalo Phụ huynh em ${currentAbsenceZaloPayload ? currentAbsenceZaloPayload.studentName : ''}! Bạn chỉ cần Dán (Ctrl+V) để gửi.`);
        } else {
            window.open('https://chat.zalo.me', '_blank');
            showToast("✅ Đã copy tin nhắn! (Học sinh chưa có SĐT, đã mở Zalo Web để bạn tìm kiếm)");
        }
    }).catch(err => {
        showToast("Lỗi sao chép! Vui lòng thử lại.", "error");
    });
}

// ================= HỌC PHÍ, ĐA KỲ & KẾT NỐI ZALO (KÈM QR GIÁO VIÊN) =================
const DEFAULT_ZALO_TEMPLATE = `[THÔNG BÁO HỌC PHÍ]
Kính gửi Quý Phụ huynh em {ten_hs} ({ten_lop}),
Thầy/Cô xin gửi thông báo học phí của em:
📌 Chi tiết: {cac_ky_no}
💰 Tổng tiền cần đóng: {tong_tien}đ

🏦 Thông tin chuyển khoản:
- Chủ tài khoản: {chu_tai_khoan}
- Số tài khoản: {so_tai_khoan}
- Ngân hàng: {ngan_hang}
- Nội dung CK: {noi_dung_ck}

Thầy/Cô có đính kèm ảnh mã QR thanh toán của Thầy/Cô để Quý Phụ huynh quét chuyển khoản thuận tiện và chính xác.
Kính mong Quý Phụ huynh sớm hoàn tất học phí cho em. Thầy/Cô xin chân thành cảm ơn Quý Phụ huynh!`;

function getZaloSettings() {
    db.settings = db.settings || {};
    return {
        bank: db.settings.bank || 'Vietcombank',
        accountNumber: db.settings.accountNumber || '',
        accountHolder: db.settings.accountHolder || '',
        teacherZalo: db.settings.teacherZalo || '',
        teacherQrImage: db.settings.teacherQrImage || '',
        template: db.settings.zaloTemplate || DEFAULT_ZALO_TEMPLATE
    };
}

function getTeacherQrSrc() {
    let settings = getZaloSettings();
    return settings.teacherQrImage || '';
}

function updateTeacherQrPreviews() {
    let qrSrc = getTeacherQrSrc();
    let settings = getZaloSettings();

    // Trong modal Cài đặt QR & Ngân hàng
    const uploadBox = document.getElementById('teacher-qr-upload-box');
    const previewBox = document.getElementById('teacher-qr-preview-box');
    const settingsImg = document.getElementById('teacher-qr-settings-img');
    if (uploadBox && previewBox && settingsImg) {
        if (qrSrc) {
            uploadBox.style.display = 'none';
            previewBox.style.display = 'block';
            settingsImg.src = qrSrc;
        } else {
            uploadBox.style.display = 'block';
            previewBox.style.display = 'none';
            settingsImg.src = '';
        }
    }

    // Trong modal gửi Zalo từng học sinh
    const sendQrActive = document.getElementById('zalo-teacher-qr-active');
    const sendQrEmpty = document.getElementById('zalo-teacher-qr-empty');
    const sendQrPreview = document.getElementById('zalo-teacher-qr-preview');
    if (sendQrActive && sendQrEmpty && sendQrPreview) {
        if (qrSrc) {
            sendQrActive.style.display = 'block';
            sendQrEmpty.style.display = 'none';
            sendQrPreview.src = qrSrc;
        } else {
            sendQrActive.style.display = 'none';
            sendQrEmpty.style.display = 'block';
            sendQrPreview.src = '';
        }
    }

    // Trong modal xuất bảng nợ Zalo cả lớp
    const batchQrCont = document.getElementById('zalo-batch-qr-container');
    const batchQrEmpty = document.getElementById('zalo-batch-qr-empty');
    const batchQrPreview = document.getElementById('zalo-batch-qr-preview');
    if (batchQrCont && batchQrEmpty && batchQrPreview) {
        if (qrSrc) {
            batchQrCont.style.display = 'block';
            batchQrEmpty.style.display = 'none';
            batchQrPreview.src = qrSrc;
        } else {
            batchQrCont.style.display = 'none';
            batchQrEmpty.style.display = 'block';
            batchQrPreview.src = '';
        }
    }

    // Cập nhật text STK, tên chủ tài khoản
    let holderEl = document.getElementById('zalo-preview-holder');
    if (holderEl) holderEl.innerText = settings.accountHolder || '(Chưa điền tên Thầy/Cô)';
    let accEl = document.getElementById('zalo-preview-account');
    if (accEl) accEl.innerText = settings.accountNumber || '(Chưa điền STK)';
    let bankEl = document.getElementById('zalo-preview-bank');
    if (bankEl) bankEl.innerText = settings.bank || 'Ngân hàng';

    let bHolder = document.getElementById('zalo-batch-holder');
    if (bHolder) bHolder.innerText = settings.accountHolder || '(Chưa điền tên Thầy/Cô)';
    let bAcc = document.getElementById('zalo-batch-account');
    if (bAcc) bAcc.innerText = settings.accountNumber || '(Chưa điền STK)';
    let bBank = document.getElementById('zalo-batch-bank');
    if (bBank) bBank.innerText = settings.bank || 'Ngân hàng';
}

function handleTeacherQrUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        return showToast("Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)!", "error");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Nén ảnh vừa vặn tối đa 650x650 px để mã QR cực nét mà dung lượng nhẹ (<60KB)
            const canvas = document.createElement('canvas');
            let maxDim = 650;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);

            db.settings = db.settings || {};
            db.settings.teacherQrImage = compressed;
            saveData();
            updateTeacherQrPreviews();
            showToast("✅ Đã lưu ảnh mã QR của Thầy/Cô thành công!");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeTeacherQr() {
    if (confirm("Bạn có chắc chắn muốn xóa ảnh mã QR hiện tại của Giáo viên?")) {
        db.settings = db.settings || {};
        delete db.settings.teacherQrImage;
        saveData();
        updateTeacherQrPreviews();
        showToast("Đã xóa ảnh mã QR!");
    }
}

function downloadTeacherQr() {
    let qrSrc = getTeacherQrSrc();
    if (!qrSrc) {
        return showToast("Thầy/Cô chưa tải ảnh mã QR lên!", "error");
    }
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = 'Ma_QR_Giao_Vien.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Đang tải ảnh mã QR về máy...");
}

async function copyTeacherQrImage() {
    let qrSrc = getTeacherQrSrc();
    if (!qrSrc) return showToast("Thầy/Cô chưa tải ảnh mã QR lên!", "error");

    try {
        const res = await fetch(qrSrc);
        const blob = await res.blob();
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast("📋 Đã copy ảnh mã QR! Bạn có thể Dán (Ctrl+V) vào Zalo.");
        } else {
            downloadTeacherQr();
        }
    } catch(e) {
        downloadTeacherQr();
    }
}

function copyAccountNumber() {
    let settings = getZaloSettings();
    if (!settings.accountNumber) return showToast("Chưa có số tài khoản!", "error");
    navigator.clipboard.writeText(settings.accountNumber).then(() => {
        showToast("📋 Đã copy STK: " + settings.accountNumber);
    });
}

function saveZaloSettings() {
    db.settings = db.settings || {};
    db.settings.bank = document.getElementById('bank-select').value;
    db.settings.accountNumber = document.getElementById('bank-account').value.trim();
    db.settings.accountHolder = document.getElementById('bank-holder').value.trim();
    db.settings.teacherZalo = document.getElementById('teacher-zalo-phone').value.trim();
    db.settings.zaloTemplate = document.getElementById('zalo-template').value.trim() || DEFAULT_ZALO_TEMPLATE;
    
    saveData();
    closeModal('modal-zalo-settings');
    updateTeacherQrPreviews();
    showToast("✅ Đã lưu cấu hình QR & Tài khoản Thầy/Cô thành công!");
    renderTuition();
}

function resetZaloTemplate() {
    document.getElementById('zalo-template').value = DEFAULT_ZALO_TEMPLATE;
    showToast("Đã khôi phục mẫu tin mặc định!");
}

function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('84')) p = '0' + p.slice(2);
    return p;
}

function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.replace(/[^a-zA-Z0-9 ]/g, '').trim();
}

// Tính toán chi tiết tiến độ và tình trạng từng Kỳ của học sinh
function getStudentTuitionInfo(stu) {
    let cls = db.classes.find(c => c.id == stu.classId);
    if (!cls) return null;

    let cycle = parseInt(cls.cycle) || 10;
    let fee = parseInt(stu.customFee) || parseInt(cls.fee) || 0;
    let attended = db.attendance.filter(a => a.studentId == stu.id && a.status === 'có mặt').length;
    
    let paidSessions = 0;
    db.tuitions.filter(t => t.studentId == stu.id).forEach(t => {
        paidSessions += (t.toSession - t.fromSession + 1);
    });

    let unpaid = attended - paidSessions;
    let maxSession = Math.max(attended, paidSessions);
    let totalCycles = Math.max(1, Math.ceil(maxSession / cycle));

    let cycles = [];
    let unpaidCycles = [];

    for (let k = 1; k <= totalCycles; k++) {
        let fromS = (k - 1) * cycle + 1;
        let toS = k * cycle;

        let isPaid = paidSessions >= toS;
        let isCompletedAttended = attended >= toS;
        let attendedInCycle = 0;
        if (attended >= toS) {
            attendedInCycle = cycle;
        } else if (attended >= fromS) {
            attendedInCycle = attended - fromS + 1;
        }

        let isOverdue = !isPaid && (attended > toS || (k < totalCycles && isCompletedAttended));
        let isDue = !isPaid && isCompletedAttended;
        let isCurrent = !isPaid && !isCompletedAttended && attended >= fromS;

        let cycleObj = {
            cycleNumber: k,
            fromSession: fromS,
            toSession: toS,
            cycleSize: cycle,
            attendedInCycle: attendedInCycle,
            isPaid: isPaid,
            isCompletedAttended: isCompletedAttended,
            isOverdue: isOverdue,
            isDue: isDue,
            isCurrent: isCurrent,
            amount: cycle * fee,
            status: isPaid ? 'paid' : (isOverdue ? 'overdue' : (isDue ? 'due' : (isCurrent ? 'in_progress' : 'upcoming')))
        };
        cycles.push(cycleObj);

        if (!isPaid && isCompletedAttended) {
            unpaidCycles.push(cycleObj);
        }
    }

    let isMultiDebt = unpaidCycles.length > 1;
    let hasOverdue = cycles.some(c => c.isOverdue);
    let totalUnpaidAmount = unpaid > 0 ? (unpaid * fee) : 0;
    let dueAmount = unpaidCycles.reduce((sum, c) => sum + c.amount, 0);

    return {
        student: stu,
        cls: cls,
        cycleSize: cycle,
        fee: fee,
        attended: attended,
        paidSessions: paidSessions,
        unpaid: unpaid,
        totalCycles: totalCycles,
        cycles: cycles,
        unpaidCycles: unpaidCycles,
        isMultiDebt: isMultiDebt,
        hasOverdue: hasOverdue,
        totalUnpaidAmount: totalUnpaidAmount,
        dueAmount: dueAmount > 0 ? dueAmount : totalUnpaidAmount,
        isInactive: stu.status === 'inactive'
    };
}

function calculateTuitionDue() {
    let dues = [];
    db.students.forEach(stu => {
        let info = getStudentTuitionInfo(stu);
        if (!info) return;

        // Nếu học sinh đã nghỉ và không còn nợ thì bỏ qua
        if (info.isInactive && info.unpaid <= 0) return;

        // Báo nợ nếu: có kỳ chưa nộp, hoặc số buổi nợ đạt mốc chu kỳ, hoặc có nợ tồn từ kỳ trước
        if (info.unpaidCycles.length > 0 || info.unpaid >= info.cycleSize || (info.unpaid > 0 && info.hasOverdue)) {
            dues.push(info);
        }
    });
    return dues;
}

let currentTuitionTab = 'due';
function setTuitionTab(tab, el) {
    currentTuitionTab = tab;
    document.querySelectorAll('#view-tuition .tab-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderTuition();
}

function renderTuition() {
    let expected = 0, collected = 0; 
    db.tuitions.forEach(t => collected += t.amount);
    
    // Tổng dự thu tính trên toàn bộ buổi học sinh đã có mặt chưa đóng tiền (kể cả hs đã nghỉ nếu còn nợ)
    db.students.forEach(stu => {
        let info = getStudentTuitionInfo(stu);
        if (info && info.totalUnpaidAmount > 0) {
            expected += info.totalUnpaidAmount;
        }
    });

    let filterClassId = document.getElementById('tuition-filter-class') ? document.getElementById('tuition-filter-class').value : 'ALL';
    let filterCycleVal = document.getElementById('tuition-filter-cycle') ? document.getElementById('tuition-filter-cycle').value : 'ALL';

    let allStudentsInfo = [];
    db.students.forEach(stu => {
        let info = getStudentTuitionInfo(stu);
        if (info) allStudentsInfo.push(info);
    });

    // Lọc theo lớp
    if (filterClassId && filterClassId !== 'ALL') {
        allStudentsInfo = allStudentsInfo.filter(item => item.cls.id == filterClassId);
    }

    // Lọc theo tab
    let displayList = [];
    if (currentTuitionTab === 'due') {
        // Tab "Đến hạn / Nợ": Học sinh có kỳ chưa nộp hoặc nợ >= 1 chu kỳ hoặc nợ quá hạn
        displayList = allStudentsInfo.filter(item => {
            if (item.isInactive && item.unpaid <= 0) return false;
            return item.unpaidCycles.length > 0 || item.unpaid >= item.cycleSize || (item.unpaid > 0 && item.hasOverdue);
        });
        document.getElementById('tuition-list-title').innerText = "Danh sách đến hạn / nợ học phí";
    } else if (currentTuitionTab === 'multidue') {
        // Tab "Nợ dồn nhiều kỳ": Nợ từ 2 kỳ trở lên hoặc nợ kỳ 1 mà đã học sang kỳ 2/3
        displayList = allStudentsInfo.filter(item => item.isMultiDebt || (item.hasOverdue && item.unpaid > 0));
        document.getElementById('tuition-list-title').innerText = "🔴 Học sinh nợ dồn nhiều kỳ";
    } else {
        // Tab "Tất cả học sinh": Hiển thị toàn bộ học sinh để theo dõi tiến độ từng kỳ
        displayList = allStudentsInfo.filter(item => !item.isInactive || item.unpaid > 0);
        document.getElementById('tuition-list-title').innerText = "Toàn bộ học sinh & Tiến độ kỳ";
    }

    // Lọc theo kỳ nếu được chọn: không làm mất học sinh còn nợ kỳ trước
    if (filterCycleVal && filterCycleVal !== 'ALL') {
        let cycleNum = parseInt(filterCycleVal);
        displayList = displayList.filter(item => {
            let targetCycle = item.cycles.find(c => c.cycleNumber === cycleNum);
            if (targetCycle) {
                if (currentTuitionTab === 'due') {
                    return !targetCycle.isPaid || item.unpaidCycles.some(c => c.cycleNumber <= cycleNum);
                }
                return true;
            }
            // Nếu học sinh còn nợ kỳ trước đó chưa nộp, vẫn giữ trong danh sách để giáo viên không bị bỏ sót
            return item.unpaidCycles.some(c => c.cycleNumber <= cycleNum);
        });
    }

    const list = document.getElementById('tuition-due-list'); 
    list.innerHTML = '';
    
    let countBadge = document.getElementById('tuition-list-count');
    if (countBadge) {
        countBadge.innerText = `${displayList.length} học sinh`;
        if (currentTuitionTab === 'multidue') {
            countBadge.className = 'badge-multidue';
        } else {
            countBadge.className = displayList.length > 0 ? 'badge-overdue' : 'badge-paid';
        }
    }

    if (displayList.length === 0) {
        list.innerHTML = `
            <div style="background:white; border-radius:14px; padding:35px 20px; text-align:center; border:1px dashed #cbd5e1;">
                <i class="fas fa-check-circle text-green" style="font-size:2.5rem; margin-bottom:10px;"></i>
                <p style="font-weight:700; color:var(--text-main); margin-bottom:4px;">Không có học sinh nào trong danh mục này!</p>
                <small class="text-muted">Mọi học sinh đều đang theo đúng tiến độ thanh toán.</small>
            </div>`;
    }

    displayList.forEach(d => {
        let borderClass = 'info-border';
        let debtBadgeHtml = '';

        if (d.isMultiDebt) {
            borderClass = 'danger-border';
            debtBadgeHtml = `<span class="badge-multidue"><i class="fas fa-exclamation-triangle"></i> Nợ ${d.unpaidCycles.length} kỳ dồn lại</span>`;
        } else if (d.hasOverdue) {
            borderClass = 'danger-border';
            debtBadgeHtml = `<span class="badge-overdue"><i class="fas fa-clock"></i> Nợ quá hạn kỳ trước</span>`;
        } else if (d.unpaid >= d.cycleSize) {
            borderClass = 'warning-border';
            debtBadgeHtml = `<span class="badge-overdue"><i class="fas fa-bell"></i> Đến kỳ thu tiền</span>`;
        } else if (d.unpaid > 0) {
            debtBadgeHtml = `<span class="badge-inprogress">Đang học (${d.unpaid}/${d.cycleSize} buổi)</span>`;
        } else {
            debtBadgeHtml = `<span class="badge-paid"><i class="fas fa-check"></i> Đã đóng đủ</span>`;
        }

        if (d.isInactive) {
            debtBadgeHtml += ` <span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700;">Đã nghỉ</span>`;
        }

        // Tạo danh sách tóm tắt từng Kỳ
        let cyclesSummaryHtml = '';
        d.cycles.forEach(c => {
            let statusText = '';
            let rowClass = '';
            if (c.isPaid) {
                statusText = `<span class="cycle-pill paid"><i class="fas fa-check"></i> Đã nộp</span>`;
            } else if (c.isOverdue) {
                statusText = `<span class="cycle-pill due"><i class="fas fa-exclamation-circle"></i> Nợ kỳ trước (${c.cycleSize}b)</span>`;
                rowClass = 'highlight-danger';
            } else if (c.isDue) {
                statusText = `<span class="cycle-pill due"><i class="fas fa-clock"></i> Đến hạn (${c.cycleSize}b)</span>`;
                rowClass = 'highlight-danger';
            } else if (c.isCurrent) {
                statusText = `<span class="cycle-pill current">Đang học (${c.attendedInCycle || 0}/${c.cycleSize}b)</span>`;
            } else {
                statusText = `<span class="text-muted" style="font-size:0.75rem;">Chưa đến</span>`;
            }

            cyclesSummaryHtml += `
                <div class="cycle-row-item ${rowClass}">
                    <span><b>Kỳ ${c.cycleNumber}</b> (Buổi ${c.fromSession} - ${c.toSession}):</span>
                    <div>${statusText} <span style="font-weight:700; color:var(--text-main); margin-left:4px;">${c.amount.toLocaleString()}đ</span></div>
                </div>`;
        });

        // SĐT & Quick Call
        let phoneDisplay = d.student.phone ? `
            <a href="tel:${d.student.phone}" style="color:#0068ff; text-decoration:none; font-weight:600; font-size:0.8rem;">
                <i class="fas fa-phone-alt"></i> ${d.student.phone}
            </a>` : `<span class="text-muted" style="font-size:0.8rem;">Chưa có SĐT</span>`;

        list.innerHTML += `
            <div class="tuition-card-item ${borderClass}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <div>
                        <h4 style="font-size:1.05rem; margin:0 0 2px 0; color:var(--text-main); font-weight:800;">${d.student.name}</h4>
                        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:4px;">
                            ${d.cls.name} • ${phoneDisplay}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h3 class="text-orange" style="margin:0 0 4px 0; font-size:1.15rem;">
                            ${d.totalUnpaidAmount > 0 ? d.totalUnpaidAmount.toLocaleString() + 'đ' : '0đ'}
                        </h3>
                        <div style="font-size:0.75rem; color:var(--text-muted);">
                            Nợ: <b>${d.unpaid > 0 ? d.unpaid : 0}</b>/${d.cycleSize}b
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:8px;">
                    ${debtBadgeHtml}
                </div>

                <div style="margin-bottom:12px;">
                    ${cyclesSummaryHtml}
                </div>

                <div style="display:flex; gap:8px; justify-content:flex-end; border-top:1px solid #f1f5f9; padding-top:10px;">
                    <button class="btn-sm btn-zalo" onclick="openZaloModal(${d.student.id})" title="Nhắn tin thông báo học phí kèm Mã QR qua Zalo">
                        <i class="fas fa-comment-dots"></i> Gửi Zalo & QR
                    </button>
                    <button class="btn-sm btn-primary" onclick="openPayModal(${d.student.id})" title="Thu tiền học phí">
                        <i class="fas fa-hand-holding-usd"></i> Thu tiền
                    </button>
                </div>
            </div>`;
    });

    document.getElementById('ts-expected').innerText = expected.toLocaleString() + 'đ'; 
    document.getElementById('ts-collected').innerText = collected.toLocaleString() + 'đ';

    // Cập nhật lịch sử 30 giao dịch gần nhất
    const histList = document.getElementById('tuition-history-list');
    if (histList) {
        histList.innerHTML = '';
        let sortedTuitions = [...db.tuitions].sort((a, b) => b.id - a.id).slice(0, 30); 
        if(sortedTuitions.length === 0) {
            histList.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Chưa có lịch sử thu tiền.</div>';
        } else {
            sortedTuitions.forEach(t => {
                let stu = db.students.find(s => s.id == t.studentId);
                let cls = db.classes.find(c => c.id == t.classId);
                histList.innerHTML += `
                    <div class="list-item">
                        <div class="list-item-info">
                            <strong style="color:var(--success); font-size:1.05rem;">+ ${t.amount.toLocaleString()}đ</strong>
                            <small style="color:var(--text-main); font-weight:700;">${stu ? stu.name : 'HS đã xóa'} (${cls ? cls.name : 'Lớp xóa'})</small>
                            <small class="text-muted">${parseDateVi(t.date)} • Đóng cho buổi ${t.fromSession} - ${t.toSession} ${t.note ? `• ${t.note}` : ''}</small>
                        </div>
                        <button class="btn-outline-action text-red" title="Xóa giao dịch này" onclick="deleteTuition(${t.id})"><i class="fas fa-trash"></i></button>
                    </div>`;
            });
        }
    }
}

function deleteTuition(id) {
    if(confirm("Hủy bỏ giao dịch thu tiền này? (Tiền sẽ bị trừ khỏi tổng Đã thu)")) {
        db.tuitions = db.tuitions.filter(t => t.id != id); 
        saveData(); 
        renderTuition(); 
        showToast("Đã hủy giao dịch!");
    }
}

// ================= MODAL THU TIỀN HỌC PHÍ ĐA KỲ =================
let currentPayStudentInfo = null;
let currentSelectedCycles = [];

function openPayModal(stuId, targetCycleNum) {
    let stu = db.students.find(s => s.id == stuId);
    if (!stu) return;
    let info = getStudentTuitionInfo(stu);
    if (!info) return;

    currentPayStudentInfo = info;
    document.getElementById('pay-stu-id').value = stu.id;
    document.getElementById('pay-stu-name').innerText = stu.name;
    document.getElementById('pay-class-info').innerText = `${info.cls.name} (Đã học ${info.attended} buổi • Đã đóng ${info.paidSessions} buổi)`;
    document.getElementById('pay-fee-per').innerText = info.fee.toLocaleString() + 'đ';
    document.getElementById('pay-note').value = '';

    const container = document.getElementById('pay-cycles-list');
    container.innerHTML = '';

    // Tìm các kỳ chưa thanh toán
    let unpaidList = info.cycles.filter(c => !c.isPaid);
    if (unpaidList.length === 0) {
        // Nếu đã thanh toán hết, tạo kỳ tiếp theo để thu trước
        let nextCycleNum = info.totalCycles + 1;
        let fromS = (nextCycleNum - 1) * info.cycleSize + 1;
        let toS = nextCycleNum * info.cycleSize;
        unpaidList.push({
            cycleNumber: nextCycleNum,
            fromSession: fromS,
            toSession: toS,
            cycleSize: info.cycleSize,
            attendedSessions: 0,
            amount: info.cycleSize * info.fee,
            isAdvance: true
        });
    }

    currentSelectedCycles = [];

    unpaidList.forEach((c, idx) => {
        // Mặc định chọn kỳ được chỉ định, hoặc chọn các kỳ đến hạn / kỳ đầu tiên chưa nộp
        let shouldCheck = false;
        if (targetCycleNum) {
            shouldCheck = (c.cycleNumber === targetCycleNum);
        } else {
            // Chọn kỳ chưa nộp đầu tiên, hoặc tất cả các kỳ quá hạn/đến hạn
            shouldCheck = (idx === 0) || c.isOverdue || c.isDue;
        }

        if (shouldCheck) currentSelectedCycles.push(c.cycleNumber);

        let labelTag = c.isOverdue ? `<span class="badge-overdue">Nợ quá hạn</span>` : (c.isDue ? `<span class="badge-overdue">Đến hạn</span>` : (c.isAdvance ? `<span class="badge-inprogress">Thu trước</span>` : `<span class="badge-inprogress">Kỳ hiện tại</span>`));

        container.innerHTML += `
            <label style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0; cursor:pointer;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" class="pay-cycle-checkbox" value="${c.cycleNumber}" ${shouldCheck ? 'checked' : ''} onchange="onPayCycleSelectionChange()" style="width:18px; height:18px; accent-color:var(--primary);">
                    <span style="font-weight:700; font-size:0.88rem;">Kỳ ${c.cycleNumber} (Buổi ${c.fromSession} - ${c.toSession})</span>
                    ${labelTag}
                </div>
                <strong style="color:var(--text-main); font-size:0.9rem;">${c.amount.toLocaleString()}đ</strong>
            </label>`;
    });

    onPayCycleSelectionChange();
    openModal('modal-pay-tuition');
}

function onPayCycleSelectionChange() {
    if (!currentPayStudentInfo) return;
    const checkboxes = document.querySelectorAll('.pay-cycle-checkbox:checked');
    let totalSessions = 0;
    let totalAmount = 0;
    currentSelectedCycles = [];

    checkboxes.forEach(cb => {
        let cycleNum = parseInt(cb.value);
        currentSelectedCycles.push(cycleNum);
        let c = currentPayStudentInfo.cycles.find(item => item.cycleNumber === cycleNum);
        if (c) {
            totalSessions += c.cycleSize;
            totalAmount += c.amount;
        } else {
            totalSessions += currentPayStudentInfo.cycleSize;
            totalAmount += (currentPayStudentInfo.cycleSize * currentPayStudentInfo.fee);
        }
    });

    document.getElementById('pay-sessions').innerText = `${totalSessions} buổi (${currentSelectedCycles.length} kỳ)`;
    document.getElementById('pay-total-amount').innerText = totalAmount.toLocaleString() + 'đ';
}

function confirmPayment() {
    if (!currentPayStudentInfo || currentSelectedCycles.length === 0) {
        return showToast("Vui lòng chọn ít nhất một kỳ để thu tiền!", "error");
    }

    let note = document.getElementById('pay-note').value.trim();
    let stu = currentPayStudentInfo.student;
    let cls = currentPayStudentInfo.cls;
    let fee = currentPayStudentInfo.fee;
    let cycleSize = currentPayStudentInfo.cycleSize;

    // Ghi nhận thanh toán cho từng kỳ đã chọn theo thứ tự
    currentSelectedCycles.sort((a,b) => a - b).forEach((cycleNum, i) => {
        let fromS = (cycleNum - 1) * cycleSize + 1;
        let toS = cycleNum * cycleSize;
        let amount = cycleSize * fee;

        db.tuitions.push({
            id: Date.now() + i,
            studentId: stu.id,
            classId: cls.id,
            date: getTodayStr(),
            amount: amount,
            fromSession: fromS,
            toSession: toS,
            note: note ? `${note} (Kỳ ${cycleNum})` : `Kỳ ${cycleNum}`
        });
    });

    saveData();
    closeModal('modal-pay-tuition');
    renderTuition();
    showToast(`✅ Đã ghi nhận thu học phí ${currentSelectedCycles.length} kỳ thành công!`);
}

// ================= ZALO & THÔNG BÁO HỌC PHÍ KÈM QR GIÁO VIÊN =================
let currentZaloPayload = null;

function openZaloModal(studentId, cycleNum) {
    let stu = db.students.find(s => s.id == studentId);
    if (!stu) return;
    let info = getStudentTuitionInfo(stu);
    if (!info) return;

    let settings = getZaloSettings();
    let cleanPhone = cleanPhoneNumber(stu.phone);
    let targetInfoText = `${stu.name} • ${info.cls.name} • ${cleanPhone ? `SĐT: ${cleanPhone}` : '⚠️ Chưa có SĐT'}`;
    document.getElementById('zalo-target-info').innerText = targetInfoText;

    // Chuẩn bị chi tiết kỳ nợ
    let cacKyNoText = "";
    let totalSessionsDue = 0;
    let totalAmountDue = 0;

    if (cycleNum) {
        let c = info.cycles.find(item => item.cycleNumber === cycleNum);
        if (c) {
            cacKyNoText = `Kỳ ${c.cycleNumber} (Buổi ${c.fromSession} - ${c.toSession}: ${c.cycleSize} buổi)`;
            totalSessionsDue = c.cycleSize;
            totalAmountDue = c.amount;
        }
    } else if (info.unpaidCycles.length > 0) {
        let cycleDescriptions = info.unpaidCycles.map(c => `Kỳ ${c.cycleNumber} (Buổi ${c.fromSession}-${c.toSession})`);
        cacKyNoText = `${cycleDescriptions.join(' + ')} (Tổng ${info.unpaidCycles.length * info.cycleSize} buổi)`;
        totalSessionsDue = info.unpaidCycles.length * info.cycleSize;
        totalAmountDue = info.unpaidCycles.reduce((sum, c) => sum + c.amount, 0);
    } else {
        cacKyNoText = `Kỳ hiện tại (${info.unpaid}/${info.cycleSize} buổi)`;
        totalSessionsDue = info.unpaid > 0 ? info.unpaid : info.cycleSize;
        totalAmountDue = totalSessionsDue * info.fee;
    }

    let noiDungCk = `HP ${removeVietnameseTones(stu.name)} ${removeVietnameseTones(info.cls.name)}`.trim();

    // Thay thế biến trong mẫu tin nhắn (không dùng VietQR tự động mà dùng QR giáo viên đã tải lên)
    let msg = settings.template;
    msg = msg.replace(/\{ten_hs\}/g, stu.name);
    msg = msg.replace(/\{ten_lop\}/g, info.cls.name);
    msg = msg.replace(/\{cac_ky_no\}/g, cacKyNoText);
    msg = msg.replace(/\{so_buoi_no\}/g, totalSessionsDue);
    msg = msg.replace(/\{tong_tien\}/g, totalAmountDue.toLocaleString());
    msg = msg.replace(/\{ngan_hang\}/g, settings.bank);
    msg = msg.replace(/\{so_tai_khoan\}/g, settings.accountNumber || '(Chưa điền STK)');
    msg = msg.replace(/\{chu_tai_khoan\}/g, settings.accountHolder || '(Chưa điền tên Thầy/Cô)');
    msg = msg.replace(/\{noi_dung_ck\}/g, noiDungCk);

    document.getElementById('zalo-send-text').value = msg;

    updateTeacherQrPreviews();

    currentZaloPayload = {
        phone: cleanPhone,
        studentName: stu.name
    };

    openModal('modal-zalo-send');
}

function copyZaloTextOnly() {
    const text = document.getElementById('zalo-send-text').value;
    navigator.clipboard.writeText(text).then(() => {
        showToast("📋 Đã sao chép tin nhắn vào bộ nhớ tạm!");
    }).catch(err => {
        showToast("Lỗi sao chép!", "error");
    });
}

function executeSendZalo() {
    const text = document.getElementById('zalo-send-text').value;
    let phone = currentZaloPayload ? currentZaloPayload.phone : '';

    navigator.clipboard.writeText(text).then(() => {
        if (phone && phone !== '') {
            window.open(`https://zalo.me/${phone}`, '_blank');
            showToast("✅ Đã copy và mở Zalo! Bạn chỉ cần Dán (Paste) để gửi.");
        } else {
            window.open(`https://chat.zalo.me`, '_blank');
            showToast("✅ Đã copy tin nhắn! (Học sinh chưa có SĐT, đã mở Zalo Web để bạn tìm kiếm)");
        }
    }).catch(err => {
        showToast("Lỗi sao chép! Vui lòng thử lại.", "error");
    });
}

function openZaloWeb() {
    window.open('https://chat.zalo.me', '_blank');
}

function openStudentZaloChat(studentId) {
    let stu = db.students.find(s => s.id == studentId);
    if (!stu) return;
    let phone = cleanPhoneNumber(stu.phone);
    if (!phone) {
        if (confirm(`Học sinh ${stu.name} chưa có số điện thoại. Bạn có muốn cập nhật số điện thoại ngay không?`)) {
            editStudent(stu.id);
        }
        return;
    }
    window.open(`https://zalo.me/${phone}`, '_blank');
}

// ================= XUẤT BẢNG NỢ HỌC PHÍ GỬI ZALO (KÈM QR GIÁO VIÊN) =================
function openZaloBatchExportModal() {
    let select = document.getElementById('zalo-batch-class-select');
    if (select) {
        let currentFilter = document.getElementById('tuition-filter-class') ? document.getElementById('tuition-filter-class').value : 'ALL';
        let html = '<option value="ALL">-- Tất cả các nhóm lớp --</option>';
        db.classes.forEach(c => {
            html += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML = html;
        select.value = currentFilter || 'ALL';
    }
    generateZaloBatchText();
    updateTeacherQrPreviews();
    openModal('modal-zalo-batch-export');
}

function generateZaloBatchText() {
    let select = document.getElementById('zalo-batch-class-select');
    let classId = select ? select.value : 'ALL';
    let settings = getZaloSettings();

    let targetStudents = [];
    db.students.forEach(stu => {
        if (classId !== 'ALL' && stu.classId != classId) return;
        let info = getStudentTuitionInfo(stu);
        if (info && (info.unpaidCycles.length > 0 || info.unpaid >= info.cycleSize || (info.hasOverdue && info.unpaid > 0))) {
            targetStudents.push(info);
        }
    });

    let className = "CÁC LỚP";
    if (classId !== 'ALL') {
        let c = db.classes.find(x => x.id == classId);
        if (c) className = c.name;
    }

    let lines = [];
    lines.push(`[THÔNG BÁO HỌC PHÍ - ${className.toUpperCase()}]`);
    lines.push(`Kính gửi Quý Phụ huynh, Thầy/Cô xin gửi thông báo danh sách học phí đến hạn:\n`);

    let grandTotal = 0;
    if (targetStudents.length === 0) {
        lines.push(`(Hiện tại không có học sinh nào đến hạn hoặc nợ học phí trong danh mục này)`);
    } else {
        targetStudents.forEach((d, idx) => {
            let amount = 0;
            let detail = "";
            if (d.unpaidCycles.length > 0) {
                amount = d.unpaidCycles.reduce((sum, c) => sum + c.amount, 0);
                detail = d.unpaidCycles.map(c => `Kỳ ${c.cycleNumber}`).join(' + ');
            } else {
                amount = d.unpaid * d.fee;
                detail = `${d.unpaid} buổi`;
            }
            grandTotal += amount;
            lines.push(`${idx + 1}. ${d.student.name} (${d.cls.name}): ${detail} - ${amount.toLocaleString()}đ`);
        });

        lines.push(`\n💰 Tổng số tiền: ${grandTotal.toLocaleString()}đ (${targetStudents.length} học sinh)`);
    }

    lines.push(`\n🏦 Thông tin tài khoản nhận học phí của Thầy/Cô:`);
    lines.push(`- Tên chủ tài khoản: ${settings.accountHolder || '(Chưa điền tên Thầy/Cô)'}`);
    lines.push(`- Số tài khoản: ${settings.accountNumber || '(Chưa điền STK)'} (${settings.bank || 'Ngân hàng'})`);
    lines.push(`- Cú pháp chuyển khoản: HP [Tên học sinh] [Tên lớp]`);
    lines.push(`\nThầy/Cô có gửi kèm ảnh mã QR chuyển khoản của Thầy/Cô bên dưới để Quý Phụ huynh quét thuận tiện.`);
    lines.push(`Kính mong Quý Phụ huynh kiểm tra và hoàn tất học phí cho các em. Xin cảm ơn Quý Phụ huynh!`);

    const txtArea = document.getElementById('zalo-batch-text');
    if (txtArea) txtArea.value = lines.join('\n');
}

function copyZaloBatchText() {
    const txtArea = document.getElementById('zalo-batch-text');
    if (!txtArea) return;
    navigator.clipboard.writeText(txtArea.value).then(() => {
        showToast("📋 Đã sao chép danh sách học phí vào bộ nhớ tạm!");
    }).catch(() => {
        showToast("Lỗi sao chép!", "error");
    });
}

function copyAndOpenZaloWeb() {
    copyZaloBatchText();
    window.open('https://chat.zalo.me', '_blank');
    showToast("✅ Đã copy danh sách & mở Zalo Web! Bạn chỉ cần Dán (Ctrl+V) vào nhóm.");
}

// ================= XUẤT BÁO CÁO EXCEL CHUẨN XÁC ĐA KỲ =================
function exportTuitionExcel() {
    let excelData = [];
    excelData.push([
        "STT", 
        "Họ và tên", 
        "Số điện thoại", 
        "Lớp", 
        "Trạng thái", 
        "Ngày vào học", 
        "Chi tiết các kỳ nợ", 
        "Số buổi nợ", 
        "Đơn giá/buổi (VNĐ)", 
        "Tổng tiền cần nộp (VNĐ)"
    ]);

    let index = 1;
    db.students.forEach(stu => {
        let info = getStudentTuitionInfo(stu);
        if (!info) return;

        let statusText = (stu.status === 'inactive') ? "Đã nghỉ ngang" : "Đang học";
        let startDateStr = stu.startDate ? parseDateVi(stu.startDate) : "--/--";

        // Tóm tắt các kỳ nợ
        let debtDetails = "";
        if (info.unpaidCycles.length > 0) {
            debtDetails = info.unpaidCycles.map(c => `Kỳ ${c.cycleNumber} (${c.cycleSize}b)`).join(', ');
        } else if (info.unpaid > 0) {
            debtDetails = `Kỳ hiện tại (${info.unpaid}/${info.cycleSize}b)`;
        } else {
            debtDetails = "Đã đóng đủ";
        }

        excelData.push([
            index++, 
            stu.name, 
            stu.phone || "", 
            info.cls.name, 
            statusText,
            startDateStr,
            debtDetails,
            info.unpaid > 0 ? info.unpaid : 0, 
            info.fee,
            info.totalUnpaidAmount > 0 ? info.totalUnpaidAmount : 0
        ]);
    });

    // Thêm thông tin tài khoản giáo viên vào cuối bảng Excel
    let settings = getZaloSettings();
    if (settings.accountNumber || settings.accountHolder) {
        excelData.push([]);
        excelData.push(["THÔNG TIN TÀI KHOẢN NHẬN HỌC PHÍ CỦA THẦY/CÔ:"]);
        excelData.push(["Chủ tài khoản:", settings.accountHolder || ""]);
        excelData.push(["Số tài khoản (STK):", settings.accountNumber || ""]);
        excelData.push(["Ngân hàng:", settings.bank || ""]);
        excelData.push(["Cú pháp chuyển khoản:", "HP [Tên học sinh] [Tên lớp]"]);
    }

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!cols'] = [
        {wch: 5}, 
        {wch: 24}, 
        {wch: 15}, 
        {wch: 15}, 
        {wch: 16}, 
        {wch: 14}, 
        {wch: 28}, 
        {wch: 12}, 
        {wch: 18}, 
        {wch: 22}
    ];
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoHocPhi");
    
    let thangHienTai = new Date().getMonth() + 1;
    XLSX.writeFile(wb, `DanhSachThuTien_Thang${thangHienTai}.xlsx`);
    showToast("✅ Đã xuất báo cáo Excel thành công!");
}

// ================= LỚP HỌC =================
function renderClasses() {
    const list = document.getElementById('class-list'); list.innerHTML = '';
    const searchInput = document.getElementById('search-class');
    const filterText = searchInput ? searchInput.value.toLowerCase() : "";
    
    let filteredClasses = db.classes.filter(c => c.name.toLowerCase().includes(filterText));
    if(filteredClasses.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Không tìm thấy nhóm lớp nào!</div>'; }
    
    filteredClasses.forEach(c => {
        let stuCount = db.students.filter(s => s.classId == c.id && s.status !== 'inactive').length; 
        let tkbText = c.tkb.map(t => `T${t.dayOfWeek}(${t.start})`).join(', ');
        let classSessions = db.sessions.filter(x => x.classId == c.id && x.status !== 'canceled').sort((a,b) => { let d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime(); if(d1 !== d2) return d1 - d2; return String(a.start||"").localeCompare(String(b.start||"")); });
        let completedCount = classSessions.filter(s => s.status === 'completed').length; let cycle = parseInt(c.cycle) || 10; let nextTargetIndex = Math.floor(completedCount / cycle) * cycle + cycle; 
        
        let nextDateText = "Chưa xác định";
        if(classSessions.length >= nextTargetIndex) { let nextSess = classSessions[nextTargetIndex - 1]; if(nextSess) nextDateText = parseDateVi(nextSess.date); } else if (classSessions.length > 0) { nextDateText = "Đang lên lịch..."; }

        list.innerHTML += `<div class="sched-card" style="border-left-color: var(--primary);"><div class="sched-info"><h4 style="margin-bottom:6px;">${c.name}</h4><p class="text-sm">Học phí: ${parseInt(c.fee).toLocaleString()}đ/b • Lịch: ${tkbText || 'Chưa xếp'}</p><div style="margin-top:12px; padding:10px 12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;"><div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.85rem; font-weight:700;"><span style="color:var(--text-main);">Đã dạy: <b class="text-blue">${completedCount}</b> buổi</span><span class="text-muted">Mốc thu: ${cycle}b</span></div><div style="font-size:0.8rem; color:#b45309; font-weight:600; display:flex; align-items:center; gap:6px;"><i class="fas fa-bolt"></i> Dự kiến thu (Buổi ${nextTargetIndex}): ${nextDateText}</div></div></div><div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:12px; margin-top:12px;"><span class="text-sm" style="font-weight:700;"><i class="fas fa-users text-blue"></i> ${stuCount} học sinh</span><div style="display:flex; gap:8px;"><button class="btn-outline-action text-green" onclick="openAddStudentForClass(${c.id})" title="Thêm học sinh"><i class="fas fa-user-plus"></i></button><button class="btn-outline-action text-orange" onclick="editClass(${c.id})" title="Sửa nhóm"><i class="fas fa-pen"></i></button><button class="btn-outline-action text-red" onclick="deleteClass(${c.id})" title="Xóa nhóm"><i class="fas fa-trash"></i></button></div></div></div>`;
    });
    populateClassSelects();
}

function deleteClass(id) { if(confirm("CẢNH BÁO ĐỎ: Xóa nhóm lớp sẽ XÓA VĨNH VIỄN toàn bộ dữ liệu của lớp này. Bạn chắc chắn chứ?")) { db.classes = db.classes.filter(c => c.id != id); saveData(); renderClasses(); showToast("Đã xóa nhóm lớp!"); } }
function addTkbRow(day=2, start='18:00', end='20:00') { const div = document.createElement('div'); div.className = 'form-row tkb-row mb-15'; div.style.alignItems = 'center'; div.innerHTML = `<select class="tkb-day" style="flex: 1; padding: 12px 5px; text-align: center; min-width: 60px;"><option value="2">T2</option><option value="3">T3</option><option value="4">T4</option><option value="5">T5</option><option value="6">T6</option><option value="7">T7</option><option value="8">CN</option></select><input type="time" class="tkb-start" value="${start}" style="flex: 1.2; padding: 12px 5px; text-align: center;"><input type="time" class="tkb-end" value="${end}" style="flex: 1.2; padding: 12px 5px; text-align: center;"><button class="btn-outline-action text-red" style="flex-shrink: 0; width: 44px; height: 44px; padding: 0;" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`; div.querySelector('.tkb-day').value = day; document.getElementById('tkb-container').appendChild(div); }
function saveClass() { let id = document.getElementById('class-id').value; let name = document.getElementById('cl-name').value; let fee = document.getElementById('cl-fee').value; let cycle = document.getElementById('cl-cycle').value; let start = document.getElementById('cl-start').value; if(!name || !start) return showToast("Nhập đủ thông tin!", "error"); let tkb = []; document.querySelectorAll('.tkb-row').forEach(row => { tkb.push({ dayOfWeek: parseInt(row.querySelector('.tkb-day').value), start: row.querySelector('.tkb-start').value, end: row.querySelector('.tkb-end').value }); }); let obj = { id: id ? parseInt(id) : Date.now(), name, fee, cycle, startDate: start, tkb }; if(id) db.classes[db.classes.findIndex(c => c.id == id)] = obj; else db.classes.push(obj); saveData(); closeModal('modal-add-class'); renderClasses(); generateSchedules(); showToast("Đã lưu Nhóm!"); }
function editClass(id) { let c = db.classes.find(x => x.id == id); if(!c) return; document.getElementById('class-id').value = c.id; document.getElementById('cl-name').value = c.name; document.getElementById('cl-fee').value = c.fee; document.getElementById('cl-cycle').value = c.cycle; document.getElementById('cl-start').value = c.startDate; document.getElementById('tkb-container').innerHTML = ''; c.tkb.forEach(t => addTkbRow(t.dayOfWeek, t.start, t.end)); openModal('modal-add-class'); }

function populateClassSelects() {
    let html = '<option value="">-- Tất cả nhóm --</option>'; 
    let htmlForm = ''; 
    let htmlHol = '<option value="ALL">Tất cả nhóm lớp</option>';
    let htmlTuition = '<option value="ALL">-- Tất cả các nhóm --</option>';
    db.classes.forEach(c => { 
        html += `<option value="${c.id}">${c.name}</option>`; 
        htmlForm += `<option value="${c.id}">${c.name}</option>`; 
        htmlHol += `<option value="${c.id}">${c.name}</option>`;
        htmlTuition += `<option value="${c.id}">${c.name}</option>`;
    });
    const filters = document.getElementById('filter-class-stu'); if(filters) filters.innerHTML = html;
    const formClass = document.getElementById('stu-class'); if(formClass) formClass.innerHTML = htmlForm;
    const formImp = document.getElementById('import-class-select'); if(formImp) formImp.innerHTML = htmlForm;
    const formHol = document.getElementById('hol-class'); if(formHol) formHol.innerHTML = htmlHol;
    const formMakeup = document.getElementById('makeup-class'); if(formMakeup) formMakeup.innerHTML = htmlForm;
    const formTuition = document.getElementById('tuition-filter-class'); 
    if(formTuition) {
        let currVal = formTuition.value || 'ALL';
        formTuition.innerHTML = htmlTuition;
        formTuition.value = currVal;
    }
}

function openAddStudentForClass(cid) { 
    let cls = db.classes.find(c => c.id == cid);
    document.getElementById('stu-id').value = ''; document.getElementById('stu-name').value = ''; document.getElementById('stu-phone').value = ''; document.getElementById('stu-custom-fee').value = ''; document.getElementById('stu-start').value = cls ? cls.startDate : getTodayStr(); document.getElementById('stu-class').value = cid; 
    openModal('modal-add-student'); 
}

// ================= HỌC SINH & NGHỈ NGANG =================
function renderStudents() { 
    const list = document.getElementById('student-list'); list.innerHTML = ''; 
    let txt = document.getElementById('search-student') ? document.getElementById('search-student').value.toLowerCase() : ''; 
    let cid = document.getElementById('filter-class-stu') ? document.getElementById('filter-class-stu').value : ''; 
    let filtered = db.students.filter(s => s.name.toLowerCase().includes(txt) && (cid === '' || s.classId == cid)); 
    
    filtered.forEach(s => { 
        let cls = db.classes.find(c => c.id == s.classId); 
        let isInactive = s.status === 'inactive';
        
        let statusBadge = isInactive ? `<span style="background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:8px;">Đã nghỉ</span>` : `<span style="background:#d1fae5; color:#10b981; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:8px;">Đang học</span>`;
        let toggleBtn = isInactive ? `<button class="btn-outline-action text-green" onclick="toggleStudentStatus(${s.id})" title="Đi học lại"><i class="fas fa-undo"></i></button>` : `<button class="btn-outline-action text-slate" onclick="toggleStudentStatus(${s.id})" title="Báo nghỉ ngang"><i class="fas fa-user-slash"></i></button>`;
        let nameStyle = isInactive ? "text-decoration: line-through; opacity: 0.6;" : "";

        let zaloQuickBtn = `<button class="btn-outline-action" style="color:#0068ff;" onclick="openStudentZaloChat(${s.id})" title="Nhắn tin Zalo với Phụ huynh"><i class="fas fa-comment-dots"></i></button>`;

        list.innerHTML += `<div class="list-item">
            <div class="list-item-info">
                <strong style="${nameStyle}">${s.name} ${statusBadge}</strong>
                <small>${cls ? cls.name : 'Lớp đã xóa'} • ${s.phone ? `<span style="color:#0068ff; font-weight:600;"><i class="fas fa-phone-alt"></i> ${s.phone}</span>` : 'Không có SĐT'}</small>
            </div>
            <div style="display:flex; gap:8px;">
                ${zaloQuickBtn}
                ${toggleBtn}
                <button class="btn-outline-action text-orange" onclick="editStudent(${s.id})" title="Sửa học sinh"><i class="fas fa-pen"></i></button>
                <button class="btn-outline-action text-red" onclick="deleteStudent(${s.id})" title="Xóa học sinh"><i class="fas fa-trash"></i></button>
            </div>
        </div>`; 
    }); 
}

function toggleStudentStatus(id) {
    let s = db.students.find(x => x.id == id);
    if(s) {
        if(s.status === 'inactive') {
            if(confirm(`Xác nhận cho học sinh ${s.name} ĐI HỌC LẠI?`)) s.status = 'active';
        } else {
            if(confirm(`Xác nhận học sinh ${s.name} ĐÃ NGHỈ NGANG?\nHọc sinh sẽ tự động bị ẩn khỏi danh sách Điểm danh và Thu phí.`)) s.status = 'inactive';
        }
        saveData(); renderStudents();
    }
}

function saveStudent() { 
    let id = document.getElementById('stu-id').value; let cid = document.getElementById('stu-class').value; let name = document.getElementById('stu-name').value; 
    if(!cid || !name) return showToast("Nhập đủ tên và chọn lớp!", "error"); 
    
    let obj = { 
        id: id ? parseInt(id) : Date.now(), classId: parseInt(cid), name: name, phone: document.getElementById('stu-phone').value, 
        customFee: document.getElementById('stu-custom-fee').value, startDate: document.getElementById('stu-start').value || getTodayStr(), status: 'active'
    };

    if(id) { let idx = db.students.findIndex(s => s.id == id); if(idx > -1) { obj.status = db.students[idx].status || 'active'; db.students[idx] = obj; } } 
    else { db.students.push(obj); }
    saveData(); closeModal('modal-add-student'); renderStudents(); showToast(id ? "Đã cập nhật học sinh!" : "Đã thêm học sinh!"); 
}

function editStudent(id) {
    let s = db.students.find(x => x.id == id); if(!s) return;
    document.getElementById('stu-id').value = s.id; document.getElementById('stu-class').value = s.classId; document.getElementById('stu-name').value = s.name; document.getElementById('stu-phone').value = s.phone || ''; document.getElementById('stu-custom-fee').value = s.customFee || ''; document.getElementById('stu-start').value = s.startDate || getTodayStr(); openModal('modal-add-student');
}

function deleteStudent(id) { if(confirm("Xóa học sinh này? Sẽ bị xóa mọi lịch sử giao dịch.")) { db.students = db.students.filter(s => s.id != id); saveData(); renderStudents(); } }

// ================= LỊCH NGHỈ & BÙ =================
function renderHolidays() {
    const list = document.getElementById('holiday-list'); list.innerHTML = '';
    db.holidays.forEach(h => {
        let target = h.classId === 'ALL' ? 'Tất cả nhóm' : (db.classes.find(c=>c.id==h.classId)?.name || 'Lớp');
        list.innerHTML += `<div class="list-item"><div class="list-item-info"><strong>🎉 ${h.name}</strong><small>${parseDateVi(h.start)} - ${parseDateVi(h.end)} • Áp dụng: ${target}</small></div><div style="display:flex; gap:8px;"><button class="btn-outline-action text-orange" onclick="editHoliday(${h.id})"><i class="fas fa-pen"></i></button><button class="btn-outline-action text-red" onclick="deleteHoliday(${h.id})"><i class="fas fa-trash"></i></button></div></div>`;
    });
}
function openAddHoliday() { document.getElementById('hol-id').value = ''; document.getElementById('hol-name').value = ''; document.getElementById('hol-start').value = ''; document.getElementById('hol-end').value = ''; document.getElementById('hol-class').value = 'ALL'; openModal('modal-add-holiday'); }
function editHoliday(id) { let h = db.holidays.find(x => x.id == id); if(!h) return; document.getElementById('hol-id').value = h.id; document.getElementById('hol-name').value = h.name; document.getElementById('hol-start').value = h.start; document.getElementById('hol-end').value = h.end; document.getElementById('hol-class').value = h.classId; openModal('modal-add-holiday'); }
function saveHoliday() {
    let id = document.getElementById('hol-id').value; let name = document.getElementById('hol-name').value, start = document.getElementById('hol-start').value, end = document.getElementById('hol-end').value; let cid = document.getElementById('hol-class').value; if(!name || !start || !end) return showToast("Nhập đủ thông tin!", "error");
    if(id) { let index = db.holidays.findIndex(h => h.id == id); if(index > -1) db.holidays[index] = { id: parseInt(id), name, start, end, classId: cid }; } else { db.holidays.push({ id: Date.now(), name, start, end, classId: cid }); }
    saveData(); generateSchedules(); closeModal('modal-add-holiday'); if(document.getElementById('view-calendar').classList.contains('active')) renderHolidays(); showToast("Đã lưu lịch nghỉ & Cập nhật Lịch học!");
}
function deleteHoliday(id) { if(confirm("Xóa lịch nghỉ?")) { db.holidays = db.holidays.filter(h => h.id != id); saveData(); generateSchedules(); renderHolidays(); } }

// ================= SAO LƯU & IMPORT =================
function backupData() {
    let dataStr = JSON.stringify(db); let blob = new Blob([dataStr], {type: "application/json"}); let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; let date = new Date().toISOString().split('T')[0]; a.download = `DuLieuDayThem_${date}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast("Đã tải bản sao lưu (File .json) xuống máy!");
}

function restoreData(event) {
    let file = event.target.files[0]; if(!file) return; let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            if(parsed.classes && parsed.students) { 
                if(confirm("CẢNH BÁO: Dữ liệu hiện tại trên trình duyệt sẽ bị GHI ĐÈ hoàn toàn bởi dữ liệu từ file này. Bạn có chắc chắn muốn khôi phục?")) { db = parsed; saveData(); closeModal('modal-settings'); alert("Khôi phục thành công! Nhấn OK để tải lại ứng dụng."); location.reload(); }
            } else { showToast("File khôi phục không hợp lệ!", "error"); }
        } catch(err) { showToast("Lỗi đọc file!", "error"); }
    };
    reader.readAsText(file); event.target.value = ''; 
}

let parsedData = [];
function openImportModal() { if(db.classes.length === 0) { showToast("Bạn cần TẠO NHÓM LỚP trước khi Import!", "error"); switchView('view-classes', document.querySelectorAll('.nav-item')[1]); return; } document.getElementById('import-step-1').classList.remove('hidden'); document.getElementById('import-step-2').classList.add('hidden'); document.getElementById('import-footer').classList.add('hidden'); openModal('modal-import'); }
async function handleImportFile(event) { const file = event.target.files[0]; if(!file) return; const ext = file.name.split('.').pop().toLowerCase(); showLoading(true, "Đang trích xuất dữ liệu..."); parsedData = []; try { if(ext === 'xlsx' || ext === 'xls' || ext === 'csv') { await extractExcel(file); } else if (ext === 'docx') { await extractWord(file); } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') { await extractImageOCR(file); } else { throw new Error("Định dạng không hỗ trợ!"); } } catch (e) { showToast(e.message || "Lỗi xử lý file!", "error"); } showLoading(false); event.target.value = ''; }
async function extractExcel(file) { const data = await file.arrayBuffer(); const workbook = XLSX.read(data); parseTableToStudents(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1})); }
async function extractWord(file) { const data = await file.arrayBuffer(); const result = await mammoth.extractRawText({arrayBuffer: data}); parseTableToStudents(result.value.split('\n').filter(l => l.trim().length > 0).map(l => l.split(/\t| {2,}/))); }
async function extractImageOCR(file) { if(typeof Tesseract === 'undefined') throw new Error("Thư viện OCR chưa tải xong!"); showLoading(true, "AI đang quét ảnh. Vui lòng đợi 5-15s..."); const result = await Tesseract.recognize(file, 'vie'); parseTableToStudents(result.data.text.split('\n').filter(l => l.trim().length > 0).map(l => l.split(/ {2,}|\t/))); }

function parseTableToStudents(rows) {
    if(rows.length < 1) throw new Error("File trống hoặc không dạng bảng!"); let headerIdx = -1; for(let i=0; i<Math.min(15, rows.length); i++) { let text = rows[i].join(' ').toLowerCase(); if(text.includes('họ') || text.includes('tên') || text.includes('stt')) { headerIdx = i; break; } } if(headerIdx === -1) headerIdx = 0; let headers = rows[headerIdx].map(h => String(h).toLowerCase().trim()); let nameCol = headers.findIndex(h => h.includes('tên') || h.includes('name')); let phoneCol = headers.findIndex(h => h.includes('sđt') || h.includes('thoại') || h.includes('phone') || h.includes('đt')); let feeCol = headers.findIndex(h => h.includes('phí') || h.includes('tiền')); if(nameCol === -1) nameCol = 1; parsedData = [];
    for(let i = headerIdx + 1; i < rows.length; i++) { let r = rows[i]; if(!r || r.length < nameCol+1) continue; let name = String(r[nameCol] || '').trim(); if(name.length < 2 || !isNaN(name) || name.toLowerCase().includes('tổng')) continue; parsedData.push({ name: name, phone: phoneCol !== -1 ? String(r[phoneCol] || '').replace(/[^0-9]/g,'') : '', customFee: feeCol !== -1 ? String(r[feeCol] || '').replace(/[^0-9]/g,'') : '' }); }
    if(parsedData.length === 0) throw new Error("Không tìm thấy dữ liệu học sinh!"); document.getElementById('import-step-1').classList.add('hidden'); document.getElementById('import-step-2').classList.remove('hidden'); document.getElementById('import-footer').classList.remove('hidden'); let tb = document.getElementById('import-preview-body'); tb.innerHTML = ''; parsedData.forEach((s, i) => { tb.innerHTML += `<tr><td><input type="text" id="imp-name-${i}" value="${s.name}" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td><td><input type="text" id="imp-phone-${i}" value="${s.phone}" placeholder="Trống" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td><td><input type="number" id="imp-fee-${i}" value="${s.customFee}" placeholder="Mặc định" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px; font-family: inherit;"></td></tr>`; });
}

function confirmImport() { 
    let cid = document.getElementById('import-class-select').value; let count = 0; let cls = db.classes.find(c => c.id == cid); let defaultStart = cls ? cls.startDate : getTodayStr();
    parsedData.forEach((s, i) => { let finalName = document.getElementById(`imp-name-${i}`).value.trim(); if(finalName) { db.students.push({ id: Date.now() + i, classId: parseInt(cid), name: finalName, phone: document.getElementById(`imp-phone-${i}`).value, customFee: document.getElementById(`imp-fee-${i}`).value, startDate: defaultStart, status: 'active' }); count++; } }); 
    saveData(); closeModal('modal-import'); renderStudents(); showToast(`🎉 Đã nhập ${count} học sinh!`); 
}

// ================= THỐNG KÊ DOANH THU =================
function renderStatistics() {
    let totalExpected = 0; let totalCollected = 0; db.tuitions.forEach(t => totalCollected += t.amount);
    let classStats = {};
    db.classes.forEach(c => {
        classStats[c.id] = { name: c.name, expected: 0, collected: 0, stuCount: 0 };
        let stus = db.students.filter(s => s.classId == c.id); classStats[c.id].stuCount = stus.length;
        stus.forEach(stu => { let fee = parseInt(stu.customFee) || parseInt(c.fee) || 0; let attended = db.attendance.filter(a => a.studentId == stu.id && a.status === 'có mặt').length; classStats[c.id].expected += (attended * fee); });
    });
    
    db.tuitions.forEach(t => { if(classStats[t.classId]) { classStats[t.classId].collected += t.amount; } });
    totalExpected = Object.values(classStats).reduce((sum, cls) => sum + cls.expected, 0);

    document.getElementById('stat-expected').innerText = totalExpected.toLocaleString() + 'đ'; document.getElementById('stat-collected').innerText = totalCollected.toLocaleString() + 'đ';
    const list = document.getElementById('stat-class-list'); if(!list) return; list.innerHTML = '';
    
    let sortedClasses = Object.values(classStats).sort((a,b) => b.expected - a.expected);
    if(sortedClasses.length === 0) { list.innerHTML = '<div class="text-center text-muted" style="padding:20px;">Chưa có dữ liệu lớp học.</div>'; } 
    else {
        sortedClasses.forEach(cls => {
            let percent = cls.expected > 0 ? Math.round((cls.collected / cls.expected) * 100) : 0; if(percent > 100) percent = 100; 
            list.innerHTML += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 10px;"><div style="display: flex; justify-content: space-between; align-items: center;"><strong style="font-size: 1.05rem; color: var(--text-main);">${cls.name} <span class="text-sm text-muted" style="font-weight:600;">(Tổng ${cls.stuCount} HS)</span></strong><strong class="text-green">+${cls.collected.toLocaleString()}đ</strong></div><div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); font-weight:700;"><span>Kỳ vọng: ${cls.expected.toLocaleString()}đ</span><span>Đạt: ${percent}%</span></div><div style="width: 100%; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;"><div style="height: 100%; width: ${percent}%; background: var(--success); transition: 0.5s;"></div></div></div>`;
        });
    }
}

// ================= GẮN HÀM VÀO WINDOW ĐỂ BỌT LỖI REFERENCE =================
window.switchView = switchView;
window.switchCalTab = switchCalTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveData = saveData;
window.updateDashboard = updateDashboard;
window.renderClasses = renderClasses;
window.renderStudents = renderStudents;
window.deleteStudent = deleteStudent;
window.saveStudent = saveStudent;
window.editStudent = editStudent;
window.toggleStudentStatus = toggleStudentStatus;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.saveClass = saveClass;
window.generateSchedules = generateSchedules;
window.addTkbRow = addTkbRow;
window.backupData = backupData;
window.restoreData = restoreData;
window.openAddHoliday = openAddHoliday;
window.openImportModal = openImportModal;
window.handleImportFile = handleImportFile;
window.confirmImport = confirmImport;
window.editHoliday = editHoliday;
window.deleteHoliday = deleteHoliday;
window.saveHoliday = saveHoliday;
window.deleteSession = deleteSession;
window.saveMakeup = saveMakeup;
window.deleteTuition = deleteTuition;
window.confirmPayment = confirmPayment;
window.openAttendance = openAttendance;
window.setAtt = setAtt;
window.submitAttendance = submitAttendance;
window.openAbsenceZaloModal = openAbsenceZaloModal;
window.copyAbsenceZaloText = copyAbsenceZaloText;
window.executeSendAbsenceZalo = executeSendAbsenceZalo;
window.calculateTuitionDue = calculateTuitionDue;
window.renderTuition = renderTuition;
window.setTuitionTab = setTuitionTab;
window.openPayModal = openPayModal;
window.onPayCycleSelectionChange = onPayCycleSelectionChange;
window.confirmPayment = confirmPayment;
window.deleteTuition = deleteTuition;
window.openZaloModal = openZaloModal;
window.executeSendZalo = executeSendZalo;
window.openZaloWeb = openZaloWeb;
window.saveZaloSettings = saveZaloSettings;
window.resetZaloTemplate = resetZaloTemplate;
window.copyZaloTextOnly = copyZaloTextOnly;
window.openStudentZaloChat = openStudentZaloChat;
window.getZaloSettings = getZaloSettings;
window.handleTeacherQrUpload = handleTeacherQrUpload;
window.removeTeacherQr = removeTeacherQr;
window.downloadTeacherQr = downloadTeacherQr;
window.copyTeacherQrImage = copyTeacherQrImage;
window.copyAccountNumber = copyAccountNumber;
window.openZaloBatchExportModal = openZaloBatchExportModal;
window.generateZaloBatchText = generateZaloBatchText;
window.copyZaloBatchText = copyZaloBatchText;
window.copyAndOpenZaloWeb = copyAndOpenZaloWeb;
window.updateTeacherQrPreviews = updateTeacherQrPreviews;
window.openAddStudentForClass = openAddStudentForClass;
window.renderStatistics = renderStatistics;
window.exportTuitionExcel = exportTuitionExcel;
window.logoutApp = logoutApp;
// ================= HỆ THỐNG THÔNG BÁO CẬP NHẬT TỰ ĐỘNG =================
setTimeout(() => {
    // 🔴 MỖI LẦN CẬP NHẬT APP, BẠN CHỈ CẦN SỬA SỐ NÀY (VD: "1.0.4", "1.0.5")
    const APP_VERSION = "1.0.3"; 
    
    // 🔴 SỬA NỘI DUNG THÔNG BÁO Ở ĐÂY
    const THONG_BAO = "📢 THÔNG BÁO TỪ ADMIN:\n\nPhần mềm vừa được cập nhật tính năng mới (Xuất báo cáo Excel và Tối ưu tốc độ).\n\n⚠️ ĐỂ ĐẢM BẢO AN TOÀN DỮ LIỆU: Thầy cô vui lòng vào mục 'Thêm' -> 'Cài đặt dữ liệu' -> bấm 'TẢI XUỐNG BẢN SAO LƯU' ngay nhé!";

    // Logic kiểm tra và hiển thị
    let savedVersion = localStorage.getItem('current_app_version');
    if (savedVersion !== APP_VERSION) {
        try {
            alert(THONG_BAO);
        } catch (e) {
            console.log(THONG_BAO);
        }
        localStorage.setItem('current_app_version', APP_VERSION); // Lưu lại mốc để lần sau mở app không bị hiện lại
    }
}, 2000); // Chờ 2 giây sau khi app load xong trang chủ mới bật thông báo
