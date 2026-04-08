// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    ADMIN_EMAIL: 'midex1337@mail.ru',
    SITE_URL: 'https://vokm134.ru'
};

// ========== EMAILJS ИНИЦИАЛИЗАЦИЯ ==========
emailjs.init('amraDdYtetS2ES2do');

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let excursionsData = {};
let currentDate1 = new Date();
let currentDate2 = new Date();
let currentView = 'calendar';
let supabaseClient = null;

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ ==========
function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMonthName(date) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

// ========== ЛОКАЛЬНЫЕ ДАННЫЕ (FALLBACK) ==========
function getLocalExcursionsData() {
    return {
        "2026-04-02": [{ id: 1, name: "Посиделки у поэта", time: "15:00", duration: "1 час", price: 250, places: 15, description: "Участники мероприятия придут в гости в «сталинку» поэта." }],
        "2026-04-09": [{ id: 2, name: "Советский экран", time: "15:00", duration: "1.5 часа", price: 250, places: 12, description: "Мероприятие в мемориальной квартире поэта." }],
        "2026-04-16": [{ id: 3, name: "Советский экран", time: "15:00", duration: "1.5 часа", price: 250, places: 12, description: "Мероприятие в мемориальной квартире поэта." }],
        "2026-04-23": [{ id: 4, name: "Большая жизнь маленькой квартиры", time: "18:00", duration: "2 часа", price: 500, places: 20, description: "Совместный проект с благотворительным фондом." }],
        "2026-05-01": [{ id: 5, name: "Посиделки у поэта", time: "15:00", duration: "1 час", price: 250, places: 8, description: "Участники мероприятия придут в гости в «сталинку» поэта." }],
        "2026-05-15": [{ id: 6, name: "Советский экран", time: "15:00", duration: "1.5 часа", price: 250, places: 10, description: "Мероприятие в мемориальной квартире поэта." }]
    };
}

function initLocalData() {
    excursionsData = getLocalExcursionsData();
    console.log('📦 Локальные данные загружены');
}

// ========== ОТПРАВКА EMAIL ЧЕРЕЗ EMAILJS ==========
async function sendEmailNotification(bookingData) {
    const { name, phone, email, excursionName, dateFormatted, time, persons, totalPrice, comment } = bookingData;
    
    console.log('📧 Отправка email на midex1337@mail.ru...');
    
    try {
        const result = await emailjs.send(
            'service_2gyjty2',           // Service ID
            'template_8ggpirs',          // Template ID (правильный!)
            {
                name: name,
                phone: phone,
                user_email: email,
                excursion: excursionName,
                date: dateFormatted,
                time: time,
                persons: persons,
                total: totalPrice,
                comment: comment || 'Нет'
            }
        );
        console.log('✅ Email успешно отправлен!', result);
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки email:', error);
        console.error('Статус:', error.status);
        console.error('Текст:', error.text);
        return false;
    }
}

// ========== ПОДКЛЮЧЕНИЕ К SUPABASE ==========
async function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.log('⏳ Ожидание загрузки Supabase...');
        setTimeout(initSupabase, 500);
        return;
    }
    
    if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.url) {
        console.warn('⚠️ SUPABASE_CONFIG не найден, используем локальные данные');
        initLocalData();
        renderBothCalendars();
        return;
    }
    
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Supabase подключен');
    
    await loadExcursionsFromSupabase();
}

