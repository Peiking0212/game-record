// ============================================================
// wishlist.js - 游戏愿望单页面业务逻辑
// 数据存储: localStorage key = game_record_wishlist
// ============================================================

// ---------- 数据读写 ----------
function getWishlist() {
  try {
    var data = localStorage.getItem('game_record_wishlist');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem('game_record_wishlist', JSON.stringify(list));
}

// ---------- 工具函数 ----------
function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function showToast(message) {
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- 封面生成 ----------
function getCoverHtml(url, name) {
  var defaultCovers = ['assets/default-cover-male.jpg', 'assets/default-cover-female.jpg'];
  var defaultCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];
  if (url && url.trim() !== '') {
    return '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(name) + '" class="wishlist-cover-img" onerror="this.onerror=null;this.src=\'' + defaultCover + '\';">';
  }
  return '<img src="' + defaultCover + '" alt="' + escapeHtml(name) + '" class="wishlist-cover-img">';
}

// ---------- 星级渲染（卡片展示用） ----------
function renderStars(rating, maxStars) {
  maxStars = maxStars || 5;
  var html = '';
  for (var i = 1; i <= maxStars; i++) {
    if (i <= rating) {
      html += '<span class="star star-filled" style="color:#f59e0b;">&#9733;</span>';
    } else {
      html += '<span class="star star-empty" style="color:#9ca3af;">&#9734;</span>';
    }
  }
  return html;
}

// ---------- 优先级标签（使用 high/medium/low） ----------
function getPriorityLabel(p) {
  if (p === 'high') return '<span class="priority-tag priority-high">高</span>';
  if (p === 'medium') return '<span class="priority-tag priority-medium">中</span>';
  if (p === 'low') return '<span class="priority-tag priority-low">低</span>';
  return '';
}

function getPriorityClass(p) {
  if (p === 'high') return 'high';
  if (p === 'medium') return 'medium';
  if (p === 'low') return 'low';
  return 'medium';
}

// ---------- 星级评分点击函数（全局，供 HTML onclick 调用） ----------

/**
 * 设置添加表单的星级评分
 * @param {number} val - 1~5 的评分值
 */
function setRating(val) {
  // 更新隐藏 input 的值
  var ratingInput = document.getElementById('wish-rating');
  if (ratingInput) {
    ratingInput.value = val;
  }
  // 更新星星视觉状态
  var stars = document.querySelectorAll('#rating-select .rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
      stars[i].classList.add('star-active');
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
      stars[i].classList.remove('star-active');
    }
  }
}

/**
 * 设置编辑表单的星级评分
 * @param {number} val - 1~5 的评分值
 */
function setEditRating(val) {
  // 更新隐藏 input 的值
  var ratingInput = document.getElementById('edit-wish-rating');
  if (ratingInput) {
    ratingInput.value = val;
  }
  // 更新星星视觉状态
  var stars = document.querySelectorAll('#edit-rating-select .edit-rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
      stars[i].classList.add('star-active');
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
      stars[i].classList.remove('star-active');
    }
  }
}

/**
 * 重置添加表单的星级视觉状态（所有星星置灰）
 */
function resetAddRatingStars() {
  var stars = document.querySelectorAll('#rating-select .rating-star');
  for (var i = 0; i < stars.length; i++) {
    stars[i].style.color = '#9ca3af';
    stars[i].style.fill = 'none';
    stars[i].classList.remove('star-active');
  }
  var ratingInput = document.getElementById('wish-rating');
  if (ratingInput) {
    ratingInput.value = '0';
  }
}

/**
 * 重置编辑表单的星级视觉状态（所有星星置灰）
 */
function resetEditRatingStars() {
  var stars = document.querySelectorAll('#edit-rating-select .edit-rating-star');
  for (var i = 0; i < stars.length; i++) {
    stars[i].style.color = '#9ca3af';
    stars[i].style.fill = 'none';
    stars[i].classList.remove('star-active');
  }
  var ratingInput = document.getElementById('edit-wish-rating');
  if (ratingInput) {
    ratingInput.value = '0';
  }
}

