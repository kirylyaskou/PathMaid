export const PATHS = {
  HOME: '/',
  COMBAT: '/combat',
  BESTIARY: '/bestiary',
  ENCOUNTERS: '/encounters',
  CONDITIONS: '/conditions',
  SPELLS: '/spells',
  ITEMS: '/items',
  CHARACTERS: '/characters',
  CUSTOM_CREATURES: '/custom-creatures',
  CUSTOM_CREATURE_EDIT: (id: string) => `/custom-creatures/${id}/edit`,
  SETTINGS: '/settings',
} as const
