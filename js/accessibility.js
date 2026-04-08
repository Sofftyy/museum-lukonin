// ========== ПАНЕЛЬ СПЕЦИАЛЬНЫХ ВОЗМОЖНОСТЕЙ ==========
(function() {
    function saveSetting(key, value) {
        localStorage.setItem('access_' + key, value);
    }
    
    function loadSetting(key, defaultValue) {
        const saved = localStorage.getItem('access_' + key);
        return saved !== null ? saved : defaultValue;
    }
    
    function applySettings() {
        // Размер шрифта
        const fontSize = loadSetting('fontSize', 'medium');
        document.body.classList.remove('font-small', 'font-large', 'font-xlarge');
        if (fontSize === 'small') document.body.classList.add('font-small');
        if (fontSize === 'large') document.body.classList.add('font-large');
        if (fontSize === 'xlarge') document.body.classList.add('font-xlarge');
        
        // Цветовая схема (бело-чёрная вместо тёмной)
        const color = loadSetting('color', 'default');
        document.body.classList.remove('color-dark', 'color-blue');
        if (color === 'dark') document.body.classList.add('color-dark');
        if (color === 'blue') document.body.classList.add('color-blue');
        
        // Изображения (НЕ скрываем кнопки панели и иконки в шапке)
        const images = loadSetting('images', 'on');
        if (images === 'off') {
            document.body.classList.add('images-off');
        } else {
            document.body.classList.remove('images-off');
        }
        
        // Интервал между буквами
        const spacing = loadSetting('spacing', 'normal');
        document.body.classList.remove('spacing-wide', 'spacing-xwide');
        if (spacing === 'wide') document.body.classList.add('spacing-wide');
        if (spacing === 'xwide') document.body.classList.add('spacing-xwide');
        
        // Шрифт
        const fontFamily = loadSetting('fontFamily', 'sans');
        if (fontFamily === 'serif') document.body.classList.add('font-serif');
        else document.body.classList.remove('font-serif');
        
        updateActiveButtons();
        
        // Сохраняем состояние панели (чтобы после перезагрузки помнить)
        console.log('🎨 Настройки применены:', { fontSize, color, images, spacing, fontFamily });
    }
    
    function updateActiveButtons() {
        const fontSize = loadSetting('fontSize', 'medium');
        document.querySelectorAll('[data-font]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.font === fontSize) btn.classList.add('active');
        });
        
        const color = loadSetting('color', 'default');
        document.querySelectorAll('[data-color]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === color) btn.classList.add('active');
        });
        
        const images = loadSetting('images', 'on');
        document.querySelectorAll('[data-images]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.images === images) btn.classList.add('active');
        });
        
        const spacing = loadSetting('spacing', 'normal');
        document.querySelectorAll('[data-spacing]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.spacing === spacing) btn.classList.add('active');
        });
        
        const fontFamily = loadSetting('fontFamily', 'sans');
        document.querySelectorAll('[data-font-family]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.fontFamily === fontFamily) btn.classList.add('active');
        });
    }
    
    function createAccessibilityPanel() {
        if (document.getElementById('accessibilityPanel')) return;
        
        const panelHTML = `
            <div id="accessibilityPanel" class="accessibility-panel" style="display: none;">
                <div class="accessibility-panel-inner">
                    <div class="accessibility-header">
                        <span>Настройки отображения</span>
                        <button id="closePanelBtn" class="close-panel-btn">&times;</button>
                    </div>
                    <div class="accessibility-body">
                        <div class="accessibility-section">
                            <div class="section-title">Размер шрифта</div>
                            <div class="btn-group">
                                <button class="access-btn" data-font="small">A</button>
                                <button class="access-btn active" data-font="medium">A</button>
                                <button class="access-btn" data-font="large">A</button>
                                <button class="access-btn" data-font="xlarge">A</button>
                            </div>
                        </div>
                        <div class="accessibility-section">
                            <div class="section-title">Цветовая схема</div>
                            <div class="btn-group">
                                <button class="access-btn color-btn active" data-color="default">Обычная</button>
                                <button class="access-btn color-btn" data-color="dark">Бело-чёрная</button>
                                <button class="access-btn color-btn" data-color="blue">Синяя</button>
                            </div>
                        </div>
                        <div class="accessibility-section">
                            <div class="section-title">Изображения</div>
                            <div class="btn-group">
                                <button class="access-btn active" data-images="on">Вкл.</button>
                                <button class="access-btn" data-images="off">Выкл.</button>
                            </div>
                        </div>
                        <div class="accessibility-section">
                            <div class="section-title">Интервал между буквами</div>
                            <div class="btn-group">
                                <button class="access-btn active" data-spacing="normal">Нормальный</button>
                                <button class="access-btn" data-spacing="wide">Увеличенный</button>
                                <button class="access-btn" data-spacing="xwide">Большой</button>
                            </div>
                        </div>
                        <div class="accessibility-section">
                            <div class="section-title">Шрифт</div>
                            <div class="btn-group">
                                <button class="access-btn active" data-font-family="sans">Без засечек</button>
                                <button class="access-btn" data-font-family="serif">С засечками</button>
                            </div>
                        </div>
                        <button id="resetAccessSettings" class="reset-settings-btn">Сбросить все настройки</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', panelHTML);
    }
    
    function initAccessibility() {
        createAccessibilityPanel();
        
        const panel = document.getElementById('accessibilityPanel');
        const openBtn = document.getElementById('openPanelBtn');
        const closeBtn = document.getElementById('closePanelBtn');
        
        // Открытие панели
        if (openBtn && panel) {
            openBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                panel.style.display = 'flex';
                console.log('🔓 Панель открыта');
            });
        }
        
        // Закрытие панели по кнопке ×
        if (closeBtn && panel) {
            closeBtn.addEventListener('click', function() {
                panel.style.display = 'none';
                console.log('🔒 Панель закрыта');
            });
        }
        
        // Закрытие панели по клику на фон
        if (panel) {
            panel.addEventListener('click', function(e) {
                if (e.target === panel) {
                    panel.style.display = 'none';
                }
            });
        }
        
        // Обработчики кнопок настроек
        document.querySelectorAll('[data-font]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSetting('fontSize', btn.dataset.font);
                applySettings();
            });
        });
        
        document.querySelectorAll('[data-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSetting('color', btn.dataset.color);
                applySettings();
            });
        });
        
        document.querySelectorAll('[data-images]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSetting('images', btn.dataset.images);
                applySettings();
            });
        });
        
        document.querySelectorAll('[data-spacing]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSetting('spacing', btn.dataset.spacing);
                applySettings();
            });
        });
        
        document.querySelectorAll('[data-font-family]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSetting('fontFamily', btn.dataset.fontFamily);
                applySettings();
            });
        });
        
        const resetBtn = document.getElementById('resetAccessSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                localStorage.removeItem('access_fontSize');
                localStorage.removeItem('access_color');
                localStorage.removeItem('access_images');
                localStorage.removeItem('access_spacing');
                localStorage.removeItem('access_fontFamily');
                applySettings();
                console.log('🔄 Все настройки сброшены');
            });
        }
        
        // Применяем сохранённые настройки
        applySettings();
        console.log('♿ Панель специальных возможностей готова');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessibility);
    } else {
        initAccessibility();
    }
})();