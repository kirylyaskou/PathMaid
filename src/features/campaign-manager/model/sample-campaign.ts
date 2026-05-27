import {
  bucketNodeId,
  extractMarkdownLinks,
  extractTableLinks,
  type CampaignBucket,
  type CampaignNodeKind,
  type CampaignTableCells,
  type CampaignTableColumn,
  type CampaignTableRow,
  type CampaignTableSizes,
} from '@/entities/campaign'
import {
  createCampaign,
  createCampaignNode,
  listCampaignNodes,
  replaceCampaignLinks,
  setCampaignPins,
  updateCampaignDocument,
  updateCampaignTable,
} from '@/shared/api'

interface SampleNode {
  key: string
  parentKey: string
  kind: Exclude<CampaignNodeKind, 'bucket'>
  title: string
}

interface SampleTable {
  columns: CampaignTableColumn[]
  rows: CampaignTableRow[]
  cells: CampaignTableCells
  columnSizes?: CampaignTableSizes
  rowSizes?: CampaignTableSizes
}

const CAMPAIGN_NAME = 'Сокровища королевы Милф'

const BUCKET_KEYS: Record<CampaignBucket, CampaignBucket> = {
  notes: 'notes',
  tables: 'tables',
  npcs: 'npcs',
  items: 'items',
  locations: 'locations',
}

const SAMPLE_NODES: SampleNode[] = [
  { key: 'notes-sessions', parentKey: 'notes', kind: 'folder', title: 'Сессии' },
  { key: 'notes-lore', parentKey: 'notes', kind: 'folder', title: 'Лор и слухи' },
  { key: 'party-overview', parentKey: 'notes-lore', kind: 'note', title: 'Славные ублюдки' },
  { key: 'treasure-note', parentKey: 'notes-lore', kind: 'note', title: 'Сокровище королевы Милф' },
  { key: 'hooks-note', parentKey: 'notes-lore', kind: 'note', title: 'Крючки, слухи и плохие решения' },
  {
    key: 'session-01',
    parentKey: 'notes-sessions',
    kind: 'note',
    title: 'Сессия 01 — Пироги, паника и протокол',
  },
  {
    key: 'session-02',
    parentKey: 'notes-sessions',
    kind: 'note',
    title: 'Сессия 02 — Башня Больших Шаров',
  },
  {
    key: 'session-03',
    parentKey: 'notes-sessions',
    kind: 'note',
    title: 'Сессия 03 — Суд над здравым смыслом',
  },
  { key: 'tables-accounting', parentKey: 'tables', kind: 'folder', title: 'Учёт кампании' },
  {
    key: 'table-relations',
    parentKey: 'tables-accounting',
    kind: 'table',
    title: 'Таблица отношений с группой',
  },
  {
    key: 'table-inventory',
    parentKey: 'tables-accounting',
    kind: 'table',
    title: 'Инвентарь Славных ублюдков',
  },
  {
    key: 'table-locations',
    parentKey: 'tables-accounting',
    kind: 'table',
    title: 'Карта локаций и слухов',
  },
  { key: 'npcs-party', parentKey: 'npcs', kind: 'folder', title: 'Партия' },
  { key: 'npcs-villains', parentKey: 'npcs', kind: 'folder', title: 'Двор королевы Милф' },
  { key: 'npc-boblin', parentKey: 'npcs-party', kind: 'npc', title: 'Боблин' },
  { key: 'npc-doblin', parentKey: 'npcs-party', kind: 'npc', title: 'Доблин' },
  { key: 'npc-zhoplin', parentKey: 'npcs-party', kind: 'npc', title: 'Жоплин' },
  { key: 'npc-toplin', parentKey: 'npcs-party', kind: 'npc', title: 'Топлин' },
  { key: 'npc-queen', parentKey: 'npcs-villains', kind: 'npc', title: 'Королева Милф' },
  { key: 'npc-climaxia', parentKey: 'npcs-villains', kind: 'npc', title: 'Климаксия' },
  { key: 'npc-suchencia', parentKey: 'npcs-villains', kind: 'npc', title: 'Графиня Сученция' },
  { key: 'items-artifacts', parentKey: 'items', kind: 'folder', title: 'Артефакты' },
  { key: 'item-flug', parentKey: 'items-artifacts', kind: 'item', title: 'Меч Флюгегенхаймена' },
  { key: 'item-staff', parentKey: 'items-artifacts', kind: 'item', title: 'Посох больших шаров' },
  { key: 'item-crown', parentKey: 'items-artifacts', kind: 'item', title: 'Корона липкого авторитета' },
  { key: 'item-cup', parentKey: 'items-artifacts', kind: 'item', title: 'Кубок драматической паузы' },
  { key: 'loc-kingdom', parentKey: 'locations', kind: 'folder', title: 'Королевство Милф' },
  { key: 'loc-roads', parentKey: 'locations', kind: 'folder', title: 'Дороги и рынки' },
  { key: 'loc-dungeons', parentKey: 'locations', kind: 'folder', title: 'Подземелья и башни' },
  { key: 'loc-palace', parentKey: 'loc-kingdom', kind: 'location', title: 'Дворец королевы Милф' },
  { key: 'loc-throne', parentKey: 'loc-kingdom', kind: 'location', title: 'Зал липкого трона' },
  { key: 'loc-market', parentKey: 'loc-roads', kind: 'location', title: 'Рынок бесполезных квестов' },
  { key: 'loc-swamp', parentKey: 'loc-roads', kind: 'location', title: 'Болото неловких решений' },
  { key: 'loc-bridge', parentKey: 'loc-roads', kind: 'location', title: 'Мост неловкого молчания' },
  { key: 'loc-tower', parentKey: 'loc-dungeons', kind: 'location', title: 'Башня Больших Шаров' },
  {
    key: 'loc-basement',
    parentKey: 'loc-dungeons',
    kind: 'location',
    title: 'Подвал королевских заготовок',
  },
  {
    key: 'loc-archive',
    parentKey: 'loc-dungeons',
    kind: 'location',
    title: 'Архив неудобных признаний',
  },
]