async function loadExcursionsFromSupabase() {
    if (!supabaseClient) return;
    
    try {
        const { data: schedules, error } = await supabaseClient
            .from('excursion_schedules')
            .select(`
                id,
                excursion_date,
                start_time,
                available_places,
                excursions (id, name, description, duration_minutes, price, max_places)
            `)
            .gte('excursion_date', new Date().toISOString().split('T')[0])
            .order('excursion_date');
        
        if (error) throw error;
        
        if (schedules && schedules.length > 0) {
            const newExcursionsData = {};
            schedules.forEach(schedule => {
                const dateStr = schedule.excursion_date;
                const excursion = schedule.excursions;
                if (!newExcursionsData[dateStr]) {
                    newExcursionsData[dateStr] = [];
                }
                newExcursionsData[dateStr].push({
                    id: schedule.id,
                    name: excursion.name,
                    time: schedule.start_time.substring(0, 5),
                    duration: `${excursion.duration_minutes} мин`,
                    price: excursion.price,
                    places: schedule.available_places,
                    description: excursion.description || '',
                    maxPlaces: excursion.max_places
                });
            });
            
            excursionsData = newExcursionsData;
            console.log('✅ Данные загружены из Supabase');
            renderBothCalendars();
            if (currentView === 'nearest') renderNearest();
        } else {
            console.log('📭 Нет данных в Supabase, используем локальные');
            initLocalData();
            renderBothCalendars();
        }
    } catch (err) {
        console.error('❌ Ошибка загрузки из Supabase:', err);
        initLocalData();
        renderBothCalendars();
    }
}

// ========== КАЛЕНДАРЬ ==========
function initDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentDate1 = new Date(today);
    currentDate2 = new Date(today);
    currentDate2.setMonth(currentDate2.getMonth() + 1);
}

function renderSingleCalendar(containerId, monthBtnId, monthDisplayId, currentDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startWeekday = firstDay.getDay();
    let startOffset = startWeekday === 0 ? 6 : startWeekday - 1;
    
    document.getElementById(monthDisplayId).textContent = getMonthName(currentDate);
    
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    for (let i = 0; i < startOffset; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day other-month';
        emptyDiv.textContent = '';
        container.appendChild(emptyDiv);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = formatDate(dateObj);
        const isAvail = excursionsData[dateStr] !== undefined;
        const isPast = isPastDate(dateObj);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;
        
        if (isPast) {
            dayDiv.classList.add('past');
        } else if (isAvail) {
            dayDiv.classList.add('available');
            dayDiv.addEventListener('click', () => openModal(dateStr));
        }
        
        container.appendChild(dayDiv);
    }
    
    const prevBtn = document.getElementById(monthBtnId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() <= today.getMonth()) {
        prevBtn.classList.add('disabled');
        prevBtn.disabled = true;
    } else {
        prevBtn.classList.remove('disabled');
        prevBtn.disabled = false;
    }
}

function renderBothCalendars() {
    if (document.getElementById('calendarDays1')) {
        renderSingleCalendar('calendarDays1', 'prevMonthBtn1', 'currentMonth1', currentDate1);
        renderSingleCalendar('calendarDays2', 'prevMonthBtn2', 'currentMonth2', currentDate2);
    }
}

function changeMonth(offset, isSecondCalendar) {
    if (isSecondCalendar) {
        const newDate = new Date(currentDate2);
        newDate.setMonth(newDate.getMonth() + offset);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newDate < today) return;
        if (newDate <= currentDate1) return;
        currentDate2 = newDate;
    } else {
        const newDate = new Date(currentDate1);
        newDate.setMonth(newDate.getMonth() + offset);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newDate < today) return;
        currentDate1 = newDate;
        if (currentDate2 <= currentDate1) {
            currentDate2 = new Date(currentDate1);
            currentDate2.setMonth(currentDate2.getMonth() + 1);
        }
    }
    renderBothCalendars();
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function openModal(dateStr) {
    const excursions = excursionsData[dateStr];
    if (!excursions) return;
    
    const modal = document.getElementById('excursionModal');
    if (!modal) return;
    
    const modalDate = document.getElementById('modalDate');
    const modalList = document.getElementById('modalExcursionsList');
    
    const [year, month, day] = dateStr.split('-');
    modalDate.textContent = `${day}.${month}.${year}`;
    
    modalList.innerHTML = '';
    excursions.forEach(exc => {
        const excDiv = document.createElement('div');
        excDiv.className = 'excursion-item';
        excDiv.innerHTML = `
            <h4>${exc.name}</h4>
            <p>🕒 ${exc.time} (${exc.duration})</p>
            <p>💰 ${exc.price} руб./чел.</p>
            <p class="excursion-places">📅 Свободно мест: ${exc.places}</p>
            <p>📝 ${exc.description.substring(0, 100)}${exc.description.length > 100 ? '...' : ''}</p>
        `;
        excDiv.addEventListener('click', () => {
            closeModal();
            openBookingForm(dateStr, exc);
        });
        modalList.appendChild(excDiv);
    });
    
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('excursionModal');
    if (modal) modal.style.display = 'none';
}