// ---------- 渲染愿望单列表 ----------
function renderWishlist() {
  var container = document.getElementById('wishlist-items');
  if (!container) return;

  var list = getWishlist();

  // 搜索
  var searchInput = document.getElementById('search');
  var keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

  // 筛选（使用 HTML 中的正确 ID）
  var platformFilter = document.getElementById('platform-filter');
  var priorityFilter = document.getElementById('priority-filter');
  var sortSelect = document.getElementById('sort-by');

  if (keyword) {
    list = list.filter(function (item) {
      return (item.name && item.name.toLowerCase().indexOf(keyword) !== -1) ||
             (item.notes && item.notes.toLowerCase().indexOf(keyword) !== -1);
    });
  }

  if (platformFilter && platformFilter.value && platformFilter.value !== 'all') {
    list = list.filter(function (item) {
      return item.platform === platformFilter.value;
    });
  }

  if (priorityFilter && priorityFilter.value && priorityFilter.value !== 'all') {
    list = list.filter(function (item) {
      return item.priority === priorityFilter.value;
    });
  }

  // 排序
  if (sortSelect && sortSelect.value) {
    var sortVal = sortSelect.value;
    list.sort(function (a, b) {
      switch (sortVal) {
        case 'date-desc':
          return new Date(b.date || 0) - new Date(a.date || 0);
        case 'date-asc':
          return new Date(a.date || 0) - new Date(b.date || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'price-asc':
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price-desc':
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        default:
          return 0;
      }
    });
  }

  // 空状态处理
  var emptyState = document.getElementById('empty-state');
  if (list.length === 0) {
    container.innerHTML = '';
    if (emptyState) { emptyState.classList.remove('hidden'); }
    return;
  }

  if (emptyState) { emptyState.classList.add('hidden'); }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var pClass = getPriorityClass(item.priority);
    html += '<div class="wishlist-card wishlist-priority-' + pClass + '" data-id="' + item.id + '">';
    html += '  <div class="wishlist-cover">' + getCoverHtml(item.cover, item.name) + '</div>';
    html += '  <div class="wishlist-info">';
    html += '    <div class="wishlist-info-header">';
    html += '      <h3 class="wishlist-name">' + escapeHtml(item.name) + '</h3>';
    html += '      <div class="wishlist-actions">';
    html += '        <button class="btn-edit-wishlist" data-id="' + item.id + '" title="编辑"><i data-lucide="pencil"></i></button>';
    html += '        <button class="btn-delete-wishlist" data-id="' + item.id + '" title="删除"><i data-lucide="trash-2"></i></button>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="wishlist-meta">';
    if (item.platform) {
      html += '      <span class="wishlist-platform">' + escapeHtml(item.platform) + '</span>';
    }
    html += '      <span class="wishlist-stars">' + renderStars(item.rating || 0) + '</span>';
    if (item.priority) {
      html += '      <span class="wishlist-priority-tag">' + getPriorityLabel(item.priority) + '</span>';
    }
    if (item.price !== undefined && item.price !== null && item.price !== '') {
      html += '      <span class="wishlist-price">&yen;' + escapeHtml(String(item.price)) + '</span>';
    }
    html += '    </div>';
    if (item.notes) {
      html += '    <p class="wishlist-notes">' + escapeHtml(item.notes) + '</p>';
    }
    html += '    <div class="wishlist-date">' + formatDate(item.date) + '</div>';
    html += '  </div>';
    html += '</div>';
  }

  container.innerHTML = html;
  if (window.lucide) { lucide.createIcons(); }

  // 绑定编辑/删除按钮
  var editBtns = container.querySelectorAll('.btn-edit-wishlist');
  for (var j = 0; j < editBtns.length; j++) {
    editBtns[j].addEventListener('click', function () {
      openEditWishlistModal(this.getAttribute('data-id'));
    });
  }

  var deleteBtns = container.querySelectorAll('.btn-delete-wishlist');
  for (var k = 0; k < deleteBtns.length; k++) {
    deleteBtns[k].addEventListener('click', function () {
      openDeleteConfirmModal(this.getAttribute('data-id'));
    });
  }
}