const SAMPLE_DOCUMENTS: Record<string, string> = {
  'session-notes': `# Сокровища королевы Милф

Тестовая кампания для проверки редактора, таблиц, refs rail и graph mode.

Главная завязка: [[Славные ублюдки]] пытаются найти [[Сокровище королевы Милф]] раньше, чем двор объявит их авторами всех плохих решений недели.

## Быстрые переходы
- [[Сессия 01 — Пироги, паника и протокол]]
- [[Сессия 02 — Башня Больших Шаров]]
- [[Сессия 03 — Суд над здравым смыслом]]
`,
  'party-overview': `# Славные ублюдки

Отряд состоит из [[Боблин]], [[Доблин]], [[Жоплин]] и [[Топлин]]. Формально они герои, практически — мобильная аварийная ситуация.

Добыча и странные решения ведутся в [[Инвентарь Славных ублюдков]].
`,
  'treasure-note': `# Сокровище королевы Милф

По слухам, это не золото, а сундук с компроматом, рецептами густого крема и долговыми расписками.

Главная претендентка на сокровище — [[Королева Милф]].
`,
  'hooks-note': `# Крючки, слухи и плохие решения

- На рынке видели странную тень с мечом.
- В архиве лежит письмо, которое никто не хочет читать вслух.
- Двор уверен, что группа виновата, потому что это удобно.
`,
  'session-01': `# Сессия 01 — Пироги, паника и протокол

Отряд прибывает в [[Рынок бесполезных квестов]] и случайно выигрывает конкурс "Самый убедительный подозреваемый".

После сцены с пирогами обновить [[Таблица отношений с группой]].
`,
  'session-02': `# Сессия 02 — Башня Больших Шаров

Группа идёт в [[Башня Больших Шаров]], потому что [[Посох больших шаров]] якобы открывает путь к сокровищу.
`,
  'session-03': `# Сессия 03 — Суд над здравым смыслом

Финал проходит в [[Дворец королевы Милф]]: двор устраивает процесс над всей группой за незаконное приключенчество.

Важная улика — [[Корона липкого авторитета]].
`,
  'npc-boblin': `# Боблин

Самоназначенный лидер. Уверен, что стратегия — это когда кричишь первым.
`,
  'npc-doblin': `# Доблин

Единственный в отряде, кто умеет читать инструкции, но делает это драматическим голосом.
`,
  'npc-zhoplin': `# Жоплин

Специалист по внезапным переговорам, особенно когда его уже поймали.
`,
  'npc-toplin': `# Топлин

Разведчик, который считает скрытность разновидностью быстрой ходьбы.
`,
  'npc-queen': `# Королева Милф

Властная королева с улыбкой налоговой проверки и любовью к громким титульным речам.

Её ближайшие фигуры: [[Климаксия]] и [[Графиня Сученция]]. Главная сцена власти — [[Дворец королевы Милф]].
`,
  'npc-climaxia': `# Климаксия

Правая рука королевы: холодная, точная и слишком театральная для обычной стражи.
`,
  'npc-suchencia': `# Графиня Сученция

Дворянка, которая произносит слово "этикет" как угрозу.
`,
  'item-flug': `# Меч Флюгегенхаймена

Меч с названием, которое никто не может произнести без проверки харизмы.
`,
  'item-staff': `# Посох больших шаров

Посох создаёт два сияющих шара пафоса. Один отвлекает врагов, второй отвлекает владельца.
`,
  'item-crown': `# Корона липкого авторитета

Корона заставляет всех говорить "ваше величество", но только саркастически.
`,
  'item-cup': `# Кубок драматической паузы

Если поднять кубок перед монологом, все ждут продолжения на один раунд дольше, чем должны.
`,
  'loc-palace': `# Дворец королевы Милф

Главная сцена интриг, громких дверей и людей, которые говорят "протокол" вместо "помогите".

Внутри особенно важны [[Зал липкого трона]] и [[Подвал королевских заготовок]].
`,
  'loc-throne': `# Зал липкого трона

Тронный зал, где каждая речь прилипает к полу и совести.
`,
  'loc-market': `# Рынок бесполезных квестов

Место, где любой слух стоит монету, а правдивый слух стоит подозрительно дёшево.
`,
  'loc-swamp': `# Болото неловких решений

Болото, где плохие планы всплывают раньше тележек.
`,
  'loc-bridge': `# Мост неловкого молчания

Переход, на котором даже Боблин понимает, что лучше помолчать. Иногда.
`,
  'loc-tower': `# Башня Больших Шаров

Башня с механизмами, которые выглядят важнее, чем работают.
`,
  'loc-basement': `# Подвал королевских заготовок

Запасы варенья, протоколов и неучтённых скелетов в шкафу.

Старый ход ведёт в [[Архив неудобных признаний]].
`,
  'loc-archive': `# Архив неудобных признаний

Тихое место, где письма шепчут "не открывай меня при свидетелях".
`,
}

