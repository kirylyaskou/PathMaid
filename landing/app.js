const RELEASE_API_URL = 'https://api.github.com/repos/kirylyaskou/PathMaid/releases/latest'
const RELEASE_PAGE_URL = 'https://github.com/kirylyaskou/PathMaid/releases/latest'

const FALLBACK_DOWNLOADS = {
  windows: RELEASE_PAGE_URL,
  macos: RELEASE_PAGE_URL,
  linux: RELEASE_PAGE_URL,
}

const DOWNLOAD_ASSETS = {
  windows: (name) => /_x64-setup\.exe$/i.test(name) || /_x64_en-US\.msi$/i.test(name),
  macos: (name) => /\.dmg$/i.test(name),
  linux: (name) => /\.AppImage$/i.test(name),
}

const STRINGS = {
  en: {
    'nav.features': 'Features',
    'nav.service': 'Benefits',
    'nav.downloads': 'Downloads',
    'hero.title': 'Let the maid handle the mess.',
    'hero.lede': 'The ultimate all-in-one GM screen. Everything you hoped to keep within reach is already on the desk: bestiary, combat tracker, custom creatures, knowledge base, and cross-platform tools for any table.',
    'downloads.windows': 'Download for Windows',
    'downloads.macos': 'Download for macOS',
    'downloads.linux': 'Download for Linux',
    'features.eyebrow': 'The service menu',
    'features.title': 'Five ways to make GM life easier by trusting PathMaid',
    'features.encyclopedia.title': 'Universal knowledge base',
    'features.encyclopedia.body': 'Keep the PF2e reference library in one place and work without internet access. Creatures, spells, items, conditions, hazards, actions, and rules stay fast to search from the desktop.',
    'features.combat.title': 'The combat tracker you deserve',
    'features.combat.body': 'Build encounters, apply conditions, track effects, and let PathMaid handle the math for you. Or at least most of it.',
    'features.pathbuilder.title': 'Pathbuilder character import',
    'features.pathbuilder.body': 'Your players hide their secrets in Pathbuilder. Bring those characters into the GM workspace in two clicks and put the facts on the table.',
    'features.custom.title': 'Custom creature builder',
    'features.custom.body': 'Create, defeat, import, and export. Your bestiary has never been easier to shape for the table you actually run.',
    'features.campaign.status': 'In progress',
    'features.campaign.title': 'Campaign manager',
    'features.campaign.body': 'Campaign organization is actively evolving, so PathMaid can help keep long, complicated campaigns in order too. This section is open for GM feedback.',
    'slider.prev': 'Previous',
    'slider.next': 'Next',
    'service.title': 'Less prep. More play.',
    'service.clean.title': 'One clean desk',
    'service.clean.body': 'No jumping between tabs, apps, rules, sheets, encounter notes, and exports in the middle of a scene.',
    'service.speed.title': 'Faster rulings',
    'service.speed.body': 'Current searchable data reduces the pause while the table waits for a rule check, condition, or bit of math.',
    'service.control.title': 'Everything in your hands',
    'service.control.body': 'You control every important part of the game. The only remaining task is remembering to enjoy it.',
    'showcase.title': 'From prep pile to service tray.',
    'showcase.body': 'PathMaid turns scattered notes, books, imports, and encounter work into a prepared GM desk. The hardest part is simply starting.',
    'downloadShelf.eyebrow': 'Release shelf',
    'downloadShelf.title': 'Download PathMaid',
    'downloadShelf.windows': 'Windows build for your prep desk.',
    'downloadShelf.macos': 'macOS build for your prep desk.',
    'downloadShelf.linux': 'Linux build for your prep desk.',
    'footer.disclaimer': 'PathMaid is an independent Pathfinder 2e GM assistant and is not endorsed by Paizo.',
    'footer.github': 'GitHub',
  },
  ru: {
    'nav.features': 'Возможности',
    'nav.service': 'Бенефиты',
    'nav.downloads': 'Скачать',
    'hero.title': 'PathMaid приберёт хаос перед сессией.',
    'hero.lede': 'Ультимативная ширма мастера в одном приложении. Всё, что хотелось держать под рукой, уже на вашем столе: бестиарий, боевой трекер, кастомизация существ, база знаний и инструменты под любую платформу.',
    'downloads.windows': 'Скачать для Windows',
    'downloads.macos': 'Скачать для macOS',
    'downloads.linux': 'Скачать для Linux',
    'features.eyebrow': 'Меню сервиса',
    'features.title': 'Пять способов облегчить себе жизнь, доверив всё PathMaid',
    'features.encyclopedia.title': 'Универсальная база знаний',
    'features.encyclopedia.body': 'Вся справка PF2e в одном месте и без привязки к интернету. Существа, заклинания, предметы, состояния, опасности, действия и правила быстро ищутся прямо с рабочего стола.',
    'features.combat.title': 'Боевой трекер, который вы заслуживаете',
    'features.combat.body': 'Создавайте энкаунтеры, накладывайте состояния, отслеживайте эффекты и не беспокойтесь о математике: PathMaid всё сделает за вас. Ну или почти всё.',
    'features.pathbuilder.title': 'Импорт персонажей из Pathbuilder',
    'features.pathbuilder.body': 'Ваши игроки скрывают свои тайны в Pathbuilder. Выведите их на чистую воду за два клика и перенесите персонажей в рабочее место мастера.',
    'features.custom.title': 'Конструктор кастомных существ',
    'features.custom.body': 'Создавайте, убивайте, импортируйте и экспортируйте. Вашим бестиарием ещё никогда не было так просто управлять.',
    'features.campaign.status': 'В работе',
    'features.campaign.title': 'Менеджер кампаний',
    'features.campaign.body': 'Организация кампаний активно дорабатывается, чтобы PathMaid помогала держать в порядке не только следующий бой, но и длинные сложные кампейны. Раздел открыт для пожеланий мастеров.',
    'slider.prev': 'Назад',
    'slider.next': 'Дальше',
    'service.title': 'Меньше подготовки. Больше игры.',
    'service.clean.title': 'Один прибранный стол',
    'service.clean.body': 'Не нужно прыгать между вкладками, приложениями, правилами, листами, заметками энкаунтера и экспортами данных прямо посреди сцены.',
    'service.speed.title': 'Быстрые решения',
    'service.speed.body': 'Актуальные данные с поиском уменьшают паузу, пока стол ждёт сверку с правилами, состояние или математику.',
    'service.control.title': 'Всё в ваших руках',
    'service.control.body': 'У вас есть контроль над каждым важным аспектом игры. Осталось только не забыть получать удовольствие.',
    'showcase.title': 'От кипы материалов к подаче на блюдце.',
    'showcase.body': 'PathMaid превращает разрозненные заметки, книги, импорты и работу над энкаунтерами в подготовленный стол мастера. Самое сложное - просто начать.',
    'downloadShelf.eyebrow': 'Полка релиза',
    'downloadShelf.title': 'Скачать PathMaid',
    'downloadShelf.windows': 'Сборка для Windows.',
    'downloadShelf.macos': 'Сборка для macOS.',
    'downloadShelf.linux': 'Сборка для Linux.',
    'footer.disclaimer': 'PathMaid - независимый помощник мастера Pathfinder 2e, не одобренный Paizo.',
    'footer.github': 'GitHub',
  },
}

