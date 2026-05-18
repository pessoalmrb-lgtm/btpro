import { collection, query, where, getDocs, type Firestore } from 'firebase/firestore';

/**
 * Normaliza um nome para formato de tag:
 * "João Silva" → "joaosilva"
 * Remove acentos, espaços, caracteres especiais.
 */
function nameToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')        // remove tudo que não for letra/número
    .slice(0, 20);                     // limita a 20 chars
}

/**
 * Gera um @userTag único baseado no nome do usuário.
 * "João Silva" → @joaosilva
 * Se já existir → @joaosilva2, @joaosilva3, etc.
 */
export async function generateUniqueUserTag(db: Firestore, displayName?: string | null): Promise<string> {
  const base = displayName && displayName.trim().length > 0
    ? nameToSlug(displayName)
    : 'user';

  const slug = base.length > 0 ? base : 'user';

  // Tenta @slug, depois @slug2, @slug3...
  for (let attempt = 0; attempt <= 99; attempt++) {
    const tag = attempt === 0 ? `@${slug}` : `@${slug}${attempt + 1}`;

    const q = query(collection(db, 'users'), where('userTag', '==', tag));
    const snap = await getDocs(q);

    if (snap.empty) return tag;
  }

  // Fallback com número aleatório se todas as variações estiverem ocupadas
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `@${slug}${rand}`;
}

/**
 * Gera um ID numérico único de 5 dígitos.
 */
export async function generateUniqueNumericId(db: Firestore): Promise<string> {
  for (let attempts = 0; attempts < 20; attempts++) {
    const id = String(Math.floor(10000 + Math.random() * 90000));
    const q  = query(collection(db, 'users'), where('userNumericId', '==', id));
    const snap = await getDocs(q);
    if (snap.empty) return id;
  }
  // Fallback
  return String(Date.now()).slice(-5);
}