const SAMPLE_TABLES: Record<string, SampleTable> = {
  'table-relations': {
    columns: [
      { id: 'relation', title: 'Отношение' },
      { id: 'status', title: 'Статус' },
      { id: 'next', title: 'Следующая сцена' },
    ],
    rows: [
      { id: 'queen', title: 'Королева Милф' },
      { id: 'climaxia', title: 'Климаксия' },
      { id: 'suchencia', title: 'Графиня Сученция' },
    ],
    cells: {
      queen: {
        relation: 'Враг',
        status: 'Объявила отряд угрозой короне',
        next: '[[Сессия 03 — Суд над здравым смыслом]]',
      },
      climaxia: {
        relation: 'Опасный контакт',
        status: 'Следит за Доблином',
        next: '[[Башня Больших Шаров]]',
      },
      suchencia: {
        relation: 'Враг с полезной информацией',
        status: 'Прячет письмо в архиве',
        next: '[[Дворец королевы Милф]]',
      },
    },
  },
  'table-inventory': {
    columns: [
      { id: 'card', title: 'Карточка' },
      { id: 'owner', title: 'Владелец' },
      { id: 'effect', title: 'Эффект' },
    ],
    rows: [
      { id: 'flug', title: 'Меч Флюгегенхаймена' },
      { id: 'staff', title: 'Посох больших шаров' },
      { id: 'cup', title: 'Кубок драматической паузы' },
    ],
    cells: {
      flug: { card: '[[Меч Флюгегенхаймена]]', owner: 'Боблин', effect: 'Сбивает врага названием' },
      staff: { card: '[[Посох больших шаров]]', owner: 'Доблин', effect: 'Создаёт два шара пафоса' },
      cup: { card: '[[Кубок драматической паузы]]', owner: 'Топлин', effect: 'Удлиняет паузу' },
    },
  },
  'table-locations': {
    columns: [
      { id: 'place', title: 'Локация' },
      { id: 'status', title: 'Состояние' },
    ],
    rows: [
      { id: 'palace', title: 'Дворец' },
      { id: 'market', title: 'Рынок' },
      { id: 'tower', title: 'Башня' },
      { id: 'swamp', title: 'Болото' },
      { id: 'bridge', title: 'Мост' },
    ],
    cells: {
      palace: { place: '[[Дворец королевы Милф]]', status: 'Финал и суд' },
      market: { place: '[[Рынок бесполезных квестов]]', status: 'Социальный хаос' },
      tower: { place: '[[Башня Больших Шаров]]', status: 'Данж с рычагами' },
      swamp: { place: '[[Болото неловких решений]]', status: 'Плохие решения всплывают' },
      bridge: { place: '[[Мост неловкого молчания]]', status: 'Тихий переход' },
    },
  },
}

