/** Returns true if the item is a shield based on its type or name. */
export function isShieldItem(type: string, name: string): boolean {
  return type === 'shield' || name.toLowerCase().includes('shield')
}
