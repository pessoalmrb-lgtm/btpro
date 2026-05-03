import { collection, query, where, getDocs, type Firestore } from 'firebase/firestore';

export async function generateUniqueUserTag(db: Firestore): Promise<string> {
  let tag = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digits for tag to differentiate from ID
    tag = `@user${randomNum}`;
    
    // Check if tag exists in Firestore
    const q = query(collection(db, 'users'), where('userTag', '==', tag));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      isUnique = true;
    }
    attempts++;
  }

  return tag;
}

export async function generateUniqueNumericId(db: Firestore): Promise<string> {
  let id = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
    id = `${randomNum}`;
    
    // Check if ID exists in Firestore
    const q = query(collection(db, 'users'), where('userNumericId', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      isUnique = true;
    }
    attempts++;
  }

  return id;
}
