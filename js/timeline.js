/** timeline.html JS */
        var SD = window.SampleDate;
        function formatDate(dateStr) {
            if (!dateStr) return '';
            var d = new Date(dateStr);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        // Data
        let timeline = JSON.parse(localStorage.getItem('timeline')) || [];
        let games = JSON.parse(localStorage.getItem('games')) || [];
        let achievements = JSON.parse(localStorage.getItem('achievements')) || [];
        let currentFilter = 'all';
        let editingId = null;

        // Icon options
        const iconOptions = [
            'trophy', 'gamepad-2', 'clock', 'star', 'check-circle', 'gift', 'award',
            'target', 'flag', 'crown', 'medal', 'zap', 'heart', 'bookmark',
            'calendar', 'camera', 'music', 'video', 'image', 'map-pin'
        ];

        // Sample data
        if (timeline.length === 0) {
            timeline = [
                { id: 1, type: 'achievement', title: '获得成就：初次相遇', description: '在原神中完成新手教程', date: SD.daysAgo(10), icon: 'trophy', color: 'purple', tags: ['原神'] },
                { id: 2, type: 'game', title: '开始游戏：原神', description: '开始新的冒险之旅', date: SD.daysAgo(12), icon: 'gamepad-2', color: 'blue', tags: ['开放世界'] },
                { id: 3, type: 'milestone', title: '游戏时长达到100小时', description: '在原神中累计游戏时长达到100小时', date: SD.daysAgo(15), icon: 'clock', color: 'orange', tags: ['里程碑'] }
            ];
            localStorage.setItem('timeline', JSON.stringify(timeline));
        }

        // Initialize icon selector
        function initIconSelector() {
            const container = document.getElementById('icon-selector');
            container.innerHTML = iconOptions.map(icon => `
                <div class="icon-option ${icon === 'trophy' ? 'selected' : ''}" data-icon="${icon}">
                    <i data-lucide="${icon}" class="w-5 h-5 text-gray-600"></i>
                </div>
            `).join('');
            lucide.createIcons();

            container.querySelectorAll('.icon-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    container.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    document.getElementById('event-icon').value = opt.dataset.icon;
                });
            });
        }

        // Initialize color selector
        function initColorSelector() {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    document.getElementById('event-color').value = opt.dataset.color;
                });
            });
        }

        // Get color class
        function getColorClass(color) {
            const map = {
                blue: 'bg-blue-100 text-blue-600 border-blue-500',
                orange: 'bg-cyan-50 text-cyan-600 border-cyan-500',
                green: 'bg-green-100 text-green-600 border-green-500',
                purple: 'bg-purple-100 text-purple-600 border-purple-500',
                pink: 'bg-pink-100 text-pink-600 border-pink-500',
                yellow: 'bg-yellow-100 text-yellow-600 border-yellow-500',
                red: 'bg-red-100 text-red-600 border-red-500'
            };
            return map[color] || map.blue;
        }

        // Update stats
        function updateStats() {
            document.getElementById('stat-total-events').textContent = timeline.length;
            document.getElementById('stat-achievements').textContent = timeline.filter(i => i.type === 'achievement').length;
            document.getElementById('stat-games').textContent = timeline.filter(i => i.type === 'game').length;
            document.getElementById('stat-milestones').textContent = timeline.filter(i => i.type === 'milestone').length;
        }

        // Render timeline
        function renderTimeline() {
            const container = document.getElementById('timeline-items');
            const emptyState = document.getElementById('empty-state');
            
            // Filter items
            let items = [...timeline];
            
            // Type filter
            if (currentFilter !== 'all') {
                items = items.filter(i => i.type === currentFilter);
            }
            
            // Date filter
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (startDate) items = items.filter(i => i.date >= startDate);
            if (endDate) items = items.filter(i => i.date <= endDate);
            
            // Sort by date
            items.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (items.length === 0) {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }
            
            emptyState.classList.add('hidden');
            
            container.innerHTML = items.map((item, index) => {
                const colorClass = getColorClass(item.color);
                const isEven = index % 2 === 0;
                
                return `
                    <div class="relative mb-8" data-aos="fade-up" data-aos-delay="${index * 50}">
                        <div class="absolute left-4 md:left-1/2 top-4 w-10 h-10 rounded-full ${colorClass.split(' ')[0]} border-2 ${colorClass.split(' ')[2]} 
                                    flex items-center justify-center transform -translate-x-1/2 z-10 shadow-md">
                            <i data-lucide="${item.icon}" class="w-5 h-5 ${colorClass.split(' ')[1]}"></i>
                        </div>
                        
                        <div class="ml-16 md:ml-0 ${isEven ? 'md:mr-[50%] md:pr-8' : 'md:ml-[50%] md:pl-8'}">
                            <div class="bg-white rounded-xl shadow-md p-5 border-l-4 ${colorClass.split(' ')[2]} hover:shadow-lg transition-shadow">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <span class="text-xs font-medium px-2 py-1 rounded-full ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} mb-2 inline-block">
                                            ${getTypeLabel(item.type)}
                                        </span>
                                        <h3 class="text-lg font-semibold text-gray-800">${item.title}</h3>
                                    </div>
                                    <div class="flex gap-1">
                                        <button class="p-2 text-gray-400 hover:text-blue-500 transition-colors" onclick="editEvent(${item.id})">
                                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                                        </button>
                                        <button class="p-2 text-gray-400 hover:text-red-500 transition-colors" onclick="deleteEvent(${item.id})">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-gray-600 text-sm mb-3">${item.description || ''}</p>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center text-sm text-gray-500">
                                        <i data-lucide="calendar" class="w-4 h-4 mr-1"></i>
                                        ${formatDate(item.date)}
                                    </div>
                                    ${item.tags ? `
                                        <div class="flex gap-1">
                                            ${item.tags.split(',').map(tag => `
                                                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">${tag.trim()}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            lucide.createIcons();
            updateStats();
        }

        function getTypeLabel(type) {
            const labels = { achievement: '成就', game: '游戏', milestone: '里程碑', custom: '自定义' };
            return labels[type] || type;
        }

        // Initialize year selector
        function initYearSelector() {
            const select = document.getElementById('year-select');
            const years = [...new Set(timeline.map(i => new Date(i.date).getFullYear()))].sort((a, b) => b - a);
            years.forEach(year => {
                select.innerHTML += `<option value="${year}">${year}年</option>`;
            });
        }

        // Generate year summary
        function generateYearSummary(year) {
            const yearData = year === 'all' ? timeline : timeline.filter(i => new Date(i.date).getFullYear() === parseInt(year));
            const container = document.getElementById('year-summary-container');
            
            if (yearData.length === 0) {
                container.innerHTML = '<p class="text-gray-500 col-span-3 text-center py-8">该年份暂无数据</p>';
                return;
            }
            
            const achievements = yearData.filter(i => i.type === 'achievement').length;
            const games = yearData.filter(i => i.type === 'game').length;
            const milestones = yearData.filter(i => i.type === 'milestone').length;
            const custom = yearData.filter(i => i.type === 'custom').length;
            
            container.innerHTML = `
                <div class="year-card">
                    <div class="text-sm opacity-80 mb-1">${year === 'all' ? '总计' : year + '年'}事件</div>
                    <div class="stat-highlight">${yearData.length}</div>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-md border-l-4 border-purple-500">
                    <div class="text-sm text-gray-500 mb-1">成就解锁</div>
                    <div class="text-3xl font-bold text-purple-600">${achievements}</div>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-md border-l-4 border-blue-500">
                    <div class="text-sm text-gray-500 mb-1">游戏记录</div>
                    <div class="text-3xl font-bold text-blue-600">${games}</div>
                </div>
            `;
        }

        // Modal functions
        const modal = document.getElementById('event-modal');
        const form = document.getElementById('event-form');

        function openModal(editItem = null) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            if (editItem) {
                editingId = editItem.id;
                document.getElementById('modal-title').textContent = '编辑事件';
                document.getElementById('event-id').value = editItem.id;
                document.getElementById('event-title').value = editItem.title;
                document.getElementById('event-description').value = editItem.description || '';
                document.getElementById('event-date').value = editItem.date;
                document.getElementById('event-type').value = editItem.type;
                document.getElementById('event-icon').value = editItem.icon;
                document.getElementById('event-color').value = editItem.color;
                document.getElementById('event-tags').value = editItem.tags || '';
                
                // Update selectors
                document.querySelectorAll('.icon-option').forEach(o => {
                    o.classList.toggle('selected', o.dataset.icon === editItem.icon);
                });
                document.querySelectorAll('.color-option').forEach(o => {
                    o.classList.toggle('selected', o.dataset.color === editItem.color);
                });
            } else {
                editingId = null;
                document.getElementById('modal-title').textContent = '添加事件';
                form.reset();
                document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('event-icon').value = 'trophy';
                document.getElementById('event-color').value = 'blue';
            }
        }

        function closeModal() {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            editingId = null;
        }

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const item = {
                id: editingId || Date.now(),
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                type: document.getElementById('event-type').value,
                icon: document.getElementById('event-icon').value,
                color: document.getElementById('event-color').value,
                tags: document.getElementById('event-tags').value
            };
            
            if (editingId) {
                const index = timeline.findIndex(i => i.id === editingId);
                timeline[index] = item;
                showToast('事件已更新');
            } else {
                timeline.push(item);
                showToast('事件已添加');
            }
            
            localStorage.setItem('timeline', JSON.stringify(timeline));
            renderTimeline();
            closeModal();
        });

        // Edit event
        window.editEvent = function(id) {
            const item = timeline.find(i => i.id === id);
            if (item) openModal(item);
        };

        // Delete event
        window.deleteEvent = function(id) {
            if (confirm('确定要删除这个事件吗？')) {
                timeline = timeline.filter(i => i.id !== id);
                localStorage.setItem('timeline', JSON.stringify(timeline));
                renderTimeline();
                showToast('事件已删除');
            }
        };

        // Export functions
        function exportToExcel() {
            const csv = [
                ['标题', '类型', '日期', '描述', '标签'].join(','),
                ...timeline.map(i => [
                    `"${i.title}"`,
                    getTypeLabel(i.type),
                    i.date,
                    `"${i.description || ''}"`,
                    `"${i.tags || ''}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `游戏时光轴_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            showToast('已导出为 CSV');
        }

        function exportToImage() {
            const element = document.getElementById('timeline-container');
            html2canvas(element, { backgroundColor: '#f9fafb', scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = `时光轴_${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL();
                link.click();
                showToast('已保存为图片');
            });
        }

        function exportToJSON() {
            const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `timeline_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            showToast('已导出为 JSON');
        }

        // Toast
        function showToast(message) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // Event listeners
        document.getElementById('add-event-btn').addEventListener('click', () => openModal());
        document.getElementById('add-first-event').addEventListener('click', () => openModal());
        document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
        
        document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timeline-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTimeline();
            });
        });

        document.getElementById('apply-date-filter').addEventListener('click', renderTimeline);
        document.getElementById('clear-date-filter').addEventListener('click', () => {
            document.getElementById('filter-start-date').value = '';
            document.getElementById('filter-end-date').value = '';
            renderTimeline();
        });

        document.getElementById('year-select').addEventListener('change', (e) => {
            generateYearSummary(e.target.value);
        });

        document.getElementById('generate-year-summary').addEventListener('click', () => {
            const year = document.getElementById('year-select').value;
            document.getElementById('year-summary-modal').classList.remove('hidden');
            // Generate detailed summary
        });

        // Export menu
        const exportBtn = document.getElementById('export-btn');
        const exportMenu = document.getElementById('export-menu');
        exportBtn.addEventListener('click', () => exportMenu.classList.toggle('show'));
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
                exportMenu.classList.remove('show');
            }
        });

        document.querySelectorAll('.export-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.export;
                if (type === 'excel') exportToExcel();
                if (type === 'image') exportToImage();
                if (type === 'json') exportToJSON();
                exportMenu.classList.remove('show');
            });
        });

        // Mobile menu
        document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });

        // Initialize
        initIconSelector();
        initColorSelector();
        initYearSelector();
        renderTimeline();
        generateYearSummary('all');
