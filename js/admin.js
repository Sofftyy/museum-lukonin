// ========== АДМИН-ПАНЕЛЬ - УНИВЕРСАЛЬНЫЙ СКРИПТ ==========
let supabaseAdmin = null;
let allBookings = [];

// ========== ОБЩИЕ ФУНКЦИИ ==========
function formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function logout() {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_email');
    window.location.href = 'admin-login.html';
}

// Проверка авторизации
if (!window.location.pathname.includes('admin-login.html')) {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
        window.location.href = 'admin-login.html';
    }
    const adminNameSpan = document.getElementById('adminName');
    if (adminNameSpan) {
        adminNameSpan.textContent = localStorage.getItem('admin_username') || 'Администратор';
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ SUPABASE ==========
async function initSupabase() {
    console.log('🔧 initSupabase вызвана');
    
    if (typeof supabase === 'undefined') {
        console.log('⏳ Ожидание загрузки Supabase...');
        setTimeout(initSupabase, 500);
        return;
    }
    
    if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.url) {
        console.error('❌ SUPABASE_CONFIG не найден');
        const errorContainer = document.getElementById('recentBookingsTable') || document.getElementById('bookingsTable');
        if (errorContainer) {
            errorContainer.innerHTML = '<p style="padding:20px;">Ошибка подключения к базе данных</p>';
        }
        return;
    }
    
    const { createClient } = supabase;
    supabaseAdmin = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Supabase админ подключен');
    
    const currentPage = window.location.pathname;
    console.log('📄 Текущая страница:', currentPage);
    
    // Загружаем данные в зависимости от страницы
    if (currentPage.includes('admin-panel.html')) {
        console.log('➡️ Загружаем admin-panel');
        await loadAdminPanelData();
    } else if (currentPage.includes('admin-bookings.html')) {
        console.log('➡️ Загружаем admin-bookings');
        await loadAllBookings();
    }
}

// ========== ДЛЯ СТРАНИЦЫ admin-panel.html ==========
async function loadAdminPanelData() {
    console.log('🔍 loadAdminPanelData запущена');
    
    if (!supabaseAdmin) {
        console.log('❌ supabaseAdmin не инициализирован, повторяем попытку через 500ms');
        setTimeout(loadAdminPanelData, 500);
        return;
    }
    
    try {
        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                users (full_name, phone, email),
                excursion_schedules (
                    excursion_date,
                    start_time,
                    excursions (name)
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('📊 Данные загружены, количество:', bookings ? bookings.length : 0);
        
        if (!bookings || bookings.length === 0) {
            console.log('⚠️ Нет данных в таблице bookings');
            const container = document.getElementById('recentBookingsTable');
            if (container) container.innerHTML = '<p style="padding:20px;">Нет заявок в базе данных</p>';
            return;
        }
        
        // Сохраняем в глобальную переменную
        allBookings = bookings;
        
        const totalBookings = bookings.length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        
        console.log('📈 Статистика:', { totalBookings, pendingBookings, confirmedBookings });
        
        const totalEl = document.getElementById('totalBookings');
        const pendingEl = document.getElementById('pendingBookings');
        const confirmedEl = document.getElementById('confirmedBookings');
        
        if (totalEl) totalEl.textContent = totalBookings;
        if (pendingEl) pendingEl.textContent = pendingBookings;
        if (confirmedEl) confirmedEl.textContent = confirmedBookings;
        
        renderRecentBookings(bookings.slice(0, 10));
        
    } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        const tableContainer = document.getElementById('recentBookingsTable');
        if (tableContainer) {
            tableContainer.innerHTML = '<p style="padding:20px;">Ошибка загрузки данных: ' + err.message + '</p>';
        }
    }
}