function requireNodeId(nodeIds: Map<string, string>, key: string): string {
  const nodeId = nodeIds.get(key)
  if (!nodeId) {
    throw new Error(`Sample campaign node is missing: ${key}`)
  }

  return nodeId
}

export async function seedSampleCampaign(): Promise<string> {
  const campaignId = await createCampaign({
    name: CAMPAIGN_NAME,
    description: 'Юмористическая тестовая кампания для проверки заметок, таблиц, refs и graph mode.',
    accentColor: '#b45309',
  })
  const nodeIds = new Map<string, string>()

  for (const bucket of Object.values(BUCKET_KEYS)) {
    nodeIds.set(bucket, bucketNodeId(campaignId, bucket))
  }
  nodeIds.set('session-notes', `campaign-node-${campaignId}-session-notes`)

  for (const node of SAMPLE_NODES) {
    const nodeId = await createCampaignNode({
      campaignId,
      parentId: requireNodeId(nodeIds, node.parentKey),
      kind: node.kind,
      title: node.title,
    })
    nodeIds.set(node.key, nodeId)
  }

  for (const [key, markdown] of Object.entries(SAMPLE_DOCUMENTS)) {
    await updateCampaignDocument(requireNodeId(nodeIds, key), { markdown })
  }

  for (const [key, table] of Object.entries(SAMPLE_TABLES)) {
    await updateCampaignTable(requireNodeId(nodeIds, key), {
      columns: table.columns,
      rows: table.rows,
      cells: table.cells,
      columnSizes: table.columnSizes ?? {},
      rowSizes: table.rowSizes ?? {},
    })
  }

  const nodes = await listCampaignNodes(campaignId)

  for (const [key, markdown] of Object.entries(SAMPLE_DOCUMENTS)) {
    await replaceCampaignLinks(campaignId, requireNodeId(nodeIds, key), extractMarkdownLinks(markdown, nodes))
  }

  for (const [key, table] of Object.entries(SAMPLE_TABLES)) {
    await replaceCampaignLinks(campaignId, requireNodeId(nodeIds, key), extractTableLinks(table.cells, nodes))
  }

  await setCampaignPins(campaignId, [
    requireNodeId(nodeIds, 'session-notes'),
    requireNodeId(nodeIds, 'party-overview'),
    requireNodeId(nodeIds, 'table-inventory'),
  ])

  return campaignId
}
