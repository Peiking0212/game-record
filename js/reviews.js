// ============================================================
// reviews.js - 游戏评测页面业务逻辑
// 数据存储: localStorage key = game_record_reviews
// ============================================================

// ---------- 标签预设 ----------
var REVIEW_TAGS = [
  '剧情优秀',
  '玩法出众',
  '画面精美',
  '音乐动听',
  '多人有趣',
  '休闲放松',
  '挑战性强',
  '值得重玩'
];

// ---------- 数据读写 ----------
function getReviews() {
  return window.GameData.get(window.GameData.KEYS.REVIEWS, []);
}

function saveReviews(list) {
  window.GameData.set(window.GameData.KEYS.REVIEWS, list);
}

// ---------- 工具函数 ----------

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

// ---------- 星级评分交互 ----------
function setAddRating(val) {
  var hiddenInput = document.getElementById('add-review-rating');
  if (hiddenInput) hiddenInput.value = val;
  var stars = document.querySelectorAll('#add-rating-select .add-rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
    }
  }
}

function setEditRating(val) {
  var hiddenInput = document.getElementById('edit-review-rating');
  if (hiddenInput) hiddenInput.value = val;
  var stars = document.querySelectorAll('#edit-rating-select .edit-rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
    }
  }
}

// ---------- 封面生成 ----------
function getReviewCoverHtml(url, name) {
  return imgWithFallback(url, name, 'review-cover-img');
}

// ---------- 星级渲染 ----------
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

// ---------- 标签药丸 ----------
function renderTags(tags) {
  if (!tags || !tags.length) return '';
  var html = '';
  for (var i = 0; i < tags.length; i++) {
    html += '<span class="tag-pill">' + escapeHtml(tags[i]) + '</span>';
  }
  return html;
}

// ---------- 获取所有已有的标签（用于动态筛选下拉） ----------
function getAllUsedTags() {
  var list = getReviews();
  var tagSet = {};
  for (var i = 0; i < list.length; i++) {
    var tags = list[i].tags || [];
    for (var j = 0; j < tags.length; j++) {
      tagSet[tags[j]] = true;
    }
  }
  var result = [];
  for (var key in tagSet) {
    if (tagSet.hasOwnProperty(key)) {
      result.push(key);
    }
  }
  return result;
}

// ---------- 更新标签筛选下拉 ----------
function updateTagFilter() {
  var tagFilter = document.getElementById('tag-filter');
  if (!tagFilter) return;

  var usedTags = getAllUsedTags();
  var currentVal = tagFilter.value;

  var html = '<option value="all">全部标签</option>';
  for (var i = 0; i < REVIEW_TAGS.length; i++) {
    var selected = REVIEW_TAGS[i] === currentVal ? ' selected' : '';
    html += '<option value="' + escapeHtml(REVIEW_TAGS[i]) + '"' + selected + '>' + escapeHtml(REVIEW_TAGS[i]) + '</option>';
  }
  for (var j = 0; j < usedTags.length; j++) {
    if (REVIEW_TAGS.indexOf(usedTags[j]) === -1) {
      var sel2 = usedTags[j] === currentVal ? ' selected' : '';
      html += '<option value="' + escapeHtml(usedTags[j]) + '"' + sel2 + '>' + escapeHtml(usedTags[j]) + '</option>';
    }
  }

  tagFilter.innerHTML = html;
}

