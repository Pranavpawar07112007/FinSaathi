'use server';

import { getFirebaseApp } from '@/firebase/server-app';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

const deleteAccountSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
});

/**
 * Deletes an account and all associated transactions.
 * This is a critical server action that ensures data integrity.
 */
export async function deleteAccountAndTransactionsAction(
  data: z.infer<typeof deleteAccountSchema>
) {
  const validatedFields = deleteAccountSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid user or account ID.' };
  }

  const { userId, accountId } = validatedFields.data;
  const { firestore } = getFirebaseApp();

  try {
    const batch = writeBatch(firestore);

    // 1. Find all transactions linked to this account
    const transactionsRef = collection(firestore, 'users', userId, 'transactions');
    
    // Query for transactions where the account is the main account, source, or destination
    const q1 = query(transactionsRef, where('accountId', '==', accountId));
    const q2 = query(transactionsRef, where('fromAccountId', '==', accountId));
    const q3 = query(transactionsRef, where('toAccountId', '==', accountId));
    
    const [q1Snap, q2Snap, q3Snap] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
        getDocs(q3),
    ]);

    const transactionIdsToDelete = new Set<string>();
    q1Snap.forEach(doc => transactionIdsToDelete.add(doc.id));
    q2Snap.forEach(doc => transactionIdsToDelete.add(doc.id));
    q3Snap.forEach(doc => transactionIdsToDelete.add(doc.id));

    // 2. Add transaction deletions to the batch
    transactionIdsToDelete.forEach(id => {
        const transactionDocRef = doc(firestore, 'users', userId, 'transactions', id);
        batch.delete(transactionDocRef);
    });

    // 3. Delete the account itself
    const accountDocRef = doc(firestore, 'users', userId, 'accounts', accountId);
    batch.delete(accountDocRef);

    // 4. Commit the batch operation
    await batch.commit();

    return { success: 'Account and all associated transactions have been deleted.' };

  } catch (error) {
    console.error('Error deleting account and transactions:', error);
    return { error: 'A server error occurred. Could not complete the deletion.' };
  }
}
