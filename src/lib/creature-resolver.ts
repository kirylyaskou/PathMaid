import { db } from './database';
import { pf2eEntities } from './schema';
import { inArray } from 'drizzle-orm';

export interface ResolvedCreatureItem {
  embedded: any;
  canonical: any | null;
  isUnique: boolean;
}

export async function resolveCreatureItems(
  creatureRawData: any
): Promise<ResolvedCreatureItem[]> {
  const items: any[] = creatureRawData?.items || [];
  if (items.length === 0) return [];

  // Collect unique slugs from items with system.slug
  const slugs = [...new Set(
    items
      .map((item: any) => item.system?.slug)
      .filter((s: any): s is string => typeof s === 'string' && s.length > 0)
  )];

  // Single batch query — guard against empty inArray (avoids SQL syntax error)
  const canonicals = slugs.length > 0
    ? await db.select().from(pf2eEntities).where(inArray(pf2eEntities.slug, slugs))
    : [];

  // Composite key map: "slug:entityType" -> parsed rawData
  const canonicalMap = new Map(
    (canonicals as any[]).map((c: any) => [`${c.slug}:${c.entityType}`, JSON.parse(c.rawData)])
  );

  // Resolve each embedded item
  return items.map((item: any) => {
    const slug = item.system?.slug;
    const type = item.type;
    const canonical = (slug && type)
      ? (canonicalMap.get(`${slug}:${type}`) ?? null)
      : null;
    return { embedded: item, canonical, isUnique: !canonical };
  });
}