function renderRecentBookings(bookings) {
    const container = document.getElementById('recentBookingsTable');
    console.log('🎨 renderRecentBookings, контейнер найден:', !!container);
    
    if (!container) {
        console.error('❌ Контейнер recentBookingsTable не найден!');
        return;
    }
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="padding:20px;">Нет заявок</p>';
        return;
    }
    
    console.log('📝 Рендерим', bookings.length, 'заявок');
    
    let html = `<table>
        <thead>
            <tr>
                <th>Дата</th>
                <th>Экскурсия</th>
                <th>Посетитель</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>`;
    
    bookings.forEach(booking => {
        const schedule = booking.excursion_schedules;
        const excursion = schedule?.excursions;
        const user = booking.users;
        const dateStr = schedule?.excursion_date ? formatDateDisplay(schedule.excursion_date) : '-';
        const timeStr = schedule?.start_time || '';
        const statusClass = booking.status === 'pending' ? 'status-pending' : (booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled');
        const statusText = booking.status === 'pending' ? '⏳ Новая' : (booking.status === 'confirmed' ? '✅ Подтверждена' : '❌ Отменена');
        
        html += `<tr>
            <td>${dateStr} ${timeStr}</td>
            <td>${excursion?.name || '-'}</td>
            <td><strong>${user?.full_name || '-'}</strong><br><small>${user?.phone || ''}</small></td>
            <td style="text-align: center;">${booking.persons_count}</td>
            <td style="text-align: center;">${booking.total_price} ₽</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                ${booking.status === 'pending' ? `<button class="btn-small btn-confirm" onclick="updateBookingStatus(${booking.id}, 'confirmed')">✅ Подтвердить</button>` : ''}
                ${booking.status !== 'cancelled' ? `<button class="btn-small btn-cancel" onclick="updateBookingStatus(${booking.id}, 'cancelled')">❌ Отменить</button>` : ''}
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
    console.log('✅ Таблица отрендерена');
}

// ========== ДЛЯ СТРАНИЦЫ admin-bookings.html ==========
async function loadAllBookings() {
    if (!supabaseAdmin) return;
    
    try {
        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                users (full_name, phone, email),
                excursion_schedules (
                    excursion_date,
                    start_time,
                    excursions (name)
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allBookings = bookings;
        renderAllBookingsTable(bookings);
        
    } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        const tableContainer = document.getElementById('bookingsTable');
        if (tableContainer) {
            tableContainer.innerHTML = '<p style="padding:20px;">Ошибка загрузки数据</p>';
        }
    }
}

function renderAllBookingsTable(bookings) {
    const container = document.getElementById('bookingsTable');
    if (!container) return;
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="padding:20px; text-align:center;">📭 Нет заявок</p>';
        return;
    }
    
    let html = `<table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Дата и время</th>
                <th>Экскурсия</th>
                <th>Посетитель</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>`;
    
    bookings.forEach(booking => {
        const schedule = booking.excursion_schedules;
        const excursion = schedule?.excursions;
        const user = booking.users;
        const dateStr = schedule?.excursion_date ? formatDateDisplay(schedule.excursion_date) : '-';
        const timeStr = schedule?.start_time || '';
        const statusClass = booking.status === 'pending' ? 'status-pending' : (booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled');
        const statusText = booking.status === 'pending' ? '⏳ Новая' : (booking.status === 'confirmed' ? '✅ Подтверждена' : '❌ Отменена');
        
        html += `<tr>
            <td>${booking.id}</td>
            <td>${dateStr}<br><small>${timeStr}</small></td>
            <td>${excursion?.name || '-'}</td>
            <td><strong>${user?.full_name || '-'}</strong></td>
            <td>${user?.phone || '-'}</td>
            <td>${user?.email || '-'}</td>
            <td style="text-align: center;">${booking.persons_count}</td>
            <td style="text-align: center;">${booking.total_price} ₽</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                ${booking.status === 'pending' ? `<button class="btn-small btn-confirm" onclick="updateBookingStatus(${booking.id}, 'confirmed')">✅ Подтвердить</button>` : ''}
                ${booking.status !== 'cancelled' ? `<button class="btn-small btn-cancel" onclick="updateBookingStatus(${booking.id}, 'cancelled')">❌ Отменить</button>` : ''}
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ========== ОБНОВЛЕНИЕ СТАТУСА ==========
async function updateBookingStatus(bookingId, newStatus) {
    if (!supabaseAdmin) return;
    
    try {
        const { error } = await supabaseAdmin
            .from('bookings')
            .update({ status: newStatus, updated_at: new Date() })
            .eq('id', bookingId);
        
        if (error) throw error;
        
        alert(`Статус заявки изменён на "${newStatus === 'confirmed' ? 'Подтверждена' : 'Отменена'}"`);
        
        const currentPage = window.location.pathname;
        if (currentPage.includes('admin-panel.html')) {
            loadAdminPanelData();
        } else if (currentPage.includes('admin-bookings.html')) {
            loadAllBookings();
        }
        
    } catch (err) {
        console.error('❌ Ошибка обновления:', err);
        alert('Ошибка при обновлении статуса');
    }
}

// ========== ФУНКЦИИ ДЛЯ СТРАНИЦЫ admin-bookings.html ==========
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let filtered = [...allBookings];
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === statusFilter);
    }
    
    if (searchText) {
        filtered = filtered.filter(b => {
            const userName = b.users?.full_name?.toLowerCase() || '';
            const userPhone = b.users?.phone || '';
            return userName.includes(searchText) || userPhone.includes(searchText);
        });
    }
    
    renderAllBookingsTable(filtered);
}

function resetFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    if (statusFilter) statusFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    renderAllBookingsTable(allBookings);
}

function exportToExcel() {
    if (!allBookings || allBookings.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    let csvContent = "ID,Дата,Время,Экскурсия,Посетитель,Телефон,Email,Количество,Сумма,Статус\n";
    
    allBookings.forEach(booking => {
        const schedule = booking.excursion_schedules;
        const excursion = schedule?.excursions;
        const user = booking.users;
        
        const row = [
            booking.id,
            schedule?.excursion_date || '-',
            schedule?.start_time || '-',
            `"${(excursion?.name || '-').replace(/"/g, '""')}"`,
            `"${(user?.full_name || '-').replace(/"/g, '""')}"`,
            user?.phone || '-',
            user?.email || '-',
            booking.persons_count,
            booking.total_price,
            booking.status
        ].join(',');
        
        csvContent += row + "\n";
    });
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========== ЗАПУСК ==========
// Двойная страховка для admin-panel.html
if (window.location.pathname.includes('admin-panel.html')) {
    // Запускаем сразу
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 DOM загружен (admin-panel), запускаем initSupabase');
            initSupabase();
        });
    } else {
        console.log('🚀 DOM уже загружен (admin-panel), запускаем initSupabase');
        initSupabase();
    }
} else {
    // Для остальных страниц
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM загружен, запускаем initSupabase');
        initSupabase();
    });
}