// ============================================================
// reviews.js - 娓告垙璇勬祴椤甸潰涓氬姟閫昏緫
// 鏁版嵁瀛樺偍: localStorage key = game_record_reviews
// ============================================================

// ---------- 鏍囩棰勮 ----------
var REVIEW_TAGS = [
  '鍓ф儏浼樼',
  '鐜╂硶鍑轰紬',
  '鐢婚潰绮剧編',
  '闊充箰鍔ㄥ惉',
  '澶氫汉鏈夎叮',
  '浼戦棽鏀炬澗',
  '鎸戞垬鎬у己',
  '鍊煎緱閲嶇帺'
];

// ---------- 鏁版嵁璇诲啓 ----------
function getReviews() {
  return window.GameData.get(window.GameData.KEYS.REVIEWS, []);
}

function saveReviews(list) {
  window.GameData.set(window.GameData.KEYS.REVIEWS, list);
}

// ---------- 娓告垙閫夋嫨鍣?----------
function populateReviewGameSelect(selectEl, selectedId) {
  if (!selectEl || !window.GameData) return;
  window.GameData.populateGameSelect(selectEl, { placeholder: '閫夋嫨娓告垙搴撲腑鐨勬父鎴? });
  if (selectedId != null && selectedId !== '') {
    selectEl.value = String(selectedId);
  }
}

function getSelectedReviewGameFields(selectEl) {
  var gameId = selectEl ? selectEl.value : '';
  if (!gameId) return null;
  return window.GameData.resolveGameFieldsFromSelect(gameId);
}

function showToast(message, type) {
  type = type || 'info';
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.className = 'toast ' + type + ' show';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

// ---------- 鏄熺骇璇勫垎浜や簰 ----------
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

// ---------- 灏侀潰鐢熸垚 ----------
function getReviewCoverHtml(url, name) {
  return imgWithFallback(url, name, 'review-cover-img');
}

// ---------- 鏄熺骇娓叉煋 ----------
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

// ---------- 鏍囩澶氶€夛紙娣诲姞/缂栬緫琛ㄥ崟锛?----------
function syncTagOptionVisual(optionEl) {
  if (!optionEl) return;
  var cb = optionEl.querySelector('.tag-checkbox');
  if (!cb) return;
  if (cb.checked) {
    optionEl.classList.add('active');
  } else {
    optionEl.classList.remove('active');
  }
}

function syncTagOptionsInForm(formSelector) {
  var tagOptions = document.querySelectorAll(formSelector + ' .tag-option');
  for (var i = 0; i < tagOptions.length; i++) {
    syncTagOptionVisual(tagOptions[i]);
  }
}

function bindReviewTagGroup(groupId) {
  var group = document.getElementById(groupId);
  if (!group || group.dataset.tagBound === '1') return;
  group.dataset.tagBound = '1';

  group.addEventListener('click', function (e) {
    var option = e.target.closest('.tag-option');
    if (!option || !group.contains(option)) return;
    var cb = option.querySelector('.tag-checkbox');
    if (!cb) return;
    if (e.target === cb) return;
    e.preventDefault();
    cb.checked = !cb.checked;
    syncTagOptionVisual(option);
  });

  var checkboxes = group.querySelectorAll('.tag-checkbox');
  for (var j = 0; j < checkboxes.length; j++) {
    (function (checkbox) {
      checkbox.addEventListener('change', function () {
        var parentOption = checkbox.closest('.tag-option');
        syncTagOptionVisual(parentOption);
      });
    })(checkboxes[j]);
  }
}

// ---------- 鏍囩鑽父 ----------
function renderTags(tags) {
  if (!tags || !tags.length) return '';
  var html = '';
  for (var i = 0; i < tags.length; i++) {
    html += '<span class="tag-pill">' + escapeHtml(tags[i]) + '</span>';
  }
  return html;
}

// ---------- 鑾峰彇鎵€鏈夊凡鏈夌殑鏍囩锛堢敤浜庡姩鎬佺瓫閫変笅鎷夛級 ----------
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

// ---------- 鏇存柊鏍囩绛涢€変笅鎷?----------
function updateTagFilter() {
  var tagFilter = document.getElementById('tag-filter');
  if (!tagFilter) return;

  var usedTags = getAllUsedTags();
  var currentVal = tagFilter.value;

  var html = '<option value="all">鍏ㄩ儴鏍囩</option>';
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

// ---------- 娓叉煋璇勬祴鍒楄〃 ----------
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
    html += '        <button class="btn-edit-review" data-id="' + item.id + '" title="缂栬緫"><i data-lucide="pencil"></i></button>';
    html += '        <button class="btn-delete-review" data-id="' + item.id + '" title="鍒犻櫎"><i data-lucide="trash-2"></i></button>';
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
      html += '      <span class="review-playtime">鏃堕暱: ' + escapeHtml(String(playtime)) + ' 灏忔椂</span>';
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

  // 缁戝畾缂栬緫/鍒犻櫎鎸夐挳
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
// Modal: 娣诲姞璇勬祴
// ============================================================
function openAddReviewModal() {
  var modal = document.getElementById('add-review-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  var form = document.getElementById('add-review-form');
  if (form) { form.reset(); }
  populateReviewGameSelect(document.getElementById('review-game'));
  var tagCheckboxes = document.querySelectorAll('#add-tags-group .tag-checkbox');
  for (var i = 0; i < tagCheckboxes.length; i++) {
    tagCheckboxes[i].checked = false;
  }
  syncTagOptionsInForm('#add-review-form');
  // 榛樿3鏄?- 浣跨敤 hidden input + 鏄熸槦浜や簰
  setAddRating(3);
}

function closeAddReviewModal() {
  var modal = document.getElementById('add-review-modal');
  if (!modal) return;
  modal.style.display = 'none';
}

function handleAddReviewSubmit(e) {
  e.preventDefault();

  var gameSelect = document.getElementById('review-game');
  var gameFields = getSelectedReviewGameFields(gameSelect);
  if (!gameFields || !gameFields.gameId) {
    showToast('璇蜂粠娓告垙搴撻€夋嫨娓告垙');
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
    gameId: gameFields.gameId,
    name: gameFields.name,
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
  showToast('璇勬祴宸叉坊鍔?);
}

// ============================================================
// Modal: 缂栬緫璇勬祴
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

  populateReviewGameSelect(document.getElementById('edit-review-game'), item.gameId);

  var coverInput = document.querySelector('#edit-review-form [name="cover"]');
  var reviewInput = document.querySelector('#edit-review-form [name="comment"]');
  var playtimeInput = document.querySelector('#edit-review-form [name="hours"]');
  var notesInput = document.querySelector('#edit-review-form [name="notes"]');

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
  syncTagOptionsInForm('#edit-review-form');
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

  var gameSelect = document.getElementById('edit-review-game');
  var gameFields = getSelectedReviewGameFields(gameSelect);
  if (!gameFields || !gameFields.gameId) {
    showToast('璇蜂粠娓告垙搴撻€夋嫨娓告垙');
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
      list[j].gameId = gameFields.gameId;
      list[j].name = gameFields.name;
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
  showToast('璇勬祴宸叉洿鏂?);
}

// ============================================================
// Modal: 鍒犻櫎纭
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
  showToast('璇勬祴宸插垹闄?);
}

// ============================================================
// 鐢熸垚鏍囩澶嶉€夋 HTML锛堢敤浜?Modal 琛ㄥ崟锛?// ============================================================
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
// 浜嬩欢缁戝畾 & 鍒濆鍖?// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  await window.awaitGameCloud();
  populateReviewGameSelect(document.getElementById('review-game'));
  populateReviewGameSelect(document.getElementById('edit-review-game'));
  // 鍒濆娓叉煋
  renderReviews();

  // 娣诲姞鎸夐挳
  var addBtn = document.getElementById('add-review-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddReviewModal);
  }

  // 鎼滅储
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

  // 娣诲姞琛ㄥ崟鎻愪氦
  var addForm = document.getElementById('add-review-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddReviewSubmit);
  }

  // 缂栬緫琛ㄥ崟鎻愪氦
  var editForm = document.getElementById('edit-review-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditReviewSubmit);
  }

  // 鍒犻櫎纭鎸夐挳
  var confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
  }

  // Modal 鍏抽棴鎸夐挳
  var closeButtons = document.querySelectorAll('.modal-close');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function () {
      var modal = this.closest('.modal');
      if (modal) { modal.style.display = 'none'; }
    });
  }

  // 鐐瑰嚮閬僵灞傚叧闂?  var modals = document.querySelectorAll('.modal');
  for (var j = 0; j < modals.length; j++) {
    modals[j].addEventListener('click', function (e) {
      if (e.target === this) { this.style.display = 'none'; }
    });
  }

  bindReviewTagGroup('add-tags-group');
  bindReviewTagGroup('edit-tags-group');

});
