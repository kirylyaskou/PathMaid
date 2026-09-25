    const RELEASE_API_URL = 'https://api.github.com/repos/kirylyaskou/PathMaid/releases/latest';
    const RELEASE_PAGE_URL = 'https://github.com/kirylyaskou/PathMaid/releases/latest';
    const DOWNLOAD_ASSETS = {
      windows: name => /_x64-setup\.exe$/i.test(name) || /_x64_en-US\.msi$/i.test(name),
      macos: name => /\.dmg$/i.test(name),
      linux: name => /\.AppImage$/i.test(name),
      android: name => /_android_arm64\.apk$/i.test(name)
    };

    async function applyDownloads() {
      try {
        const response = await fetch(RELEASE_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) return;
        const release = await response.json();
        const assets = Array.isArray(release.assets) ? release.assets : [];
        document.querySelectorAll('[data-download]').forEach(link => {
          const match = DOWNLOAD_ASSETS[link.dataset.download];
          const asset = assets.find(candidate => match(candidate.name ?? ''));
          link.href = asset?.browser_download_url ?? RELEASE_PAGE_URL;
        });
      } catch {
        // Static links already point to the latest release page.
      }
    }
    applyDownloads();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const combatShowcase = document.querySelector('[data-combat-showcase]');
    if (combatShowcase) {
      new IntersectionObserver(([entry]) => {
        combatShowcase.classList.toggle('is-playing', entry.isIntersecting);
      }, { threshold: 0.25 }).observe(combatShowcase);
    }

    const referenceGallery = document.querySelector('[data-reference-gallery]');
    if (referenceGallery) {
      const slides = [...referenceGallery.querySelectorAll('.reference-slide')];
      const buttons = [...referenceGallery.querySelectorAll('[data-reference-index]')];
      const title = referenceGallery.querySelector('[data-reference-title]');
      let activeIndex = 0;
      let timer = 0;
      let visible = false;
      let paused = false;

      function showReference(index) {
        if (index === activeIndex) return;
        slides[activeIndex].classList.remove('is-active');
        slides[activeIndex].setAttribute('aria-hidden', 'true');
        buttons[activeIndex].setAttribute('aria-pressed', 'false');
        activeIndex = index;
        slides[activeIndex].classList.add('is-active');
        slides[activeIndex].setAttribute('aria-hidden', 'false');
        buttons[activeIndex].setAttribute('aria-pressed', 'true');
        title.textContent = buttons[activeIndex].textContent;
      }

      function syncReferenceTimer() {
        clearInterval(timer);
        timer = 0;
        if (visible && !paused && !document.hidden && !reducedMotion.matches) {
          timer = setInterval(() => showReference((activeIndex + 1) % slides.length), 6000);
        }
      }

      buttons.forEach((button, index) => button.addEventListener('click', () => {
        showReference(index);
        syncReferenceTimer();
      }));
      referenceGallery.addEventListener('mouseenter', () => { paused = true; syncReferenceTimer(); });
      referenceGallery.addEventListener('mouseleave', () => { paused = false; syncReferenceTimer(); });
      referenceGallery.addEventListener('focusin', () => { paused = true; syncReferenceTimer(); });
      referenceGallery.addEventListener('focusout', event => {
        if (!referenceGallery.contains(event.relatedTarget)) { paused = false; syncReferenceTimer(); }
      });
      document.addEventListener('visibilitychange', syncReferenceTimer);
      reducedMotion.addEventListener('change', syncReferenceTimer);
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        syncReferenceTimer();
      }, { threshold: 0.2 }).observe(referenceGallery);
      referenceGallery.classList.add('is-ready');
    }

    const revealItems = [...document.querySelectorAll('[data-reveal]')];
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealItems.forEach(element => {
      if (!reducedMotion.matches && element.getBoundingClientRect().top >= innerHeight) {
        element.classList.add('is-pending');
        revealObserver.observe(element);
      }
    });

    const artworks = [...document.querySelectorAll('[data-parallax]')].map(element => ({
      element,
      section: element.closest('section'),
      depth: Number(element.dataset.parallax)
    }));
    let frame = 0;
    function updateParallax() {
      frame = 0;
      const limit = innerWidth <= 700 ? 12 : 44;
      const offsets = artworks.map(({ section, depth }) => {
        if (reducedMotion.matches) return 0;
        const bounds = section.getBoundingClientRect();
        return Math.max(-limit, Math.min(limit, (innerHeight / 2 - bounds.top - bounds.height / 2) * depth));
      });
      artworks.forEach(({ element }, index) => element.style.setProperty('--drift', offsets[index] + 'px'));
    }
    function scheduleParallax() {
      if (!frame) frame = requestAnimationFrame(updateParallax);
    }
    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', scheduleParallax);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        revealItems.forEach(element => element.classList.remove('is-pending'));
        revealObserver.disconnect();
      }
      scheduleParallax();
    });
    scheduleParallax();
