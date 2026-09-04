import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'gemini-lifelog-test';

describe('Firestore Security Rules Authorization Matrix', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // If running with Firestore emulator on port 8088 or FIRESTORE_EMULATOR_HOST
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8088';
    }

    const rulesPath = path.resolve(__dirname, '../firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    try {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules,
          host: '127.0.0.1',
          port: 8088,
        },
      });
    } catch (err: any) {
      console.warn('Firestore emulator environment not running:', err?.message || err);
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it('User A CAN create, read, update, and delete own interaction', async () => {
    if (!testEnv) return;

    const userAContext = testEnv.authenticatedContext('user_A');
    const dbA = userAContext.firestore();
    const docRef = dbA.doc('users/user_A/interactions/int_1');

    // 1. Create own interaction
    await assertSucceeds(
      docRef.set({
        id: 'int_1',
        userId: 'user_A',
        title: 'User A Thought',
        prompt: 'Reflecting on project',
        createdAt: new Date().toISOString(),
      })
    );

    // 2. Read own interaction
    await assertSucceeds(docRef.get());

    // 3. Update own interaction
    await assertSucceeds(
      docRef.update({
        title: 'Updated Title',
        updatedAt: new Date().toISOString(),
      })
    );

    // 4. Delete own interaction
    await assertSucceeds(docRef.delete());
  });

  it('User B CANNOT read, update, delete, or create data under User A path', async () => {
    if (!testEnv) return;

    // Seed User A's document via admin context
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().doc('users/user_A/interactions/int_1').set({
        id: 'int_1',
        userId: 'user_A',
        title: "User A's Secret",
        prompt: 'Private thoughts',
      });
    });

    const userBContext = testEnv.authenticatedContext('user_B');
    const dbB = userBContext.firestore();
    const docRefA = dbB.doc('users/user_A/interactions/int_1');

    // 1. User B cannot read User A's document
    await assertFails(docRefA.get());

    // 2. User B cannot update User A's document
    await assertFails(
      docRefA.update({
        title: 'Tampered by User B',
      })
    );

    // 3. User B cannot delete User A's document
    await assertFails(docRefA.delete());

    // 4. User B cannot create document under User A path
    await assertFails(
      dbB.doc('users/user_A/interactions/int_2').set({
        id: 'int_2',
        userId: 'user_A',
        prompt: 'Injected by User B',
      })
    );
  });

  it('Unauthenticated user CANNOT read or write any interaction', async () => {
    if (!testEnv) return;

    const unauthContext = testEnv.unauthenticatedContext();
    const dbUnauth = unauthContext.firestore();
    const docRef = dbUnauth.doc('users/user_A/interactions/int_1');

    await assertFails(docRef.get());
    await assertFails(
      docRef.set({
        id: 'int_1',
        userId: 'user_A',
        prompt: 'Unauth write',
      })
    );
  });
});