function openBookingForm(dateStr, excursion) {
    const bookingModal = document.getElementById('bookingFormModal');
    if (!bookingModal) return;
    
    const [year, month, day] = dateStr.split('-');
    
    const form = document.getElementById('bookingForm');
    form.setAttribute('data-date', `${day}.${month}.${year}`);
    form.setAttribute('data-date-str', dateStr);
    form.setAttribute('data-excursion', excursion.name);
    form.setAttribute('data-time', excursion.time);
    form.setAttribute('data-price', excursion.price);
    form.setAttribute('data-id', excursion.id);
    
    const personsInput = form.querySelector('input[type="number"]');
    personsInput.max = excursion.places;
    
    let placesHint = form.querySelector('.places-hint');
    if (placesHint) {
        placesHint.textContent = `Свободно мест: ${excursion.places}`;
    }
    
    bookingModal.style.display = 'flex';
}

function closeBookingForm() {
    const modal = document.getElementById('bookingFormModal');
    if (modal) modal.style.display = 'none';
}

// ========== БЛИЖАЙШИЕ ЭКСКУРСИИ ==========
function switchView(view) {
    currentView = view;
    const calendarsContainer = document.getElementById('calendarsContainer');
    const nearestEvents = document.getElementById('nearestEvents');
    const calendarBtn = document.getElementById('calendarViewBtn');
    const nearestBtn = document.getElementById('nearestViewBtn');
    
    if (!calendarsContainer || !nearestEvents) return;
    
    if (view === 'calendar') {
        calendarsContainer.style.display = 'flex';
        nearestEvents.style.display = 'none';
        if (calendarBtn) calendarBtn.classList.add('active');
        if (nearestBtn) nearestBtn.classList.remove('active');
        renderBothCalendars();
    } else {
        calendarsContainer.style.display = 'none';
        nearestEvents.style.display = 'block';
        if (calendarBtn) calendarBtn.classList.remove('active');
        if (nearestBtn) nearestBtn.classList.add('active');
        renderNearest();
    }
}

function renderNearest() {
    const nearestList = document.getElementById('nearestList');
    if (!nearestList) return;
    
    nearestList.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDates = Object.keys(excursionsData)
        .filter(dateStr => new Date(dateStr) >= today)
        .sort();
    
    if (futureDates.length === 0) {
        nearestList.innerHTML = '<p style="text-align:center; padding:20px;">Нет запланированных экскурсий</p>';
        return;
    }
    
    futureDates.forEach(dateStr => {
        const [year, month, day] = dateStr.split('-');
        const excursions = excursionsData[dateStr];
        excursions.forEach(exc => {
            const excDiv = document.createElement('div');
            excDiv.className = 'excursion-item';
            excDiv.innerHTML = `
                <h4>${exc.name}</h4>
                <p>📅 ${day}.${month}.${year} в ${exc.time}</p>
                <p>💰 ${exc.price} руб./чел.</p>
                <p class="excursion-places">📅 Свободно мест: ${exc.places}</p>
            `;
            excDiv.addEventListener('click', () => openModal(dateStr));
            nearestList.appendChild(excDiv);
        });
    });
}

