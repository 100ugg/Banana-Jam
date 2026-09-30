/*
 * WzIcons - the icon choices for the theme: the fruits, "None", and your own
 * uploaded icons. Used by the game window and (as a copy) by the launcher.
 *
 * An icon choice is saved as one short text value:
 *   "banana.png"     one of the built-in fruits
 *   "none"           no icon
 *   "custom:<id>"    one of your own icons (the picture is kept in localStorage)
 */
(function () {
  if (window.WzIcons) return;

  const KEY = 'wzCustomIcons';
  const MAX_ICONS = 24;
  const SIZE = 256; // pictures are shrunk to fit this

  const FRUITS = [
    ['banana.png', 'Banana'], ['strawberry.png', 'Strawberry'], ['blueberry.png', 'Blueberry'],
    ['cantaloupe.png', 'Cantaloupe'], ['coconut.png', 'Coconut'], ['dragonfruit.png', 'Dragonfruit'],
    ['pineapple.png', 'Pineapple'], ['pumpkin.png', 'Pumpkin']
  ];
  const DEFAULT = 'banana.png';
  const isData = (v) => typeof v === 'string' && v.length < 2000000 &&
    /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

  function list() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw)
        ? raw.filter((i) => i && typeof i.id === 'string' && isData(i.data))
          .map((i) => ({ id: i.id, name: typeof i.name === 'string' && i.name.trim() ? i.name.slice(0, 30) : 'My icon', data: i.data }))
        : [];
    } catch (e) { return []; }
  }
  function saveList(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { return false; }
    notify();
    return true;
  }
  const listeners = [];
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function notify() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }

  function find(id) { return list().find((i) => i.id === id) || null; }

  function isValid(key) {
    if (key === 'none') return true;
    if (FRUITS.some((f) => f[0] === key)) return true;
    if (typeof key === 'string' && key.indexOf('custom:') === 0) return !!find(key.slice(7));
    return false;
  }

  // picture address for a choice ('' = no icon). base is where the fruit pictures live.
  function src(key, base) {
    base = typeof base === 'string' ? base : 'images/';
    if (key === 'none') return '';
    if (typeof key === 'string' && key.indexOf('custom:') === 0) {
      const icon = find(key.slice(7));
      return icon ? icon.data : base + DEFAULT;
    }
    return base + (FRUITS.some((f) => f[0] === key) ? key : DEFAULT);
  }

  function nameOf(key) {
    if (key === 'none') return 'None';
    if (typeof key === 'string' && key.indexOf('custom:') === 0) {
      const icon = find(key.slice(7));
      return icon ? icon.name : 'My icon';
    }
    const f = FRUITS.find((x) => x[0] === key);
    return f ? f[1] : 'Banana';
  }

  // shrink a picture file to a square-ish icon and keep see-through parts
  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type || '')) { reject(new Error('That file is not a picture.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('That file is not a picture I can use.'));
        img.onload = () => {
          const scale = Math.min(1, SIZE / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // add a picture (data URL). Gives back the choice value, e.g. "custom:abc123".
  function addData(data, name) {
    if (!isData(data)) return null;
    const items = list();
    const same = items.find((i) => i.data === data);
    if (same) return 'custom:' + same.id;
    if (items.length >= MAX_ICONS) throw new Error(`You can keep up to ${MAX_ICONS} icons. Delete one first.`);
    const icon = { id: makeId(), name: (name || 'My icon').toString().slice(0, 30), data };
    items.push(icon);
    if (!saveList(items)) throw new Error('Not enough space to save that icon. Try a smaller picture.');
    return 'custom:' + icon.id;
  }

  async function addFile(file) {
    const data = await readFile(file);
    const name = (file.name || 'My icon').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'My icon';
    return addData(data, name);
  }

  function remove(id) {
    const items = list().filter((i) => i.id !== id);
    return saveList(items);
  }

  // for presets: the picture travels with the preset when it is one of your own
  function exportIcon(key) {
    if (typeof key !== 'string' || key.indexOf('custom:') !== 0) return null;
    const icon = find(key.slice(7));
    return icon ? { name: icon.name, data: icon.data } : null;
  }
  function importIcon(key, icon) {
    if (typeof key === 'string' && key.indexOf('custom:') === 0) {
      if (find(key.slice(7))) return key;
      if (icon && isData(icon.data)) {
        try { return addData(icon.data, icon.name) || DEFAULT; } catch (e) { return DEFAULT; }
      }
      return DEFAULT;
    }
    return isValid(key) ? key : DEFAULT;
  }

  // fill a <select> with every choice, keeping what was chosen
  function fillSelect(select, keep) {
    if (!select) return;
    const want = keep !== undefined ? keep : select.value;
    select.innerHTML = '';
    const add = (parent, value, text) => {
      const o = document.createElement('option');
      o.value = value; o.textContent = text;
      parent.appendChild(o);
    };
    add(select, 'none', 'None');
    const fruits = document.createElement('optgroup');
    fruits.label = 'Fruits';
    FRUITS.forEach((f) => add(fruits, f[0], f[1]));
    select.appendChild(fruits);
    const mine = list();
    if (mine.length) {
      const group = document.createElement('optgroup');
      group.label = 'My icons';
      mine.forEach((i) => add(group, 'custom:' + i.id, i.name));
      select.appendChild(group);
    }
    select.value = isValid(want) ? want : DEFAULT;
  }

  window.WzIcons = {
    FRUITS, DEFAULT, list, find, isValid, src, nameOf,
    addFile, addData, remove, exportIcon, importIcon, fillSelect, onChange, readFile
  };
})();