// ============================================================
// Modal: 添加愿望单
// ============================================================
function openAddWishlistModal() {
  var modal = document.getElementById('add-wishlist-modal');
  if (!modal) return;
  modal.classList.add('active');
  // 清空表单
  var form = document.getElementById('add-wishlist-form');
  if (form) { form.reset(); }
  // 重置星级评分的视觉状态（lucide star icon，不是 radio button）
  resetAddRatingStars();
  // 重新初始化 lucide 图标（因为 modal display 从 none 变为 flex）
  if (window.lucide) { lucide.createIcons(); }
}

function closeAddWishlistModal() {
  var modal = document.getElementById('add-wishlist-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

// ---------- 添加提交 ----------
function handleAddWishlistSubmit(e) {
  e.preventDefault();
  var nameInput = document.querySelector('#add-wishlist-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  // 从隐藏 input #wish-rating 读取评分值
  var ratingInput = document.getElementById('wish-rating');
  var rating = ratingInput ? parseInt(ratingInput.value) : 0;
  if (isNaN(rating) || rating < 1) {
    showToast('请选择期望度');
    return;
  }

  // 使用 HTML 中的 name="cover"
  var coverInput = document.querySelector('#add-wishlist-form [name="cover"]');
  var platformInput = document.querySelector('#add-wishlist-form [name="platform"]');
  var priorityInput = document.querySelector('#add-wishlist-form [name="priority"]');
  var priceInput = document.querySelector('#add-wishlist-form [name="price"]');
  var notesInput = document.querySelector('#add-wishlist-form [name="notes"]');

  var newItem = {
    id: 'wl_' + Date.now(),
    name: name,
    cover: coverInput ? coverInput.value.trim() : '',
    platform: platformInput ? platformInput.value : '',
    rating: rating,
    priority: priorityInput ? priorityInput.value : 'high',
    price: priceInput ? priceInput.value.trim() : '',
    notes: notesInput ? notesInput.value.trim() : '',
    date: new Date().toISOString()
  };

  var list = getWishlist();
  list.push(newItem);
  saveWishlist(list);
  closeAddWishlistModal();
  renderWishlist();
  showToast('愿望单已添加');
}

// ============================================================
// Modal: 编辑愿望单
// ============================================================
function openEditWishlistModal(id) {
  var modal = document.getElementById('edit-wishlist-modal');
  if (!modal) return;

  var list = getWishlist();
  var item = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { item = list[i]; break; }
  }
  if (!item) return;

  modal.classList.add('active');

  // 填充表单字段
  var nameInput = document.getElementById('edit-wish-name');
  var coverInput = document.getElementById('edit-wish-cover');
  var platformInput = document.getElementById('edit-wish-platform');
  var priorityInput = document.querySelector('#edit-wishlist-form [name="edit-priority"]');
  var priceInput = document.getElementById('edit-wish-price');
  var notesInput = document.getElementById('edit-wish-notes');

  if (nameInput) nameInput.value = item.name || '';
  if (coverInput) coverInput.value = item.cover || '';
  if (platformInput) platformInput.value = item.platform || '';
  if (priorityInput) priorityInput.value = item.priority || 'high';
  if (priceInput) priceInput.value = item.price || '';
  if (notesInput) notesInput.value = item.notes || '';

  // 设置星级评分的视觉状态
  var rating = item.rating || 0;
  if (rating < 1) rating = 0;
  setEditRating(rating);

  // 存储当前编辑 ID
  modal.setAttribute('data-edit-id', id);

  // 重新初始化 lucide 图标
  if (window.lucide) { lucide.createIcons(); }
}

function closeEditWishlistModal() {
  var modal = document.getElementById('edit-wishlist-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function handleEditWishlistSubmit(e) {
  e.preventDefault();
  var modal = document.getElementById('edit-wishlist-modal');
  var id = modal ? modal.getAttribute('data-edit-id') : '';
  if (!id) return;

  var nameInput = document.querySelector('#edit-wishlist-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  // 从隐藏 input #edit-wish-rating 读取评分值
  var ratingInput = document.getElementById('edit-wish-rating');
  var rating = ratingInput ? parseInt(ratingInput.value) : 0;
  if (isNaN(rating) || rating < 1) {
    showToast('请选择期望度');
    return;
  }

  // 使用 HTML 中的 name="cover"
  var coverInput = document.getElementById('edit-wish-cover');
  var platformInput = document.getElementById('edit-wish-platform');
  var priorityInput = document.querySelector('#edit-wishlist-form [name="edit-priority"]');
  var priceInput = document.getElementById('edit-wish-price');
  var notesInput = document.getElementById('edit-wish-notes');

  var list = getWishlist();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].name = name;
      list[i].cover = coverInput ? coverInput.value.trim() : '';
      list[i].platform = platformInput ? platformInput.value : '';
      list[i].rating = rating;
      list[i].priority = priorityInput ? priorityInput.value : 'high';
      list[i].price = priceInput ? priceInput.value.trim() : '';
      list[i].notes = notesInput ? notesInput.value.trim() : '';
      break;
    }
  }

  saveWishlist(list);
  closeEditWishlistModal();
  renderWishlist();
  showToast('愿望单已更新');
}

// ============================================================
// Modal: 删除确认
// ============================================================
function openDeleteConfirmModal(id) {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('data-delete-id', id);
}

function closeDeleteModal() {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function handleDeleteConfirm() {
  var modal = document.getElementById('delete-modal');
  var id = modal ? modal.getAttribute('data-delete-id') : '';
  if (!id) return;

  var list = getWishlist();
  var newList = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      newList.push(list[i]);
    }
  }
  saveWishlist(newList);
  closeDeleteModal();
  renderWishlist();
  showToast('愿望单已删除');
}

