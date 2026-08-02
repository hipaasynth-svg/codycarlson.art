(() => {
  const cfg = window.SITE_CONFIG;

  /* ---------------- Background ---------------- */
  function initBackground() {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('bg');
    const url = override || cfg.backgroundImage;
    document.getElementById('bg-layer').style.backgroundImage = `url("${url}")`;
  }

  /* ---------------- Hero content ---------------- */
  function initHero() {
    document.getElementById('availability-label').textContent = cfg.hero.availabilityLabel;
    document.getElementById('availability-subtext').textContent = cfg.hero.availabilitySubtext;
    document.getElementById('hero-heading').textContent = cfg.hero.heading;
    document.getElementById('hero-subheading').textContent = cfg.hero.subheading;

    const callBtn = document.getElementById('call-btn');
    callBtn.href = `tel:${cfg.contact.phone.replace(/[^\d+]/g, '')}`;

    const emailBtn = document.getElementById('email-btn');
    emailBtn.href = `mailto:${cfg.contact.email}`;

    const interestSelect = document.getElementById('f-interest');
    cfg.interests.forEach((label) => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      interestSelect.appendChild(opt);
    });
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
      const interests = Array.from(form.interest.selectedOptions).map((o) => o.value);
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, interests, message }),
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
        interests.length ? `Interested in: ${interests.join(', ')}` : null,
        '',
        message || '(no message provided)',
      ].filter(Boolean);
      const body = encodeURIComponent(bodyLines.join('\n'));
      window.location.href = `mailto:${cfg.contact.email}?subject=${subject}&body=${body}`;
      status.textContent = 'Opening your email client…';
    });
  }

  /* ---------------- Rolodex carousels ---------------- */
  function loadPhotos(storageKey, count) {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return raw;
    } catch {
      return {};
    }
  }

  function savePhotos(storageKey, photos) {
    localStorage.setItem(storageKey, JSON.stringify(photos));
  }

  function buildRolodex({ trackId, storageKey, count, label }) {
    const track = document.getElementById(trackId);
    const photos = loadPhotos(storageKey, count);

    function renderSlot(index) {
      const card = document.createElement('div');
      card.className = 'rolodex-card';
      card.dataset.index = String(index);

      const photoData = photos[index];

      const indexTag = document.createElement('span');
      indexTag.className = 'card-index';
      indexTag.textContent = `${label} ${index + 1}`;
      card.appendChild(indexTag);

      if (photoData) {
        const media = document.createElement('div');
        media.className = 'card-media';
        media.style.backgroundImage = `url("${photoData}")`;
        media.addEventListener('click', () => openLightbox(photoData));
        card.appendChild(media);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'card-remove';
        removeBtn.setAttribute('aria-label', 'Remove photo');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          delete photos[index];
          savePhotos(storageKey, photos);
          card.replaceWith(renderSlot(index));
          updateDepth();
        });
        card.appendChild(removeBtn);
      } else {
        const upload = document.createElement('label');
        upload.className = 'card-upload';
        upload.innerHTML = `
          <span class="plus">+</span>
          <small>Upload Photo</small>
        `;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            photos[index] = reader.result;
            savePhotos(storageKey, photos);
            card.replaceWith(renderSlot(index));
            updateDepth();
          };
          reader.readAsDataURL(file);
        });
        upload.appendChild(input);
        card.appendChild(upload);
      }

      return card;
    }

    for (let i = 0; i < count; i++) {
      track.appendChild(renderSlot(i));
    }

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

    // Arrow controls
    document.querySelectorAll(`.rolodex-arrow[data-rolodex="${trackId.replace('rolodex-', '')}"]`).forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        const cardWidth = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 24 : 300;
        track.scrollBy({ left: dir * cardWidth, behavior: 'smooth' });
      });
    });

    // Desktop drag-to-scroll
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    track.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX;
      scrollStart = track.scrollLeft;
      track.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      isDown = false;
      track.style.cursor = '';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      track.scrollLeft = scrollStart - (e.pageX - startX);
    });
  }

  function initRolodexes() {
    buildRolodex({
      trackId: 'rolodex-main',
      storageKey: cfg.rolodex.main.storageKey,
      count: cfg.rolodex.main.slots,
      label: 'Piece',
    });
    buildRolodex({
      trackId: 'rolodex-secondary',
      storageKey: cfg.rolodex.secondary.storageKey,
      count: cfg.rolodex.secondary.slots,
      label: 'Studio',
    });
  }

  /* ---------------- Lightbox ---------------- */
  function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lightbox.hidden = false;
  }
  function closeLightbox() {
    document.getElementById('lightbox').hidden = true;
  }
  function initLightbox() {
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  /* ---------------- Bio ---------------- */
  function initBio() {
    document.getElementById('bio-heading').textContent = cfg.bio.heading;
    const container = document.getElementById('bio-paragraphs');
    cfg.bio.paragraphs.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      container.appendChild(p);
    });
    if (cfg.bio.photo) {
      document.getElementById('bio-photo').style.backgroundImage = `url("${cfg.bio.photo}")`;
    }
  }

  /* ---------------- Pricing ---------------- */
  function initPricing() {
    const grid = document.getElementById('pricing-grid');
    cfg.pricing.forEach((category) => {
      const col = document.createElement('div');
      col.className = 'pricing-category';
      const h3 = document.createElement('h3');
      h3.textContent = category.category;
      col.appendChild(h3);
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
      grid.appendChild(col);
    });
  }

  /* ---------------- Footer ---------------- */
  function initFooter() {
    const sponsorRow = document.getElementById('sponsor-row');
    cfg.sponsors.forEach((sponsor) => {
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

    const footerEmail = document.getElementById('footer-email');
    footerEmail.href = `mailto:${cfg.contact.email}`;
    footerEmail.textContent = cfg.contact.email;

    const footerPhone = document.getElementById('footer-phone');
    footerPhone.href = `tel:${cfg.contact.phone.replace(/[^\d+]/g, '')}`;
    footerPhone.textContent = cfg.contact.phoneDisplay;

    document.getElementById('footer-year').textContent = String(new Date().getFullYear());
  }

  /* ---------------- Init ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    initHero();
    initForm();
    initRolodexes();
    initLightbox();
    initBio();
    initPricing();
    initFooter();
  });
})();
