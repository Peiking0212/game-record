/**
 * 云端同步：将 localStorage 中的站点数据同步到 Supabase，任何人打开同一网址都能看到。
 * 需先配置 js/supabase.js 并在 Supabase 执行 supabase-migration.sql
 */
(function () {
    'use strict';

    var SITE_TABLE = 'site_data';
    var MEDIA_TABLE = 'media';
    var MEDIA_BUCKET = 'media';

    var FALLBACK_SYNC_KEYS = [
        'games', 'achievements', 'profile',
        'game_record_wishlist', 'game_record_reviews', 'game_record_spending', 'memos',
        'game_record_theme', 'mascot_quotes', 'mascot_enabled', 'auto_time_bg', 'site_video_bg'
    ];

    function getSyncKeys() {
        if (window.GameData && window.GameData.SYNC_KEYS) {
            return window.GameData.SYNC_KEYS;
        }
        return FALLBACK_SYNC_KEYS;
    }

    function getArraySyncKeys() {
        if (window.GameData && window.GameData.ARRAY_SYNC_KEYS) {
            return window.GameData.ARRAY_SYNC_KEYS;
        }
        return ['games', 'achievements', 'game_record_wishlist', 'game_record_reviews', 'game_record_spending', 'memos'];
    }

    function getObjectSyncKeys() {
        if (window.GameData && window.GameData.OBJECT_SYNC_KEYS) {
            return window.GameData.OBJECT_SYNC_KEYS;
        }
        return ['profile', 'game_record_theme'];
    }

    function getRawStringSyncKeys() {
        if (window.GameData && window.GameData.RAW_STRING_SYNC_KEYS) {
            return window.GameData.RAW_STRING_SYNC_KEYS;
        }
        return ['mascot_enabled', 'auto_time_bg', 'site_video_bg'];
    }

    function isRawStringSyncKey(key) {
        return getRawStringSyncKeys().indexOf(key) !== -1;
    }

    function parseLocalValue(key, raw) {
        if (raw === null) return null;
        if (isRawStringSyncKey(key)) return raw;
        return parseJson(raw, null);
    }

    function serializeLocalValue(key, value) {
        if (value === null || value === undefined) return null;
        if (isRawStringSyncKey(key)) return String(value);
        return JSON.stringify(value);
    }

    function mergeRecordsById(localList, cloudList) {
        var map = {};
        (cloudList || []).forEach(function (item) {
            if (item && item.id != null) map[String(item.id)] = item;
        });
        (localList || []).forEach(function (item) {
            if (item && item.id != null) map[String(item.id)] = item;
        });
        return Object.values(map);
    }

    function mergeStringQuotes(localList, cloudList) {
        var seen = {};
        var out = [];
        (cloudList || []).concat(localList || []).forEach(function (item) {
            var s = String(item || '').trim();
            if (!s || seen[s]) return;
            seen[s] = true;
            out.push(s);
        });
        return out;
    }

    function mergePullData(key, localVal, cloudVal) {
        if (cloudVal === null || cloudVal === undefined) return localVal;
        if (localVal === null || localVal === undefined) return cloudVal;

        if (key === 'mascot_quotes') {
            return mergeStringQuotes(localVal, cloudVal);
        }
        if (getArraySyncKeys().indexOf(key) !== -1) {
            return mergeRecordsById(localVal, cloudVal);
        }
        if (getObjectSyncKeys().indexOf(key) !== -1) {
            return Object.assign({}, cloudVal, localVal);
        }
        if (isRawStringSyncKey(key)) {
            return localVal !== '' ? localVal : cloudVal;
        }
        return cloudVal;
    }

    var pushTimers = {};
    var readyResolve;
    var readyReject;

    function parseJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function compressImage(dataUrl, maxWidth, quality) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var width = img.width;
                var height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality || 0.9));
            };
            img.onerror = function () { resolve(dataUrl); };
            img.src = dataUrl;
        });
    }

    function generateThumbnail(imageUrl, maxWidth) {
        maxWidth = maxWidth || 1080;
        return new Promise(function (resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var scale = Math.min(1, maxWidth / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = function () { resolve(imageUrl); };
            img.src = imageUrl;
        });
    }

    function dataURLtoBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = parts[0].match(/:(.*?);/)[1];
        var bstr = atob(parts[1]);
        var n = bstr.length;
        var u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        return new Blob([u8], { type: mime });
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function showCloudToast(message, type) {
        if (typeof showToast === 'function') {
            showToast(message, type || 'info');
            return;
        }
        console.log('[GameCloud]', message);
    }

    window.GameCloud = {
        enabled: false,
        ready: new Promise(function (resolve, reject) {
            readyResolve = resolve;
            readyReject = reject;
        }),

        init: function () {
            var self = this;
            if (!window.SB) {
                readyResolve();
                return;
            }
            self.enabled = true;
            self.hookLocalStorage();
            self.pullFromCloud()
                .then(function () {
                    showCloudToast('已连接云端，数据将与访客同步', 'success');
                    readyResolve();
                })
                .catch(function (err) {
                    console.error('云端拉取失败，使用本地数据:', err);
                    showCloudToast('云端暂不可用，仅保存在本机', 'error');
                    readyResolve();
                });
        },

        hookLocalStorage: function () {
            if (Storage.prototype.__gameCloudHooked) return;
            Storage.prototype.__gameCloudHooked = true;
            var orig = Storage.prototype.setItem;
            var self = this;
            Storage.prototype.setItem = function (key, value) {
                orig.call(this, key, value);
                if (self.enabled && getSyncKeys().indexOf(key) !== -1) {
                    self.schedulePush(key);
                }
            };
        },

        schedulePush: function (key) {
            var self = this;
            if (pushTimers[key]) clearTimeout(pushTimers[key]);
            pushTimers[key] = setTimeout(function () {
                self.pushKey(key);
            }, 600);
        },

        pushAllLocal: async function () {
            var keys = getSyncKeys();
            for (var i = 0; i < keys.length; i++) {
                await this.pushKey(keys[i]);
            }
        },

        pullFromCloud: async function () {
            var result = await window.SB.from(SITE_TABLE).select('key, data');
            if (result.error) throw result.error;
            var rows = result.data || [];

            if (rows.length === 0) {
                var hasLocal = getSyncKeys().some(function (key) {
                    return localStorage.getItem(key) != null;
                });
                if (hasLocal) {
                    await this.pushAllLocal();
                    showCloudToast('已将本机数据备份到云端', 'success');
                    return;
                }
            }

            var cloudMap = {};
            rows.forEach(function (row) {
                if (getSyncKeys().indexOf(row.key) !== -1) {
                    cloudMap[row.key] = row.data;
                }
            });

            var syncKeys = getSyncKeys();
            syncKeys.forEach(function (key) {
                if (cloudMap[key] === undefined) return;
                var localRaw = localStorage.getItem(key);
                var localVal = parseLocalValue(key, localRaw);
                var merged = mergePullData(key, localVal, cloudMap[key]);
                var serialized = serializeLocalValue(key, merged);
                if (serialized !== null) {
                    localStorage.setItem(key, serialized);
                }
            });

            for (var i = 0; i < syncKeys.length; i++) {
                var missingKey = syncKeys[i];
                if (cloudMap[missingKey] === undefined && localStorage.getItem(missingKey) != null) {
                    await this.pushKey(missingKey);
                }
            }
        },

        prepareProfileForCloud: async function (profile) {
            if (!profile || typeof profile !== 'object') return profile;
            var p = Object.assign({}, profile);
            var av = p.avatar;
            if (!av || typeof av !== 'string') return p;
            if (av.indexOf('http://') === 0 || av.indexOf('https://') === 0) return p;
            if (av.indexOf('data:image') !== 0 && av.indexOf('assets/') === 0) return p;

            if (!window.SB) {
                if (av.indexOf('data:image') === 0) {
                    p.avatar = await compressImage(av, 256, 0.82);
                }
                return p;
            }

            try {
                var small = await compressImage(av, 512, 0.85);
                var blob = dataURLtoBlob(small);
                var path = 'avatars/profile.jpg';
                var up = await window.SB.storage.from(MEDIA_BUCKET).upload(path, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });
                if (up.error) throw up.error;
                p.avatar = window.SB.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
            } catch (e) {
                console.warn('头像上传云端失败，改用压缩图保存:', e);
                if (av.indexOf('data:image') === 0) {
                    p.avatar = await compressImage(av, 256, 0.82);
                }
            }
            return p;
        },

        pushKey: async function (key) {
            if (!window.SB || getSyncKeys().indexOf(key) === -1) return false;
            var raw = localStorage.getItem(key);
            if (raw === null) return false;
            try {
                var payload = isRawStringSyncKey(key) ? raw : parseJson(raw, null);
                if (payload === null && raw) payload = raw;
                if (key === 'profile' && payload && typeof payload === 'object') {
                    payload = await this.prepareProfileForCloud(payload);
                }
                var upsert = await window.SB.from(SITE_TABLE).upsert({
                    key: key,
                    data: payload,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
                if (upsert.error) throw upsert.error;
                return true;
            } catch (e) {
                console.error('云端保存失败:', key, e);
                return false;
            }
        },

        fetchMedia: async function () {
            if (!window.SB) {
                return parseJson(localStorage.getItem('game_record_media'), []);
            }
            try {
                var result = await window.SB
                    .from(MEDIA_TABLE)
                    .select('*')
                    .order('created_at', { ascending: false });
                if (result.error) throw result.error;
                var list = (result.data || []).map(function (row) {
                    return {
                        id: row.id,
                        type: row.type,
                        url: row.url,
                        name: row.name,
                        gameName: row.game_name || '',
                        time: row.created_at,
                        thumbnail: row.thumbnail || null
                    };
                });
                localStorage.setItem('game_record_media', JSON.stringify(list));
                return list;
            } catch (e) {
                console.error('获取云端媒体失败:', e);
                return parseJson(localStorage.getItem('game_record_media'), []);
            }
        },

        uploadMedia: async function (file, type, gameName) {
            if (!window.SB) return false;
            gameName = gameName || '';
            var id = generateId();
            var ext = (file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
            var storagePath = id + '.' + ext;

            if (type === 'image') {
                var dataUrl = await new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function (e) { resolve(e.target.result); };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                var compressed = await compressImage(dataUrl, 1920, 0.9);
                var thumb = await generateThumbnail(compressed);
                var blob = dataURLtoBlob(compressed);
                var up = await window.SB.storage.from(MEDIA_BUCKET).upload(storagePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });
                if (up.error) throw up.error;
                var thumbPath = 'thumb_' + id + '.jpg';
                await window.SB.storage.from(MEDIA_BUCKET).upload(thumbPath, dataURLtoBlob(thumb), {
                    contentType: 'image/jpeg',
                    upsert: true
                });
                var publicUrl = window.SB.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
                var thumbUrl = window.SB.storage.from(MEDIA_BUCKET).getPublicUrl(thumbPath).data.publicUrl;
                var ins = await window.SB.from(MEDIA_TABLE).insert({
                    id: id,
                    type: 'image',
                    url: publicUrl,
                    thumbnail: thumbUrl,
                    name: file.name,
                    game_name: gameName
                });
                if (ins.error) throw ins.error;
            } else {
                var upv = await window.SB.storage.from(MEDIA_BUCKET).upload(storagePath, file, {
                    contentType: file.type || 'video/mp4',
                    upsert: true
                });
                if (upv.error) throw upv.error;
                var publicUrlV = window.SB.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
                var insv = await window.SB.from(MEDIA_TABLE).insert({
                    id: id,
                    type: 'video',
                    url: publicUrlV,
                    thumbnail: null,
                    name: file.name,
                    game_name: gameName
                });
                if (insv.error) throw insv.error;
            }
            return true;
        }
    };

    window.awaitGameCloud = function () {
        return window.GameCloud ? window.GameCloud.ready : Promise.resolve();
    };

    window.GameCloud.init();
})();
