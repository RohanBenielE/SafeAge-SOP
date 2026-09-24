import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function register({ name, email, password, role }) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const seniorCode = role === 'senior' ? `SAFE-${credential.user.uid.slice(0, 6).toUpperCase()}` : null;
  await setDoc(doc(db, 'profiles', credential.user.uid), { name: name.trim(), email: email.trim(), role, seniorCode, createdAt: serverTimestamp() });
  return { user: credential.user, seniorCode };
}
export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
export const getProfile = async (uid) => ({ uid, ...(await getDoc(doc(db, 'profiles', uid))).data() });
export async function pairSenior(caregiverId, seniorCode) {
  const matches = await getDocs(query(collection(db, 'profiles'), where('seniorCode', '==', seniorCode.trim().toUpperCase())));
  if (matches.empty) throw new Error('Senior ID not found');
  const senior = matches.docs[0];
  if (senior.data().role !== 'senior') throw new Error('That ID is not a senior account');
  const duplicate = await getDocs(query(collection(db, 'caregiverLinks'), where('caregiverId', '==', caregiverId), where('seniorId', '==', senior.id)));
  if (!duplicate.empty) throw new Error('This senior is already paired');
  await addDoc(collection(db, 'caregiverLinks'), { caregiverId, seniorId: senior.id, seniorName: senior.data().name, seniorCode: senior.data().seniorCode, createdAt: serverTimestamp() });
  return { uid: senior.id, ...senior.data() };
}
export async function mySeniors(caregiverId) { const links = await getDocs(query(collection(db, 'caregiverLinks'), where('caregiverId', '==', caregiverId))); return links.docs.map((d) => ({ linkId: d.id, ...d.data() })); }
export const relinquishSenior = (linkId) => deleteDoc(doc(db, 'caregiverLinks', linkId));