// ---------- 渲染评测列表 ----------
function renderReviews() {
  var container = document.getElementById('reviews-list');
  var emptyState = document.getElementById('empty-state');
  if (!container) return;

  var list = getReviews();

  var searchInput = document.getElementById('search');
  if (searchInput && searchInput.value.trim() !== '') {
    var keyword = searchInput.value.trim().toLowerCase();
    list = list.filter(function (item) {
      return item.name && item.name.toLowerCase().indexOf(keyword) !== -1;
    });
  }

  var ratingFilter = document.getElementById('rating-filter');
  if (ratingFilter && ratingFilter.value && ratingFilter.value !== 'all') {
    var ratingVal = parseInt(ratingFilter.value, 10);
    list = list.filter(function (item) {
      return (item.rating || 0) === ratingVal;
    });
  }

  var tagFilter = document.getElementById('tag-filter');
  if (tagFilter && tagFilter.value && tagFilter.value !== 'all') {
    var tagVal = tagFilter.value;
    list = list.filter(function (item) {
      return item.tags && item.tags.indexOf(tagVal) !== -1;
    });
  }

  var sortSelect = document.getElementById('sort-by');
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
        case 'hours-desc':
          return (parseFloat(b.playtime || b.hours) || 0) - (parseFloat(a.playtime || a.hours) || 0);
        case 'hours-asc':
          return (parseFloat(a.playtime || a.hours) || 0) - (parseFloat(b.playtime || b.hours) || 0);
        default:
          return 0;
      }
    });
  }

  updateTagFilter();

  if (list.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var reviewText = item.review || item.comment || '';
    var playtime = item.playtime !== undefined && item.playtime !== null && item.playtime !== ''
      ? item.playtime
      : item.hours;
    html += '<div class="review-card" data-id="' + item.id + '">';
    html += '  <div class="review-cover">' + getReviewCoverHtml(item.coverUrl || item.cover, item.name) + '</div>';
    html += '  <div class="review-info">';
    html += '    <div class="review-info-header">';
    html += '      <h3 class="review-name">' + escapeHtml(item.name) + '</h3>';
    html += '      <div class="review-actions">';
    html += '        <button class="btn-edit-review" data-id="' + item.id + '" title="编辑"><i data-lucide="pencil"></i></button>';
    html += '        <button class="btn-delete-review" data-id="' + item.id + '" title="删除"><i data-lucide="trash-2"></i></button>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="review-stars">' + renderStars(item.rating || 0) + '</div>';
    if (item.tags && item.tags.length > 0) {
      html += '    <div class="review-tags">' + renderTags(item.tags) + '</div>';
    }
    if (reviewText) {
      html += '    <p class="review-text">' + escapeHtml(reviewText) + '</p>';
    }
    html += '    <div class="review-meta">';
    if (playtime !== undefined && playtime !== null && playtime !== '') {
      html += '      <span class="review-playtime">时长: ' + escapeHtml(String(playtime)) + ' 小时</span>';
    }
    html += '      <span class="review-date">' + formatDate(item.date) + '</span>';
    html += '    </div>';
    if (item.notes) {
      html += '    <p class="review-notes">' + escapeHtml(item.notes) + '</p>';
    }
    html += '  </div>';
    html += '</div>';
  }

  container.innerHTML = html;
  if (window.lucide) { lucide.createIcons(); }

  // 绑定编辑/删除按钮
  var editBtns = container.querySelectorAll('.btn-edit-review');
  for (var j = 0; j < editBtns.length; j++) {
    editBtns[j].addEventListener('click', function () {
      openEditReviewModal(this.getAttribute('data-id'));
    });
  }

  var deleteBtns = container.querySelectorAll('.btn-delete-review');
  for (var k = 0; k < deleteBtns.length; k++) {
    deleteBtns[k].addEventListener('click', function () {
      openDeleteModal(this.getAttribute('data-id'));
    });
  }
}