const STORAGE_KEY = 'pathmaid_landing_locale'

function detectLocale() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'ru') return stored
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

function applyLocale(locale) {
  document.documentElement.lang = locale
  localStorage.setItem(STORAGE_KEY, locale)

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n')
    node.textContent = STRINGS[locale][key] ?? STRINGS.en[key] ?? node.textContent
  })

  document.querySelectorAll('.language-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === locale))
  })
}

function setDownloadLinks(downloads) {
  document.querySelectorAll('[data-download]').forEach((node) => {
    const platform = node.getAttribute('data-download')
    node.setAttribute('href', downloads[platform] ?? RELEASE_PAGE_URL)
  })
}

async function applyDownloads() {
  setDownloadLinks(FALLBACK_DOWNLOADS)

  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return

    const release = await response.json()
    const assets = Array.isArray(release.assets) ? release.assets : []
    const downloads = { ...FALLBACK_DOWNLOADS }

    Object.entries(DOWNLOAD_ASSETS).forEach(([platform, matches]) => {
      const asset = assets.find((candidate) => matches(candidate.name ?? ''))
      if (asset?.browser_download_url) {
        downloads[platform] = asset.browser_download_url
      }
    })

    setDownloadLinks(downloads)
  } catch {
    setDownloadLinks(FALLBACK_DOWNLOADS)
  }
}

document.querySelectorAll('.language-button').forEach((button) => {
  button.addEventListener('click', () => {
    applyLocale(button.dataset.locale)
  })
})

applyDownloads()
applyLocale(detectLocale())

const sliders = document.querySelectorAll('[data-slider]')

sliders.forEach((slider) => {
  const slides = [...slider.querySelectorAll('[data-slide]')]
  const dots = [...slider.querySelectorAll('[data-slide-to]')]
  const prev = slider.querySelector('[data-slider-prev]')
  const next = slider.querySelector('[data-slider-next]')
  let active = 0

  function showSlide(index) {
    active = (index + slides.length) % slides.length
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === active)
    })
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === active)
      dot.setAttribute('aria-current', dotIndex === active ? 'true' : 'false')
    })
  }

  prev?.addEventListener('click', () => showSlide(active - 1))
  next?.addEventListener('click', () => showSlide(active + 1))
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.slideTo))
    })
  })

  showSlide(0)
})
