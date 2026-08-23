(() => {
  const cfg = window.SITE_CONFIG;
  const PASSWORD_KEY = 'cc_admin_password';
  const newId = () => `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const state = {
    galleries: { featured: [], studio: [], stones: [], silverRings: [] },
    background: [],
    paintings: [],
    collaborator: { photo: '', headline: '', bio: '' },
    bio: { photo: '' },
  };

  function authHeaders() {
    return { 'x-admin-password': sessionStorage.getItem(PASSWORD_KEY) || '' };
  }

  /* ---------------- Image compression ---------------- */
  // Resize/compress in the browser so uploads stay well under the 4.5MB
  // serverless body limit and load fast on the public site.
  function compressImage(file, maxDimension = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(file, folder) {
    const dataUrl = await compressImage(file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dataUrl, folder }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Surface the real reason (e.g. "No Blob store connected") instead of a
      // generic failure, so setup problems are self-explanatory.
      const message = [body.error, body.detail].filter(Boolean).join(': ') || `Upload failed (${res.status})`;
      throw new Error(message);
    }
    const { url } = await res.json();
    return url;
  }

  /* ---------------- Gallery editor rendering ---------------- */
  function renderGallery(key) {
    const meta = cfg.galleries[key];
    const container = document.getElementById(`gallery-grid-${key}`);
    container.innerHTML = '';

    state.galleries[key].forEach((url, index) => {
      const slot = document.createElement('div');
      slot.className = 'admin-photo-slot';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `${meta.label} ${index + 1}`;
      slot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'admin-photo-remove';
      removeBtn.setAttribute('aria-label', 'Remove photo');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        state.galleries[key].splice(index, 1);
        renderGallery(key);
      });
      slot.appendChild(removeBtn);
      container.appendChild(slot);
    });

    if (state.galleries[key].length < meta.max) {
      const addSlot = document.createElement('div');
      addSlot.className = 'admin-photo-slot';
      const empty = document.createElement('label');
      empty.className = 'admin-photo-empty';
      empty.innerHTML = `<span class="plus">+</span><small>Upload Photo</small>`;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        empty.classList.add('is-uploading');
        empty.querySelector('small').textContent = 'Uploading…';
        try {
          const url = await uploadFile(file, key);
          state.galleries[key].push(url);
          renderGallery(key);
        } catch (err) {
          empty.classList.remove('is-uploading');
          empty.querySelector('small').textContent = (err && err.message) || 'Failed — try again';
          empty.title = (err && err.message) || '';
        }
      });
      empty.appendChild(input);
      addSlot.appendChild(empty);
      container.appendChild(addSlot);
    }
  }

  function buildGalleryEditors() {
    const root = document.getElementById('admin-galleries');
    Object.keys(cfg.galleries).forEach((key) => {
      const meta = cfg.galleries[key];
      const section = document.createElement('section');
      section.className = 'admin-section';
      section.innerHTML = `
        <h2>${meta.heading}</h2>
        <p class="admin-section-help">Up to ${meta.max} photos.</p>
        <div class="admin-photo-grid" id="gallery-grid-${key}"></div>
      `;
      root.appendChild(section);
    });
    Object.keys(cfg.galleries).forEach(renderGallery);
  }

  /* ---------------- Background slideshow editor ---------------- */
  // Plain photo slots (no per-photo fields), same UX as a gallery but writing
  // to state.background and capped by cfg.background.max.
  function renderBackground() {
    const meta = cfg.background || { max: 20, label: 'Background' };
    const container = document.getElementById('background-grid');
    if (!container) return;
    container.innerHTML = '';

    state.background.forEach((url, index) => {
      const slot = document.createElement('div');
      slot.className = 'admin-photo-slot';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `${meta.label} ${index + 1}`;
      slot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'admin-photo-remove';
      removeBtn.setAttribute('aria-label', 'Remove photo');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        state.background.splice(index, 1);
        renderBackground();
      });
      slot.appendChild(removeBtn);
      container.appendChild(slot);
    });

    if (state.background.length < meta.max) {
      const addSlot = document.createElement('div');
      addSlot.className = 'admin-photo-slot';
      const empty = document.createElement('label');
      empty.className = 'admin-photo-empty';
      empty.innerHTML = `<span class="plus">+</span><small>Upload Photo</small>`;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        empty.classList.add('is-uploading');
        empty.querySelector('small').textContent = 'Uploading…';
        try {
          const url = await uploadFile(file, 'background');
          state.background.push(url);
          renderBackground();
        } catch (err) {
          empty.classList.remove('is-uploading');
          empty.querySelector('small').textContent = (err && err.message) || 'Failed — try again';
          empty.title = (err && err.message) || '';
        }
      });
      empty.appendChild(input);
      addSlot.appendChild(empty);
      container.appendChild(addSlot);
    }
  }

  /* ---------------- Paintings-for-sale editor ---------------- */
  // Each painting is { id, url, title, price, buyUrl, stripePriceId, status }.
  // The typed Price is what a buyer is charged (via /api/checkout), so a photo
  // + price is all a piece needs — the Stripe fields are optional overrides.
  function blankPainting() {
    return { id: newId(), url: '', title: '', price: '', buyUrl: '', stripePriceId: '', status: 'available' };
  }
  let paintingDraft = blankPainting();

  function renderPaintings() {
    const meta = cfg.paintings || { max: 18, label: 'Painting' };
    const container = document.getElementById('paintings-editor');
    if (!container) return;
    container.innerHTML = '';

    state.paintings.forEach((piece, index) => {
      container.appendChild(buildPaintingCard(piece, index, meta));
    });

    // Always show one "add a piece" card with its fields visible, so it's
    // obvious where the work and its price go.
    if (state.paintings.length < meta.max) {
      container.appendChild(buildDraftCard());
    }
  }

  // Builds the editable fields, writing every change straight onto `target`
  // (a saved piece object, or the not-yet-added draft).
  function paintingFields(target) {
    const fields = document.createElement('div');
    fields.className = 'admin-painting-fields';
    fields.innerHTML = `
      <label>Title <input type="text" data-k="title" maxlength="200" placeholder="e.g. Summer Walleye" /></label>
      <label>Price <span class="admin-hint">(shown to buyers &amp; charged at checkout)</span>
        <input type="text" data-k="price" maxlength="60" placeholder="e.g. $1,200" />
      </label>
      <label>Status
        <select data-k="status">
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
        </select>
      </label>
      <details class="admin-advanced">
        <summary>Advanced Stripe options (optional)</summary>
        <label>Stripe Payment Link
          <input type="url" data-k="buyUrl" maxlength="500" placeholder="https://buy.stripe.com/…" />
        </label>
        <label>Stripe Price ID
          <input type="text" data-k="stripePriceId" maxlength="200" placeholder="price_…" />
        </label>
      </details>
    `;
    fields.querySelectorAll('[data-k]').forEach((input) => {
      const key = input.dataset.k;
      input.value = target[key] || (key === 'status' ? 'available' : '');
      const write = () => { target[key] = input.value; };
      input.addEventListener('input', write);
      input.addEventListener('change', write);
    });
    return fields;
  }

  function buildPaintingCard(piece, index, meta) {
    const card = document.createElement('div');
    card.className = 'admin-painting-card';

    const slot = document.createElement('div');
    slot.className = 'admin-photo-slot admin-painting-photo';
    const img = document.createElement('img');
    img.src = piece.url;
    img.alt = piece.title || `${meta.label} ${index + 1}`;
    slot.appendChild(img);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'admin-photo-remove';
    removeBtn.setAttribute('aria-label', 'Remove painting');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      state.paintings.splice(index, 1);
      renderPaintings();
    });
    slot.appendChild(removeBtn);
    card.appendChild(slot);

    card.appendChild(paintingFields(piece));
    return card;
  }

  // The trailing "add a piece" card: fields are always visible so the price
  // spot is obvious; uploading a photo commits the draft as a real piece.
  function buildDraftCard() {
    const card = document.createElement('div');
    card.className = 'admin-painting-card admin-painting-draft';

    const slot = document.createElement('div');
    slot.className = 'admin-photo-slot admin-painting-photo';
    const empty = document.createElement('label');
    empty.className = 'admin-photo-empty';
    empty.innerHTML = `<span class="plus">+</span><small>Add Photo</small>`;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      empty.classList.add('is-uploading');
      empty.querySelector('small').textContent = 'Uploading…';
      try {
        const url = await uploadFile(file, 'paintings');
        paintingDraft.url = url;
        state.paintings.push({ ...paintingDraft });
        paintingDraft = blankPainting();
        renderPaintings();
      } catch (err) {
        empty.classList.remove('is-uploading');
        empty.querySelector('small').textContent = (err && err.message) || 'Failed — try again';
        empty.title = (err && err.message) || '';
      }
    });
    empty.appendChild(input);
    slot.appendChild(empty);
    card.appendChild(slot);

    card.appendChild(paintingFields(paintingDraft));
    return card;
  }

  /* ---------------- Collaborator editor ---------------- */
  function initCollabEditor() {
    document.getElementById('collab-headline-input').value = state.collaborator.headline;
    document.getElementById('collab-bio-input').value = state.collaborator.bio;
    renderCollabPhoto();

    document.getElementById('collab-headline-input').addEventListener('input', (e) => {
      state.collaborator.headline = e.target.value;
    });
    document.getElementById('collab-bio-input').addEventListener('input', (e) => {
      state.collaborator.bio = e.target.value;
    });
  }

  // Generic single-photo-slot editor, shared by the bio photo and the
  // collaborator photo — both are "one optional image" fields rather than
  // galleries. `getPhoto`/`setPhoto` read and write the relevant state slice.
  function renderSinglePhoto(slotId, altText, folder, getPhoto, setPhoto) {
    const slot = document.getElementById(slotId);
    slot.innerHTML = '';
    const rerender = () => renderSinglePhoto(slotId, altText, folder, getPhoto, setPhoto);

    const photo = getPhoto();
    if (photo) {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = altText;
      slot.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'admin-photo-remove';
      removeBtn.setAttribute('aria-label', 'Remove photo');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        setPhoto('');
        rerender();
      });
      slot.appendChild(removeBtn);
    } else {
      const empty = document.createElement('label');
      empty.className = 'admin-photo-empty';
      empty.innerHTML = `<span class="plus">+</span><small>Upload Photo</small>`;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        empty.classList.add('is-uploading');
        empty.querySelector('small').textContent = 'Uploading…';
        try {
          const url = await uploadFile(file, folder);
          setPhoto(url);
          rerender();
        } catch (err) {
          empty.classList.remove('is-uploading');
          empty.querySelector('small').textContent = (err && err.message) || 'Failed — try again';
          empty.title = (err && err.message) || '';
        }
      });
      empty.appendChild(input);
      slot.appendChild(empty);
    }
  }

  function renderCollabPhoto() {
    renderSinglePhoto(
      'collab-photo-slot', 'Collaborator photo', 'collaborator',
      () => state.collaborator.photo, (url) => { state.collaborator.photo = url; },
    );
  }

  function renderBioPhoto() {
    renderSinglePhoto(
      'bio-photo-slot', 'Artist bio photo', 'bio',
      () => state.bio.photo, (url) => { state.bio.photo = url; },
    );
  }

  /* ---------------- Save ---------------- */
  function initSave() {
    document.getElementById('save-btn').addEventListener('click', async () => {
      const status = document.getElementById('save-status');
      status.textContent = 'Saving…';
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(state),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = [body.error, body.detail].filter(Boolean).join(': ') || `Save failed (${res.status})`;
          throw new Error(message);
        }
        status.textContent = 'Saved! The live site is now updated.';
      } catch (err) {
        status.textContent = `Save failed: ${(err && err.message) || 'unknown error'}`;
      }
    });
  }

  /* ---------------- Load existing manifest ---------------- */
  async function loadManifest() {
    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      Object.keys(state.galleries).forEach((key) => {
        state.galleries[key] = Array.isArray(data.galleries?.[key]) ? data.galleries[key] : [];
      });
      state.background = Array.isArray(data.background) ? data.background : [];
      state.paintings = (Array.isArray(data.paintings) ? data.paintings : []).map((p) => ({
        id: (p && p.id) || newId(),
        url: (p && p.url) || '',
        title: (p && p.title) || '',
        price: (p && p.price) || '',
        buyUrl: (p && p.buyUrl) || '',
        stripePriceId: (p && p.stripePriceId) || '',
        status: (p && p.status) || 'available',
      })).filter((p) => p.url);
      if (data.collaborator) {
        state.collaborator = {
          photo: data.collaborator.photo || '',
          headline: data.collaborator.headline || '',
          bio: data.collaborator.bio || '',
        };
      }
      if (data.bio) {
        state.bio = { photo: data.bio.photo || '' };
      }
    } catch {
      // Start from empty state if the manifest can't be loaded.
    }
  }

  async function showDashboard() {
    document.getElementById('admin-gate').hidden = true;
    const dashboard = document.getElementById('admin-dashboard');
    dashboard.hidden = false;
    await loadManifest();
    renderPaintings();
    renderBackground();
    buildGalleryEditors();
    renderBioPhoto();
    initCollabEditor();
    initSave();
  }

  /* ---------------- Password gate ---------------- */
  function initGate() {
    const form = document.getElementById('gate-form');
    const status = document.getElementById('gate-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('gate-password').value;
      status.textContent = 'Checking…';
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'x-admin-password': password },
        });
        if (!res.ok) throw new Error('Wrong password');
        sessionStorage.setItem(PASSWORD_KEY, password);
        status.textContent = '';
        await showDashboard();
      } catch {
        status.textContent = 'Incorrect password. Please try again.';
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      sessionStorage.removeItem(PASSWORD_KEY);
      window.location.reload();
    });
  }

  /* ---------------- Init ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    initGate();
    // If a password is already stashed in this tab's session, skip the gate.
    const stashed = sessionStorage.getItem(PASSWORD_KEY);
    if (stashed) {
      try {
        const res = await fetch('/api/verify', { method: 'POST', headers: { 'x-admin-password': stashed } });
        if (res.ok) {
          await showDashboard();
          return;
        }
      } catch {
        // fall through to showing the gate
      }
      sessionStorage.removeItem(PASSWORD_KEY);
    }
  });
})();