// ============================================================
// 事件绑定 & 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  await window.awaitGameCloud();
  // 初始渲染
  renderWishlist();

  // 添加按钮
  var addBtn = document.getElementById('add-wishlist-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddWishlistModal);
  }

  // 搜索
  var searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', renderWishlist);
  }

  // 筛选 & 排序（使用 HTML 中的正确 ID）
  var platformFilter = document.getElementById('platform-filter');
  var priorityFilter = document.getElementById('priority-filter');
  var sortSelect = document.getElementById('sort-by');
  if (platformFilter) { platformFilter.addEventListener('change', renderWishlist); }
  if (priorityFilter) { priorityFilter.addEventListener('change', renderWishlist); }
  if (sortSelect) { sortSelect.addEventListener('change', renderWishlist); }

  // 添加表单提交
  var addForm = document.getElementById('add-wishlist-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddWishlistSubmit);
  }

  // 编辑表单提交
  var editForm = document.getElementById('edit-wishlist-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditWishlistSubmit);
  }

  // 删除确认按钮
  var confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
  }

  // Modal 关闭按钮
  var closeButtons = document.querySelectorAll('.modal-close');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function () {
      var modal = this.closest('.modal');
      if (modal) { modal.style.display = 'none'; }
    });
  }

  // 点击遮罩层关闭
  var modals = document.querySelectorAll('.modal');
  for (var j = 0; j < modals.length; j++) {
    modals[j].addEventListener('click', function (e) {
      if (e.target === this) { this.style.display = 'none'; }
    });
  }

  // Mobile menu toggle
  var menuToggle = document.getElementById('mobile-menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      mobileMenu.classList.toggle('hidden');
    });
  }
});