// ============================================================
// Modal: 添加评测
// ============================================================
function openAddReviewModal() {
  var modal = document.getElementById('add-review-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  var form = document.getElementById('add-review-form');
  if (form) { form.reset(); }
  var tagCheckboxes = document.querySelectorAll('#add-tags-group .tag-checkbox');
  for (var i = 0; i < tagCheckboxes.length; i++) {
    tagCheckboxes[i].checked = false;
  }
  // 重置标签视觉样式
  var tagOptions = document.querySelectorAll('#add-review-form .tag-option');
  for (var k = 0; k < tagOptions.length; k++) {
    tagOptions[k].classList.remove('active');
  }
  // 默认3星 - 使用 hidden input + 星星交互
  setAddRating(3);
}

function closeAddReviewModal() {
  var modal = document.getElementById('add-review-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function handleAddReviewSubmit(e) {
  e.preventDefault();

  var nameInput = document.querySelector('#add-review-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  var coverInput = document.querySelector('#add-review-form [name="cover"]');
  var ratingInput = document.getElementById('add-review-rating');
  var reviewInput = document.querySelector('#add-review-form [name="comment"]');
  var playtimeInput = document.querySelector('#add-review-form [name="hours"]');
  var notesInput = document.querySelector('#add-review-form [name="notes"]');

  var tagCheckboxes = document.querySelectorAll('#add-tags-group .tag-checkbox:checked');
  var tags = [];
  for (var i = 0; i < tagCheckboxes.length; i++) {
    tags.push(tagCheckboxes[i].value);
  }

  var newItem = {
    id: 'rv_' + Date.now(),
    name: name,
    coverUrl: coverInput ? coverInput.value.trim() : '',
    rating: ratingInput ? parseInt(ratingInput.value) : 3,
    tags: tags,
    review: reviewInput ? reviewInput.value.trim() : '',
    playtime: playtimeInput ? playtimeInput.value.trim() : '',
    notes: notesInput ? notesInput.value.trim() : '',
    date: new Date().toISOString()
  };

  var list = getReviews();
  list.push(newItem);
  saveReviews(list);
  closeAddReviewModal();
  renderReviews();
  showToast('评测已添加');
}

// ============================================================
// Modal: 编辑评测
// ============================================================
function openEditReviewModal(id) {
  var modal = document.getElementById('edit-review-modal');
  if (!modal) return;

  var list = getReviews();
  var item = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { item = list[i]; break; }
  }
  if (!item) return;

  modal.style.display = 'flex';
  modal.setAttribute('data-edit-id', id);

  var nameInput = document.querySelector('#edit-review-form [name="name"]');
  var coverInput = document.querySelector('#edit-review-form [name="cover"]');
  var reviewInput = document.querySelector('#edit-review-form [name="comment"]');
  var playtimeInput = document.querySelector('#edit-review-form [name="hours"]');
  var notesInput = document.querySelector('#edit-review-form [name="notes"]');

  if (nameInput) nameInput.value = item.name;
  if (coverInput) coverInput.value = item.coverUrl || item.cover || '';
  if (reviewInput) reviewInput.value = item.review || item.comment || '';
  if (playtimeInput) playtimeInput.value = item.playtime || item.hours || '';
  if (notesInput) notesInput.value = item.notes || '';

  var rating = item.rating || 3;
  setEditRating(rating);

  var tagCheckboxes = document.querySelectorAll('#edit-tags-group .tag-checkbox');
  var itemTags = item.tags || [];
  for (var k = 0; k < tagCheckboxes.length; k++) {
    tagCheckboxes[k].checked = (itemTags.indexOf(tagCheckboxes[k].value) !== -1);
  }
  // 同步标签视觉样式
  var tagOptions = document.querySelectorAll('#edit-review-form .tag-option');
  for (var m = 0; m < tagOptions.length; m++) {
    var cb = tagOptions[m].querySelector('input[name="tags"]');
    if (cb && cb.checked) {
      tagOptions[m].classList.add('active');
    } else {
      tagOptions[m].classList.remove('active');
    }
  }
}

function closeEditReviewModal() {
  var modal = document.getElementById('edit-review-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function handleEditReviewSubmit(e) {
  e.preventDefault();

  var modal = document.getElementById('edit-review-modal');
  var id = modal ? modal.getAttribute('data-edit-id') : '';
  if (!id) return;

  var nameInput = document.querySelector('#edit-review-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  var coverInput = document.querySelector('#edit-review-form [name="cover"]');
  var ratingInput = document.getElementById('edit-review-rating');
  var reviewInput = document.querySelector('#edit-review-form [name="comment"]');
  var playtimeInput = document.querySelector('#edit-review-form [name="hours"]');
  var notesInput = document.querySelector('#edit-review-form [name="notes"]');

  var tagCheckboxes = document.querySelectorAll('#edit-tags-group .tag-checkbox:checked');
  var tags = [];
  for (var i = 0; i < tagCheckboxes.length; i++) {
    tags.push(tagCheckboxes[i].value);
  }

  var list = getReviews();
  for (var j = 0; j < list.length; j++) {
    if (list[j].id === id) {
      list[j].name = name;
      list[j].coverUrl = coverInput ? coverInput.value.trim() : '';
      list[j].rating = ratingInput ? parseInt(ratingInput.value) : 3;
      list[j].tags = tags;
      list[j].review = reviewInput ? reviewInput.value.trim() : '';
      list[j].playtime = playtimeInput ? playtimeInput.value.trim() : '';
      list[j].notes = notesInput ? notesInput.value.trim() : '';
      break;
    }
  }

  saveReviews(list);
  closeEditReviewModal();
  renderReviews();
  showToast('评测已更新');
}

// ============================================================
// Modal: 删除确认
// ============================================================
function openDeleteModal(id) {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('data-delete-id', id);
}

function closeDeleteModal() {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function handleDeleteConfirm() {
  var modal = document.getElementById('delete-modal');
  var id = modal ? modal.getAttribute('data-delete-id') : '';
  if (!id) return;

  var list = getReviews();
  var newList = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      newList.push(list[i]);
    }
  }
  saveReviews(newList);
  closeDeleteModal();
  renderReviews();
  showToast('评测已删除');
}

// ============================================================
// 生成标签复选框 HTML（用于 Modal 表单）
// ============================================================
function createTagCheckboxesHtml(prefix, selectedTags) {
  selectedTags = selectedTags || [];
  var html = '';
  for (var i = 0; i < REVIEW_TAGS.length; i++) {
    var checked = selectedTags.indexOf(REVIEW_TAGS[i]) !== -1 ? ' checked' : '';
    html += '<label class="tag-checkbox-label">';
    html += '<input type="checkbox" name="tags" value="' + escapeHtml(REVIEW_TAGS[i]) + '"' + checked + '>';
    html += '<span class="tag-checkbox-text">' + escapeHtml(REVIEW_TAGS[i]) + '</span>';
    html += '</label>';
  }
  return html;
}

// ============================================================
// 事件绑定 & 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  await window.awaitGameCloud();
  // 初始渲染
  renderReviews();

  // 添加按钮
  var addBtn = document.getElementById('add-review-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddReviewModal);
  }

  // 搜索
  var searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', renderReviews);
  }

  var ratingFilter = document.getElementById('rating-filter');
  var tagFilter = document.getElementById('tag-filter');
  var sortSelect = document.getElementById('sort-by');
  if (ratingFilter) { ratingFilter.addEventListener('change', renderReviews); }
  if (tagFilter) { tagFilter.addEventListener('change', renderReviews); }
  if (sortSelect) { sortSelect.addEventListener('change', renderReviews); }

  // 添加表单提交
  var addForm = document.getElementById('add-review-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddReviewSubmit);
  }

  // 编辑表单提交
  var editForm = document.getElementById('edit-review-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditReviewSubmit);
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

});
