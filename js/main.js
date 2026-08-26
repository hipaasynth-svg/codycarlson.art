(() => {
  const cfg = window.SITE_CONFIG;

  /* ---------------- Gallery / store photos ---------------- */
  // Gallery and store photos render as real <img> elements rather than CSS
  // background images: real images carry alt text (so they're reachable by
  // screen readers and indexed by image search) and get native lazy-loading,
  // which defers off-screen and carousel photos just like the old observer did.
  function buildPhoto(url, alt) {
    const img = document.createElement('img');
    img.className = 'media-img';
    // Set the loading mode before src so the browser defers off-screen photos.
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false; // don't fight the carousel's drag-to-scroll
    img.alt = alt || '';
    img.src = url;
    return img;
  }

  // Descriptive alt for a for-sale piece, e.g.
  // "Great American Buffalo — acrylic on canvas, 16×24 in, by Cody Carlson".
  function pieceAltText(piece) {
    const title = (piece.title || '').trim() || 'Original artwork';
    const detail = [piece.medium, piece.size].map((s) => (s || '').trim()).filter(Boolean).join(', ');
    return detail ? `${title} — ${detail}, by Cody Carlson` : `${title}, by Cody Carlson`;
  }

  /* ---------------- Background ---------------- */
  // `?bg=...` forces a single image and disables the slideshow (handy for
  // quick previews). Otherwise we start with the config fallback image, then
  // swap in the admin-managed slideshow once the manifest loads.
  const bgOverride = new URLSearchParams(window.location.search).get('bg');
  let bgTimer = null;

  function setBgLayer(el, url) {
    el.style.backgroundImage = `url("${url}")`;
  }

  function initBackground() {
    const layer = document.getElementById('bg-layer');
    setBgLayer(layer, bgOverride || cfg.backgroundImage);
  }

  function startBackgroundSlideshow(images) {
    const list = (Array.isArray(images) ? images : []).filter(Boolean);
    if (bgOverride || list.length === 0) return; // keep the fallback image

    const layer = document.getElementById('bg-layer');
    layer.style.backgroundImage = '';
    layer.classList.add('bg-slideshow');

    // Two stacked layers we cross-fade between. Start with the first image.
    const slides = [document.createElement('div'), document.createElement('div')];
    slides.forEach((s) => { s.className = 'bg-slide'; layer.appendChild(s); });
    setBgLayer(slides[0], list[0]);
    slides[0].classList.add('is-active');

    if (list.length === 1) return; // nothing to cycle through

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;
    let front = 0;
    const interval = Math.max(2500, Number(cfg.backgroundSlideInterval) || 6000);

    if (bgTimer) clearInterval(bgTimer);
    bgTimer = setInterval(() => {
      index = (index + 1) % list.length;
      const back = 1 - front;
      setBgLayer(slides[back], list[index]);
      // Force reflow so the opacity transition runs from a clean state.
      void slides[back].offsetWidth;
      slides[back].classList.add('is-active');
      slides[front].classList.remove('is-active');
      front = back;
    }, reduce ? interval * 2 : interval);
  }

  /* ---------------- Hero content ---------------- */
  function initHero() {
    document.getElementById('availability-label').textContent = cfg.hero.availabilityLabel;
    document.getElementById('availability-subtext').textContent = cfg.hero.availabilitySubtext;
    document.getElementById('hero-heading').textContent = cfg.hero.heading;
    document.getElementById('hero-subheading').textContent = cfg.hero.subheading;

    document.getElementById('call-btn').href = `tel:${cfg.contact.phone.replace(/[^\d+]/g, '')}`;
    document.getElementById('email-btn').href = `mailto:${cfg.contact.email}`;
  }

  /* ---------------- Intake form ---------------- */
  function initForm() {
    const form = document.getElementById('intake-form');
    const status = document.getElementById('form-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      const message = form.message.value.trim();

      if (!name || !email) {
        status.textContent = 'Please fill in your name and email.';
        return;
      }

      if (cfg.form.submitMode === 'endpoint' && cfg.form.endpoint) {
        status.textContent = 'Sending…';
        try {
          const res = await fetch(cfg.form.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, email, phone, message }),
          });
          if (!res.ok) throw new Error('Request failed');
          status.textContent = 'Thank you — your inquiry has been sent.';
          form.reset();
        } catch (err) {
          status.textContent = 'Something went wrong. Please try email or call instead.';
        }
        return;
      }

      // Fallback / default: open the visitor's email client, pre-filled.
      const subject = encodeURIComponent(`Commission Inquiry from ${name}`);
      const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        '',
        message || '(no message provided)',
      ].filter(Boolean);
      const body = encodeURIComponent(bodyLines.join('\n'));
      window.location.href = `mailto:${cfg.contact.email}?subject=${subject}&body=${body}`;
      status.textContent = 'Opening your email client…';
    });
  }

  /* ---------------- Inquiry pre-fill ---------------- */
  // Used by the "Reserve this piece" fallback: jump to the intake form with a
  // message already written about the specific piece.
  function prefillInquiry(pieceTitle) {
    const form = document.getElementById('intake-form');
    const message = form.querySelector('#f-message');
    if (message) {
      const line = `I'd like to reserve "${pieceTitle}".`;
      message.value = message.value.includes(line) ? message.value : `${line}\n\n${message.value}`.trim();
    }
    document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    const nameField = form.querySelector('#f-name');
    if (nameField) window.setTimeout(() => nameField.focus(), 400);
  }

  /* ---------------- Stripe checkout ---------------- */
  // Shared by the Buy Now button and the shareable ?buy=<pieceId> deep link.
  // Returns true if checkout redirected (or attempted); false on soft failure.
  async function startCheckout(pieceId, opts = {}) {
    const { onError } = opts;
    if (!pieceId) return false;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pieceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout unavailable');
      window.location.href = data.url;
      return true;
    } catch (err) {
      if (typeof onError === 'function') onError(err);
      return false;
    }
  }

  // Shareable purchase link: https://codycarlson.art/?buy=<pieceId>
  // Opens Stripe Checkout for that piece once inventory is loaded.
  function initBuyDeepLink(manifest) {
    const params = new URLSearchParams(window.location.search);
    const buyId = (params.get('buy') || '').trim();
    if (!buyId) return;

    // Search both stores so a shared ?buy=<id> link works for any piece.
    const inventory = [
      ...(Array.isArray(manifest.sculptures) ? manifest.sculptures : []),
      ...(Array.isArray(manifest.paintings) ? manifest.paintings : []),
    ];
    const piece = inventory.find((p) => p && p.id === buyId);
    const status = ((piece && piece.status) || 'available').toLowerCase();

    // Strip ?buy= so a refresh doesn't re-fire checkout.
    if (window.history.replaceState) {
      params.delete('buy');
      const qs = params.toString();
      const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', next);
    }

    if (!piece || status === 'sold' || status === 'reserved') {
      const section = document.getElementById('available');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Prefer a real Payment Link if the piece has one.
    if (piece.buyUrl) {
      window.location.href = piece.buyUrl;
      return;
    }

    startCheckout(buyId, {
      onError: () => {
        prefillInquiry(piece.title || 'this piece');
      },
    });
  }

  /* ---------------- For-sale stores (sculptures + paintings) ---------------- */
  // Both stores render as the same rolodex-style carousel of buyable pieces
  // (same depth/scroll behavior as the photo galleries) so a visitor sees all
  // the pieces at once and can click one for a larger view, with a Buy button.
  // A store with no pieces stays hidden — no placeholder cards ever show.
  function initStoreCarousel({ sectionId, trackId, headingId, introId, items, heading, intro, trust }) {
    const section = document.getElementById(sectionId);
    const track = document.getElementById(trackId);
    if (!section || !track) return;

    const visible = (items || []).filter((p) => p && (p.title || p.image || p.url));
    if (visible.length === 0) return; // section stays hidden

    document.getElementById(headingId).textContent = heading;
    const introEl = document.getElementById(introId);
    if (introEl) {
      if (intro) introEl.textContent = intro; else introEl.hidden = true;
    }

    // Trust cue at the point of purchase (secure checkout + how to ask
    // questions). Rendered once per store, just above the carousel. Only shows
    // for a store that actually has pieces, so an empty section stays clean.
    if (trust) {
      const note = document.createElement('p');
      note.className = 'store-trust';
      note.textContent = trust;
      track.parentNode.insertBefore(note, track);
    }

    // With only a couple of pieces the arrows aren't needed.
    section.querySelector('.rolodex-controls').hidden = visible.length < 3;

    visible.forEach((piece) => track.appendChild(buildPieceSlide(piece)));
    section.hidden = false;
    wireTrack(track, section);
  }

  // Paintings store — prefers the admin-managed list from the manifest; falls
  // back to the example pieces in config.js when nothing has been added yet.
  function initAvailableWork(manifest) {
    const fromManifest = Array.isArray(manifest.paintings) ? manifest.paintings : [];
    const items = fromManifest.length ? fromManifest : (cfg.availableWork || []);
    initStoreCarousel({
      sectionId: 'available',
      trackId: 'available-track',
      headingId: 'available-heading',
      introId: 'available-intro',
      items,
      heading: cfg.availableHeading || 'Available Now',
      intro: cfg.availableIntro,
      trust: cfg.storeTrustNote,
    });
  }

  // Sculptures store — same card + checkout behavior as paintings, managed from
  // /admin. Stays hidden until real sculptures are added there.
  function initSculptures(manifest) {
    initStoreCarousel({
      sectionId: 'sculptures',
      trackId: 'sculptures-track',
      headingId: 'sculptures-heading',
      introId: 'sculptures-intro',
      items: Array.isArray(manifest.sculptures) ? manifest.sculptures : [],
      heading: cfg.sculptureHeading || 'Sculptures',
      intro: cfg.sculptureIntro,
      trust: cfg.storeTrustNote,
    });
  }

  function buildPieceSlide(piece) {
    const img = piece.image || piece.url || '';
    const status = (piece.status || 'available').toLowerCase();
    const soldOut = status === 'sold' || status === 'reserved';

    const card = document.createElement('article');
    card.className = 'rolodex-card piece-slide';

    // A piece with a slug (from the manifest) has its own detail page; clicking
    // its photo or title opens it. Fallback/example pieces without a slug keep
    // the old lightbox behavior so they still enlarge.
    const pieceUrl = piece.slug ? `/piece/${encodeURIComponent(piece.slug)}` : '';

    const media = document.createElement(pieceUrl && img ? 'a' : 'div');
    media.className = 'card-media piece-slide-media';
    if (img) {
      media.appendChild(buildPhoto(img, pieceAltText(piece)));
      if (pieceUrl) {
        media.href = pieceUrl;
        media.setAttribute('aria-label', `${piece.title || 'Piece'} — view details`);
      } else {
        const pieceAlt = pieceAltText(piece);
        media.setAttribute('role', 'button');
        media.setAttribute('tabindex', '0');
        media.setAttribute('aria-label', `${piece.title || 'Piece'} — view larger`);
        media.addEventListener('click', () => openLightbox(img, pieceAlt));
        media.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img, pieceAlt); }
        });
      }
    } else {
      media.classList.add('is-empty');
      media.innerHTML = `<span>Photo coming soon</span>`;
    }
    if (soldOut) {
      const ribbon = document.createElement('span');
      ribbon.className = 'piece-ribbon';
      ribbon.textContent = status === 'sold' ? 'Sold' : 'Reserved';
      media.appendChild(ribbon);
    }
    card.appendChild(media);

    const body = document.createElement('div');
    body.className = 'piece-body';
    const meta = [piece.medium, piece.size].filter(Boolean).join(' · ');
    const titleText = escapeHtml(piece.title || 'Untitled');
    const titleMarkup = pieceUrl
      ? `<a class="piece-title-link" href="${pieceUrl}">${titleText}</a>`
      : titleText;
    body.innerHTML = `
      <h3 class="piece-title">${titleMarkup}</h3>
      ${meta ? `<p class="piece-meta">${escapeHtml(meta)}</p>` : ''}
      <div class="piece-foot">
        <span class="piece-price">${piece.price ? escapeHtml(formatPrice(piece.price)) : 'Inquire for price'}</span>
      </div>
    `;
    body.querySelector('.piece-foot').appendChild(buildBuyButton(piece, soldOut));
    card.appendChild(body);
    return card;
  }

  function buildBuyButton(piece, soldOut) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary piece-buy';

    if (soldOut) {
      btn.textContent = (piece.status || '').toLowerCase() === 'reserved' ? 'Reserved' : 'Sold';
      btn.disabled = true;
      return btn;
    }

    // A) Stripe Payment Link — a direct link, no backend needed.
    if (piece.buyUrl) {
      btn.textContent = 'Buy Now';
      btn.addEventListener('click', () => { window.location.href = piece.buyUrl; });
      return btn;
    }

    // B) On-site Stripe Checkout. Any admin-managed piece (has an id) that has
    // a price or a preset Stripe price is buyable — the amount is looked up
    // server-side from the id, so just adding a photo + price makes it work.
    if (piece.id && (piece.price || piece.stripePriceId)) {
      btn.textContent = 'Buy Now';
      btn.addEventListener('click', async () => {
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Starting checkout…';
        const ok = await startCheckout(piece.id, {
          onError: () => {
            // Fall back to an inquiry so the sale isn't simply lost (e.g. before
            // STRIPE_SECRET_KEY is configured, checkout returns 501).
            btn.disabled = false;
            btn.textContent = original;
            prefillInquiry(piece.title || 'this piece');
          },
        });
        if (!ok) {
          btn.disabled = false;
          btn.textContent = original;
        }
      });
      return btn;
    }

    // C) No price/Stripe yet — reserve via the inquiry form.
    btn.textContent = 'Reserve this piece';
    btn.addEventListener('click', () => prefillInquiry(piece.title || 'this piece'));
    return btn;
  }

  // Show the price with a leading "$" unless the artist already typed a
  // currency symbol, so prices always read as dollars.
  function formatPrice(price) {
    const t = String(price).trim();
    return /^[$€£]/.test(t) ? t : `$${t}`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ---------------- Purchase banner ---------------- */
  function initPurchaseBanner() {
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('purchase');
    if (purchase !== 'success' && purchase !== 'cancel') return;

    const banner = document.getElementById('purchase-banner');
    const text = document.getElementById('purchase-banner-text');
    if (!banner || !text) return;

    if (purchase === 'success') {
      banner.classList.add('is-success');
      text.textContent = 'Thank you — your purchase is complete. A confirmation is on its way to your email.';
    } else {
      banner.classList.add('is-cancel');
      text.textContent = 'Checkout canceled — no charge was made. The piece is still available.';
    }
    banner.hidden = false;
    document.getElementById('purchase-banner-close').addEventListener('click', () => { banner.hidden = true; });

    // Clean the query string so a refresh doesn't re-show the banner.
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }

  /* ---------------- Galleries ---------------- */
  // Fetch the photo manifest saved from the admin page. If it isn't set up
  // yet (or the request fails), fall back to an empty manifest so the public
  // site degrades gracefully — empty galleries simply stay hidden.
  async function loadManifest() {
    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' });
      if (!res.ok) throw new Error('no manifest');
      const data = await res.json();
      return {
        galleries: (data && data.galleries) || {},
        background: (data && data.background) || [],
        paintings: (data && data.paintings) || [],
        sculptures: (data && data.sculptures) || [],
        collaborator: (data && data.collaborator) || null,
        bio: (data && data.bio) || null,
      };
    } catch {
      return { galleries: {}, background: [], paintings: [], sculptures: [], collaborator: null, bio: null };
    }
  }

  function buildGallery(section, key, photos) {
    const meta = cfg.galleries[key];
    if (!meta || !Array.isArray(photos) || photos.length === 0) return; // stays hidden

    section.innerHTML = `
      <div class="rolodex-header">
        <h2>${meta.heading}</h2>
        <div class="rolodex-controls">
          <button class="rolodex-arrow" data-dir="-1" aria-label="Scroll ${meta.heading} left">‹</button>
          <button class="rolodex-arrow" data-dir="1" aria-label="Scroll ${meta.heading} right">›</button>
        </div>
      </div>
      <div class="rolodex-track" tabindex="0" aria-label="${meta.heading} carousel"></div>
    `;
    const track = section.querySelector('.rolodex-track');

    photos.forEach((url, i) => {
      const card = document.createElement('div');
      card.className = 'rolodex-card';
      const media = document.createElement('div');
      media.className = 'card-media';
      const alt = `${meta.label} ${i + 1} — ${meta.heading}, Cody Carlson`;
      media.appendChild(buildPhoto(url, alt));
      media.setAttribute('role', 'button');
      media.setAttribute('tabindex', '0');
      media.setAttribute('aria-label', `${meta.label} ${i + 1} — view larger`);
      media.addEventListener('click', () => openLightbox(url, alt));
      media.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(url, alt); }
      });
      card.appendChild(media);
      track.appendChild(card);
    });

    section.hidden = false;
    wireTrack(track, section);
  }

  function wireTrack(track, section) {
    function updateDepth() {
      const cards = Array.from(track.children);
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = (cardCenter - trackCenter) / trackRect.width;
        const clamped = Math.max(-1, Math.min(1, dist));
        const scale = 1 - Math.min(Math.abs(clamped) * 0.14, 0.14);
        const rotate = clamped * 8;
        const translateY = Math.abs(clamped) * 14;
        card.style.transform = `perspective(1200px) rotateY(${-rotate}deg) translateY(${translateY}px) scale(${scale})`;
        card.style.opacity = String(1 - Math.abs(clamped) * 0.25);
        card.classList.toggle('is-center', Math.abs(clamped) < 0.12);
      });
    }

    track.addEventListener('scroll', () => window.requestAnimationFrame(updateDepth), { passive: true });
    window.addEventListener('resize', updateDepth);
    updateDepth();

    section.querySelectorAll('.rolodex-arrow').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        const first = track.firstElementChild;
        const cardWidth = first ? first.getBoundingClientRect().width + 24 : 300;
        track.scrollBy({ left: dir * cardWidth, behavior: 'smooth' });
      });
    });

    // Desktop drag-to-scroll
    let isDown = false, startX = 0, scrollStart = 0;
    track.addEventListener('mousedown', (e) => {
      isDown = true; startX = e.pageX; scrollStart = track.scrollLeft; track.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => { isDown = false; track.style.cursor = ''; });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      track.scrollLeft = scrollStart - (e.pageX - startX);
    });
  }

  function initGalleries(manifest) {
    document.querySelectorAll('.rolodex-section[data-gallery]').forEach((section) => {
      const key = section.dataset.gallery;
      buildGallery(section, key, manifest.galleries[key] || []);
    });
  }

  /* ---------------- Collaborator ---------------- */
  function initCollaborator(manifest) {
    const data = manifest.collaborator || cfg.collaborator || {};
    const headline = (data.headline || '').trim();
    const bio = (data.bio || '').trim();
    const photo = (data.photo || '').trim();
    if (!headline && !bio && !photo) return; // nothing to show — stays hidden

    document.getElementById('collab-eyebrow').textContent = (cfg.collaborator && cfg.collaborator.sectionHeading) || 'Collaborator';
    document.getElementById('collab-headline').textContent = headline;
    document.getElementById('collab-bio').textContent = bio;
    const photoEl = document.getElementById('collab-photo');
    if (photo) {
      photoEl.style.backgroundImage = `url("${photo}")`;
    } else {
      photoEl.hidden = true;
    }
    document.getElementById('collaborator').hidden = false;
  }

  /* ---------------- Lightbox ---------------- */
  function openLightbox(src, alt) {
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    lbImg.src = src;
    lbImg.alt = alt || '';
    lightbox.hidden = false;
  }
  function closeLightbox() { document.getElementById('lightbox').hidden = true; }
  function initLightbox() {
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---------------- Bio ---------------- */
  function initBio() {
    document.getElementById('bio-heading').textContent = cfg.bio.heading;
    const container = document.getElementById('bio-paragraphs');
    // Clear first so this is idempotent: the server may have prerendered these
    // paragraphs into the HTML (for crawlers), and we re-fill from config here.
    container.textContent = '';
    cfg.bio.paragraphs.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      container.appendChild(p);
    });
  }

  function applyBioPhoto(manifest) {
    const photo = (manifest.bio && manifest.bio.photo) || cfg.bio.photo;
    if (photo) {
      document.getElementById('bio-photo').style.backgroundImage = `url("${photo}")`;
    }
  }

  /* ---------------- Pricing ---------------- */
  function initPricing() {
    const note = document.getElementById('pricing-note');
    if (cfg.pricingNote) note.textContent = cfg.pricingNote;

    const grid = document.getElementById('pricing-grid');
    // Clear first so this is idempotent alongside any server-prerendered markup.
    grid.textContent = '';
    cfg.pricing.forEach((category) => {
      const col = document.createElement('div');
      col.className = 'pricing-category';
      const h3 = document.createElement('h3');
      h3.textContent = category.category;
      col.appendChild(h3);

      if (Array.isArray(category.tiers)) {
        category.tiers.forEach((tier) => {
          const row = document.createElement('div');
          row.className = 'pricing-tier';
          row.innerHTML = `
            <div class="tier-head">
              <span class="tier-name">${tier.name}</span>
              <span class="tier-price">${tier.price}</span>
            </div>
            <p class="tier-desc">${tier.description}</p>
          `;
          col.appendChild(row);
        });
      } else if (category.rate) {
        const row = document.createElement('div');
        row.className = 'pricing-tier pricing-rate';
        row.innerHTML = `
          <div class="tier-head">
            <span class="tier-price rate-price">${category.rate}</span>
          </div>
          ${category.description ? `<p class="tier-desc">${category.description}</p>` : ''}
        `;
        col.appendChild(row);
      }
      grid.appendChild(col);
    });
  }

  /* ---------------- Footer ---------------- */
  function initFooter() {
    // Only show the "Proudly supported by" block when there are real sponsors —
    // placeholder badges read as fake and hurt trust, so an empty list hides it.
    const sponsors = (cfg.sponsors || []).filter((s) => s && s.name && s.url && s.url !== '#');
    const sponsorsBlock = document.getElementById('footer-sponsors');
    if (sponsors.length === 0) {
      if (sponsorsBlock) sponsorsBlock.hidden = true;
    } else {
      if (sponsorsBlock) sponsorsBlock.hidden = false;
      const sponsorRow = document.getElementById('sponsor-row');
      sponsors.forEach((sponsor) => {
        const a = document.createElement('a');
        a.className = 'sponsor-badge';
        a.href = sponsor.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        if (sponsor.logo) {
          const img = document.createElement('img');
          img.src = sponsor.logo;
          img.alt = sponsor.name;
          a.appendChild(img);
        } else {
          a.textContent = sponsor.name;
        }
        sponsorRow.appendChild(a);
      });
    }

    // Instagram link — shows only when a URL is set in config.
    const instagram = (cfg.contact.instagram || '').trim();
    if (instagram) {
      const igLink = document.getElementById('footer-instagram');
      const igDivider = document.getElementById('footer-instagram-divider');
      if (igLink) { igLink.href = instagram; igLink.hidden = false; }
      if (igDivider) igDivider.hidden = false;
    }

    const footerEmail = document.getElementById('footer-email');
    footerEmail.href = `mailto:${cfg.contact.email}`;
    footerEmail.textContent = cfg.contact.email;

    const footerPhone = document.getElementById('footer-phone');
    footerPhone.href = `tel:${cfg.contact.phone.replace(/[^\d+]/g, '')}`;
    footerPhone.textContent = cfg.contact.phoneDisplay;

    document.getElementById('footer-year').textContent = String(new Date().getFullYear());
  }

  /* ---------------- Init ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    initBackground();
    initHero();
    initForm();
    initLightbox();
    initBio();
    initPricing();
    initFooter();
    initPurchaseBanner();

    const manifest = await loadManifest();
    startBackgroundSlideshow(manifest.background);
    initSculptures(manifest);
    initGalleries(manifest);
    initAvailableWork(manifest);
    initCollaborator(manifest);
    applyBioPhoto(manifest);
    // Deep-link checkout after inventory is on the page.
    initBuyDeepLink(manifest);
  });
})();