// ========== СОХРАНЕНИЕ БРОНИРОВАНИЯ ==========
async function saveBookingToSupabase(bookingData) {
    if (!supabaseClient) {
        console.warn('Supabase не подключен, сохраняем локально');
        return saveBookingLocal(bookingData);
    }
    
    const { dateStr, excursionId, excursionName, time, price, name, phone, email, persons, comment } = bookingData;
    
    try {
        const { data: schedule, error: scheduleError } = await supabaseClient
            .from('excursion_schedules')
            .select('id, available_places')
            .eq('id', excursionId)
            .single();
        
        if (scheduleError) throw scheduleError;
        
        if (schedule.available_places < persons) {
            alert('Извините, недостаточно мест!');
            return null;
        }
        
        let userId = null;
        const { data: existingUser } = await supabaseClient
            .from('users')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();
        
        if (existingUser) {
            userId = existingUser.id;
        } else {
            const { data: newUser, error: userError } = await supabaseClient
                .from('users')
                .insert({ full_name: name, phone, email })
                .select()
                .single();
            
            if (!userError && newUser) {
                userId = newUser.id;
            }
        }
        
        const bookingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const { data: booking, error: bookingError } = await supabaseClient
            .from('bookings')
            .insert({
                user_id: userId,
                schedule_id: schedule.id,
                persons_count: persons,
                total_price: price * persons,
                comment: comment,
                booking_code: bookingCode,
                status: 'pending'
            })
            .select()
            .single();
        
        if (bookingError) throw bookingError;
        
        await supabaseClient
            .from('excursion_schedules')
            .update({ available_places: schedule.available_places - persons })
            .eq('id', schedule.id);
        
        console.log('✅ Бронирование сохранено в Supabase, код:', bookingCode);
        
        if (excursionsData[dateStr]) {
            const excIndex = excursionsData[dateStr].findIndex(e => e.id === excursionId);
            if (excIndex !== -1) {
                excursionsData[dateStr][excIndex].places -= persons;
            }
        }
        
        return {
            ...booking,
            excursionName,
            dateFormatted: formatDateForDisplay(dateStr),
            time
        };
        
    } catch (err) {
        console.error('❌ Ошибка сохранения в Supabase:', err);
        alert('Ошибка при сохранении. Заявка сохранена локально, администратор свяжется с вами.');
        return saveBookingLocal(bookingData);
    }
}

