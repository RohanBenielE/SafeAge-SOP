
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

export function getMoodRef(userId, dateKey) {
  return doc(db, 'moodChecks', `${userId}_${dateKey}`);
}

export async function hasCompletedMood(userId, dateKey) {
  const moodRef = getMoodRef(userId, dateKey);
  const snapshot = await getDoc(moodRef);

  return snapshot.exists();
}

export async function saveDailyMood(userId, mood, dateKey) {
  const moodRef = getMoodRef(userId, dateKey);
  const existing = await getDoc(moodRef);

  if (existing.exists()) {
    return { alreadyCompleted: true };
  }

  await setDoc(moodRef, {
    seniorId: userId,
    mood,
    dateKey,
    createdAt: serverTimestamp(),
  });

  return { alreadyCompleted: false };
}
