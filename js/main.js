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
        collaborator: (data && data.collaborator) || null,
        bio: (data && data.bio) || null,
      };
    } catch {
      return { galleries: {}, collaborator: null, bio: null };
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
      media.style.backgroundImage = `url("${url}")`;
      media.setAttribute('role', 'button');
      media.setAttribute('tabindex', '0');
      media.setAttribute('aria-label', `${meta.label} ${i + 1} — view larger`);
      media.addEventListener('click', () => openLightbox(url));
      media.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(url); }
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
  function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
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
  document.addEventListener('DOMContentLoaded', async () => {
    initBackground();
    initHero();
    initForm();
    initLightbox();
    initBio();
    initPricing();
    initFooter();

    const manifest = await loadManifest();
    initGalleries(manifest);
    initCollaborator(manifest);
    applyBioPhoto(manifest);
  });
})();
