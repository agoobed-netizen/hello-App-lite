// app.js - AttendNow attendance MVP
// Complete client-side data logic with localStorage

// ======================== STORAGE KEYS ========================
const STORAGE_KEY = 'attendnow_records_v1';

// ======================== GLOBAL DOM ELEMENTS ========================
let btnPrimary, inputName, inputRole, inputClass, inputDate, listRoot;
let insightRate, insightStreak, insightAbsent, insightBars;
let statTotal, statPresent, statAbsent;
let searchInput, filterStatusSelect;

// ======================== HELPER FUNCTIONS ========================
function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

function saveData(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Get avatar initials from full name
function getInitials(fullName) {
  if (!fullName) return '?';
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

// Format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

// ======================== RENDER FUNCTIONS ========================
function renderList(records) {
  if (!listRoot) return;
  
  // Get filter values
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterStatus = filterStatusSelect ? filterStatusSelect.value : 'all';
  
  // Filter records
  let filteredRecords = [...records];
  
  if (searchTerm) {
    filteredRecords = filteredRecords.filter(record => 
      record.fullName.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filterStatus !== 'all') {
    filteredRecords = filteredRecords.filter(record => record.status === filterStatus);
  }
  
  // Sort by timeMarked descending (newest first)
  filteredRecords.sort((a, b) => b.timeMarked - a.timeMarked);
  
  // Clear list root
  listRoot.innerHTML = '';
  
  // Empty state
  if (filteredRecords.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty-state';
    emptyLi.textContent = searchTerm || filterStatus !== 'all' 
      ? 'No matching records found' 
      : 'No attendance records yet. Click "Mark Attendance" to add your first record!';
    listRoot.appendChild(emptyLi);
    return;
  }
  
  // Render each record
  filteredRecords.forEach(record => {
    const li = document.createElement('li');
    li.className = 'att-item';
    
    const initials = getInitials(record.fullName);
    const statusClass = record.status === 'present' ? 'att-badge--present' : 'att-badge--absent';
    const statusText = record.status === 'present' ? 'Present' : 'Absent';
    const roleIcon = record.role === 'Student' ? '🎓' : '💼';
    const groupText = record.group || 'N/A';
    const dateDisplay = formatDate(record.date);
    const timeDisplay = formatTime(record.timeMarked);
    
    li.innerHTML = `
      <div class="att-avatar">${initials}</div>
      <div class="att-info">
        <div class="att-name">${escapeHtml(record.fullName)}</div>
        <div class="att-meta">
          ${roleIcon} ${escapeHtml(record.role)} • ${escapeHtml(groupText)} • ${dateDisplay} at ${timeDisplay}
        </div>
      </div>
      <div class="${statusClass}">${statusText}</div>
    `;
    
    listRoot.appendChild(li);
  });
}

function renderInsights(records) {
  if (!insightRate || !insightStreak || !insightAbsent || !insightBars) return;
  
  const today = getTodayDate();
  const todayRecords = records.filter(r => r.date === today);
  const totalToday = todayRecords.length;
  const presentToday = todayRecords.filter(r => r.status === 'present').length;
  const absentToday = totalToday - presentToday;
  const attendanceRate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;
  
  // Calculate current streak (consecutive days with at least one present record)
  let streak = 0;
  const datesWithRecords = [...new Set(records.map(r => r.date))].sort().reverse();
  let currentDate = new Date(today);
  
  for (let i = 0; i < datesWithRecords.length; i++) {
    const dateStr = datesWithRecords[i];
    const dateRecords = records.filter(r => r.date === dateStr);
    const hasPresent = dateRecords.some(r => r.status === 'present');
    
    if (hasPresent) {
      const checkDate = new Date(dateStr);
      const diffDays = Math.floor((currentDate - checkDate) / (1000 * 60 * 60 * 24));
      if (diffDays === streak) {
        streak++;
        currentDate = new Date(dateStr);
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  // Get last 5 days attendance data for bars
  const last5Days = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayRecords = records.filter(r => r.date === dateStr);
    const presentCount = dayRecords.filter(r => r.status === 'present').length;
    const totalCount = dayRecords.length;
    const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    last5Days.unshift({ date: dateStr, rate, present: presentCount, total: totalCount });
  }
  
  // Update insight elements
  insightRate.textContent = `${attendanceRate}%`;
  insightStreak.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
  insightAbsent.textContent = `${absentToday}`;
  
  // Render bars (simple text representation)
  const barLabels = last5Days.map(d => {
    const dayName = new Date(d.date).toLocaleDateString('en-NG', { weekday: 'short' });
    return `${dayName}: ${d.rate}%`;
  });
  insightBars.textContent = barLabels.join(' | ');
}

function updateHeroStats(records) {
  if (!statTotal || !statPresent || !statAbsent) return;
  
  const today = getTodayDate();
  const todayRecords = records.filter(r => r.date === today);
  const total = todayRecords.length;
  const present = todayRecords.filter(r => r.status === 'present').length;
  const absent = total - present;
  
  statTotal.textContent = total;
  statPresent.textContent = present;
  statAbsent.textContent = absent;
}

// ======================== ADD RECORD FUNCTION ========================
function addAttendanceRecord(event) {
  if (event) event.preventDefault();
  
  // Get values
  const fullName = inputName ? inputName.value.trim() : '';
  const role = inputRole ? inputRole.value : '';
  const group = inputClass ? inputClass.value.trim() : '';
  const date = inputDate ? inputDate.value : '';
  
  // Validate
  if (!fullName) {
    alert('Please enter full name');
    inputName?.focus();
    return false;
  }
  
  if (!role) {
    alert('Please select a role');
    return false;
  }
  
  if (!group) {
    alert('Please enter class/group/department');
    inputClass?.focus();
    return false;
  }
  
  if (!date) {
    alert('Please select a date');
    return false;
  }
  
  // Create record
  const newRecord = {
    id: generateId(),
    fullName: fullName,
    role: role,
    group: group,
    date: date,
    status: 'present',
    timeMarked: Date.now()
  };
  
  // Load existing, add, save
  const records = loadData();
  records.push(newRecord);
  saveData(records);
  
  // Clear form
  if (inputName) inputName.value = '';
  if (inputClass) inputClass.value = '';
  if (inputDate) inputDate.value = getTodayDate();
  if (inputRole) inputRole.value = 'Student';
  
  // Re-render all UI
  const updatedRecords = loadData();
  renderList(updatedRecords);
  renderInsights(updatedRecords);
  updateHeroStats(updatedRecords);
  
  // Focus back on name input
  inputName?.focus();
  
  return true;
}

// ======================== FILTER EVENT HANDLERS ========================
function onFilterChange() {
  const records = loadData();
  renderList(records);
}

// ======================== INITIALIZATION ========================
function init() {
  // Get all DOM elements by their IDs (as defined in index.html)
  btnPrimary = document.getElementById('btn-primary');
  inputName = document.getElementById('input-name');
  inputRole = document.getElementById('input-role');
  inputClass = document.getElementById('input-class');
  inputDate = document.getElementById('input-date');
  listRoot = document.getElementById('list-root');
  
  // Insights panel elements
  insightRate = document.getElementById('insight-rate');
  insightStreak = document.getElementById('insight-streak');
  insightAbsent = document.getElementById('insight-absent');
  insightBars = document.getElementById('insight-bars');
  
  // Hero stats elements
  statTotal = document.getElementById('stat-total');
  statPresent = document.getElementById('stat-present');
  statAbsent = document.getElementById('stat-absent');
  
  // Filter elements
  searchInput = document.getElementById('input-search');
  filterStatusSelect = document.getElementById('input-filter-status');
  
  // Set footer year
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
  
  // Set default date to today
  if (inputDate) {
    inputDate.value = getTodayDate();
  }
  
  // Set default role if not already set
  if (inputRole && !inputRole.value) {
    inputRole.value = 'Student';
  }
  
  // Load data and render initial UI
  const initialRecords = loadData();
  renderList(initialRecords);
  renderInsights(initialRecords);
  updateHeroStats(initialRecords);
  
  // Attach event listeners
  if (btnPrimary) {
    btnPrimary.addEventListener('click', addAttendanceRecord);
  }
  
  // Handle form submit on hero form if present
  const heroForm = document.querySelector('.hero form');
  if (heroForm) {
    heroForm.addEventListener('submit', addAttendanceRecord);
  }
  
  // Attach filter listeners
  if (searchInput) {
    searchInput.addEventListener('input', onFilterChange);
  }
  
  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', onFilterChange);
  }
  
  // Optional: Enter key on name input triggers add
  if (inputName) {
    inputName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addAttendanceRecord();
      }
    });
  }
  
  console.log('AttendNow app initialized');
}

// Helper function to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