function saveBookingLocal(bookingData) {
    const { dateStr, excursionId, excursionName, time, price, name, phone, email, persons, comment } = bookingData;
    
    if (excursionsData[dateStr]) {
        const excursion = excursionsData[dateStr].find(e => e.id === excursionId);
        if (excursion && excursion.places >= persons) {
            excursion.places -= parseInt(persons);
        }
    }
    
    const newBooking = {
        id: Date.now(),
        date: dateStr,
        dateFormatted: formatDateForDisplay(dateStr),
        excursionId,
        excursionName,
        time,
        price,
        persons: parseInt(persons),
        totalPrice: price * parseInt(persons),
        name,
        phone,
        email,
        comment,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(newBooking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    localStorage.setItem('excursionsData', JSON.stringify(excursionsData));
    
    console.log('📦 Бронирование сохранено локально');
    return newBooking;
}

// ========== ОБРАБОТЧИК ФОРМЫ ==========
async function handleBookingSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const name = form.querySelector('input[type="text"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const persons = parseInt(form.querySelector('input[type="number"]').value);
    const comment = form.querySelector('textarea').value;
    const dateFormatted = form.getAttribute('data-date');
    const excursionName = form.getAttribute('data-excursion');
    const time = form.getAttribute('data-time');
    const price = parseInt(form.getAttribute('data-price'));
    const excursionId = parseInt(form.getAttribute('data-id'));
    const dateStr = form.getAttribute('data-date-str');
    
    const booking = await saveBookingToSupabase({
        dateStr, excursionId, excursionName, time, price,
        name, phone, email, persons, comment
    });
    
    if (booking) {
        alert(`✅ Заявка успешно отправлена!\n\n📅 Экскурсия: ${excursionName}\n📆 Дата: ${dateFormatted} в ${time}\n👥 Количество: ${persons}\n💰 Сумма: ${price * persons} руб.\n\nСкоро с вами свяжется сотрудник музея.`);
        
        // Отправка email уведомления
        await sendEmailNotification({
            name: name,
            phone: phone,
            email: email,
            excursionName: excursionName,
            dateFormatted: dateFormatted,
            time: time,
            persons: persons,
            totalPrice: price * persons,
            comment: comment
        });
        
        renderBothCalendars();
        if (currentView === 'nearest') renderNearest();
    }
    
    closeBookingForm();
    form.reset();
}

// ========== ОБЩИЕ ФУНКЦИИ ==========
function initLogoLink() {
    const logoLink = document.getElementById('logoLink');
    if (logoLink) {
        logoLink.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
}

// ========== ЧЁРНО-БЕЛЫЙ РЕЖИМ (РАБОТАЕТ НА ВСЕХ СТРАНИЦАХ) ==========
function toggleGrayscale() {
    const html = document.documentElement;
    if (html.style.filter === 'grayscale(100%)') {
        html.style.filter = 'none';
        localStorage.setItem('grayscaleMode', 'off');
        console.log('🌈 Цветной режим включен');
    } else {
        html.style.filter = 'grayscale(100%)';
        localStorage.setItem('grayscaleMode', 'on');
        console.log('⚫ Чёрно-белый режим включен');
    }
}

// Загрузка сохранённого режима при загрузке страницы
function loadGrayscaleMode() {
    const savedMode = localStorage.getItem('grayscaleMode');
    if (savedMode === 'on') {
        document.documentElement.style.filter = 'grayscale(100%)';
        console.log('⚫ Загружен чёрно-белый режим');
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    initLogoLink();
    initDates();
    
    // Кнопка чёрно-белого режима
    const grayscaleBtn = document.getElementById('grayscaleBtn');
    if (grayscaleBtn) {
        grayscaleBtn.addEventListener('click', toggleGrayscale);
    }
    
    const prevBtn1 = document.getElementById('prevMonthBtn1');
    const nextBtn1 = document.getElementById('nextMonthBtn1');
    const prevBtn2 = document.getElementById('prevMonthBtn2');
    const nextBtn2 = document.getElementById('nextMonthBtn2');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const nearestViewBtn = document.getElementById('nearestViewBtn');
    const modalClose = document.querySelector('.modal-close');
    const closeBookingBtn = document.getElementById('closeBookingForm');
    const bookingForm = document.getElementById('bookingForm');
    
    if (prevBtn1) prevBtn1.addEventListener('click', () => changeMonth(-1, false));
    if (nextBtn1) nextBtn1.addEventListener('click', () => changeMonth(1, false));
    if (prevBtn2) prevBtn2.addEventListener('click', () => changeMonth(-1, true));
    if (nextBtn2) nextBtn2.addEventListener('click', () => changeMonth(1, true));
    if (calendarViewBtn) calendarViewBtn.addEventListener('click', () => switchView('calendar'));
    if (nearestViewBtn) nearestViewBtn.addEventListener('click', () => switchView('nearest'));
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (closeBookingBtn) closeBookingBtn.addEventListener('click', closeBookingForm);
    if (bookingForm) bookingForm.addEventListener('submit', handleBookingSubmit);
    
    window.addEventListener('click', (e) => {
        const excursionModal = document.getElementById('excursionModal');
        const bookingModal = document.getElementById('bookingFormModal');
        if (e.target === excursionModal) closeModal();
        if (e.target === bookingModal) closeBookingForm();
    });
    
    // Загружаем сохранённый чёрно-белый режим
    loadGrayscaleMode();
    
    initSupabase();
    switchView('calendar');
    
    console.log('🎉 Сайт готов к работе!');
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showStats() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    console.log('\n📊 ===== СТАТИСТИКА =====');
    console.log(`📝 Всего заявок: ${bookings.length}`);
    let totalPlaces = 0;
    for (const date in excursionsData) {
        excursionsData[date].forEach(exc => { totalPlaces += exc.places; });
    }
    console.log(`🎟️ Всего свободных мест: ${totalPlaces}`);
    console.log('========================\n');
}

function exportBookings() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const dataStr = JSON.stringify(bookings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `museum_bookings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📥 Экспорт заявок выполнен');
}

window.showStats = showStats;
window.exportBookings = exportBookings;