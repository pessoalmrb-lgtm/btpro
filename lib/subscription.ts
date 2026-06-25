'use client';

// =====================================================================
// BeachPró — Módulo central de assinatura (RevenueCat)
//
// Fonte da verdade do status premium NO APP NATIVO: RevenueCat
// (Purchases.getCustomerInfo). O Firestore é apenas um espelho para
// exibir o selo premium a OUTROS usuários, e as regras de segurança
// (corretamente) proíbem o cliente de alterar `isPremium`. Por isso,
// este módulo NUNCA tenta gravar isPremium no Firestore; no máximo
// atualiza `subscriptionExpiresAt`, que é permitido, e tolera falha.
// =====================================================================

export const RC_API_KEY = 'goog_zjhFiEAkdPNxktnZYxXyCFcQMVc';
export const ENTITLEMENT_ID = 'com.beachpro.app Pro';

export interface SubscriptionStatus {
  isPremium: boolean;
  expirationDate: string | null; // ISO string ou null (lifetime/desconhecido)
  productIdentifier: string | null;
}

let configuredForUid: string | null = null;

async function isNative(): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  return Capacitor.isNativePlatform();
}

/**
 * Configura o SDK do RevenueCat (uma vez por sessão) e identifica o usuário.
 * Idempotente: chamadas repetidas com o mesmo uid não reconfiguram.
 */
export async function initPurchases(uid: string): Promise<void> {
  if (!(await isNative())) return;
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');

  if (configuredForUid === null) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: RC_API_KEY, appUserID: uid });
    configuredForUid = uid;
    return;
  }
  if (configuredForUid !== uid) {
    await Purchases.logIn({ appUserID: uid });
    configuredForUid = uid;
  }
}

/** Extrai o status do entitlement a partir de um customerInfo. */
export function statusFromCustomerInfo(customerInfo: unknown): SubscriptionStatus {
  // eslint-disable-next-line
  const ci = customerInfo as any;
  const ent = ci?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!ent) return { isPremium: false, expirationDate: null, productIdentifier: null };
  return {
    isPremium: true,
    expirationDate: ent.expirationDate ?? null,
    productIdentifier: ent.productIdentifier ?? null,
  };
}

/**
 * Consulta o RevenueCat e devolve o status atual da assinatura.
 * Em caso de erro de rede/SDK, devolve null (chamador decide fallback).
 */
export async function fetchSubscriptionStatus(uid: string): Promise<SubscriptionStatus | null> {
  if (!(await isNative())) return null;
  try {
    await initPurchases(uid);
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return statusFromCustomerInfo(customerInfo);
  } catch (err) {
    console.error('[subscription] getCustomerInfo failed:', err);
    return null;
  }
}

/**
 * Restaura compras já feitas nesta conta Google (troca de aparelho,
 * reinstalação, ou compra que não refletiu). Devolve o status resultante.
 */
export async function restorePurchases(uid: string): Promise<SubscriptionStatus | null> {
  if (!(await isNative())) return null;
  await initPurchases(uid);
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.restorePurchases();
  return statusFromCustomerInfo(customerInfo);
}

/**
 * Espelha `subscriptionExpiresAt` no Firestore (único campo de assinatura
 * que as security rules permitem ao cliente alterar). Falha é tolerada:
 * o status real do usuário vem do RevenueCat, não deste espelho.
 */
export async function mirrorExpirationToFirestore(
  uid: string,
  status: SubscriptionStatus,
): Promise<void> {
  try {
    const { db, doc, updateDoc } = await import('../firebase');
    if (status.isPremium && status.expirationDate) {
      await updateDoc(doc(db, 'users', uid), {
        subscriptionExpiresAt: new Date(status.expirationDate).getTime(),
      });
    }
  } catch (err) {
    // permission-denied aqui é esperado em alguns estados; não é fatal.
    console.warn('[subscription] mirror to Firestore skipped:', err);
  }
}
