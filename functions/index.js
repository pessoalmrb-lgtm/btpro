const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp();

const DATABASE_ID = 'ai-studio-5a4a0a12-9e66-4cf2-b944-e8d87bdedc8b';
const db = getFirestore(DATABASE_ID);

async function removeUserFromRanking(document, uid) {
  const data = document.data();
  if (data.ownerId === uid) {
    await db.recursiveDelete(document.ref);
    return;
  }

  const leagueAthletes = Array.isArray(data.leagueAthletes)
    ? data.leagueAthletes.filter(athlete => athlete?.id !== uid && athlete?.uid !== uid)
    : [];

  await document.ref.update({
    adminIds: FieldValue.arrayRemove(uid),
    athleteIds: FieldValue.arrayRemove(uid),
    leagueAthletes,
    ...(data.lastRankingResetBy === uid ? { lastRankingResetBy: 'deleted-user' } : {}),
  });
  await Promise.all([
    db.recursiveDelete(document.ref.collection('players').doc(uid)).catch(() => undefined),
    db.recursiveDelete(document.ref.collection('pendingRequests').doc(uid)).catch(() => undefined),
  ]);
}

exports.deleteAccount = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async request => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Faça login novamente para excluir a conta.');
    }

    if (request.data?.confirmation !== 'EXCLUIR') {
      throw new HttpsError('invalid-argument', 'A confirmação de exclusão é inválida.');
    }

    const uid = request.auth.uid;

    try {
      // Conteúdo criado pela conta. Subcoleções também são removidas.
      const [ownedRankings, ownedTournaments, accessCodes] = await Promise.all([
        db.collection('rankings').where('ownerId', '==', uid).get(),
        db.collection('tournaments').where('uid', '==', uid).get(),
        db.collection('tournamentAccessCodes').where('ownerUid', '==', uid).get(),
      ]);

      await Promise.all([
        ...ownedTournaments.docs.map(document => db.recursiveDelete(document.ref)),
        ...accessCodes.docs.map(document => document.ref.delete()),
      ]);

      // Remove a conta de ligas administradas por terceiros sem apagar a liga.
      const [adminRankings, athleteRankings] = await Promise.all([
        db.collection('rankings').where('adminIds', 'array-contains', uid).get(),
        db.collection('rankings').where('athleteIds', 'array-contains', uid).get(),
      ]);
      const rankingDocuments = new Map();
      for (const document of [...ownedRankings.docs, ...adminRankings.docs, ...athleteRankings.docs]) {
        rankingDocuments.set(document.id, document);
      }
      await Promise.all([...rankingDocuments.values()].map(document => removeUserFromRanking(document, uid)));

      // Solicitações pendentes podem existir mesmo quando o usuário ainda não
      // aparece em athleteIds. Elas também contêm identificação pessoal.
      const pendingRequests = await db.collectionGroup('pendingRequests').where('uid', '==', uid).get();
      await Promise.all(pendingRequests.docs.map(document => document.ref.delete()));

      await Promise.all([
        db.recursiveDelete(db.collection('users').doc(uid)).catch(() => undefined),
        db.recursiveDelete(db.collection('userSessions').doc(uid)).catch(() => undefined),
        db.recursiveDelete(db.collection('tournamentUsage').doc(uid)).catch(() => undefined),
      ]);

      // A foto do perfil é armazenada sob users/{uid}/.
      const bucket = getStorage().bucket();
      await Promise.all([
        bucket.deleteFiles({ prefix: `users/${uid}/` }),
        ...ownedRankings.docs.map(document => bucket.deleteFiles({ prefix: `rankings/${document.id}/` })),
      ]).catch(error => console.warn('Não foi possível remover todos os arquivos da conta:', error));

      // A conta do Firebase Authentication é apagada por último.
      await getAuth().deleteUser(uid);
      return { deleted: true };
    } catch (error) {
      console.error(`Falha ao excluir a conta ${uid}:`, error);
      throw new HttpsError('internal', 'Não foi possível concluir a exclusão. Tente novamente.');
    }
  },
);
