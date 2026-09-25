/**
 * Google Sheets & Firebase Auth Auto-Sync Engine
 * Uses Firebase Auth to obtain Google Workspace OAuth Access Token
 * and Google Sheets API v4 to create, update, and auto-sync wedding data.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// In-memory token cache (never store in localStorage)
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;
let isSigningIn = false;

// Google Auth Provider with Workspace Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({ prompt: 'select_account' });

export type AuthStateCallback = (user: User | null, accessToken: string | null) => void;
let authListenerCallback: AuthStateCallback | null = null;

export function initGoogleAuth(callback: AuthStateCallback) {
  authListenerCallback = callback;
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && cachedAccessToken) {
      callback(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      callback(user, null);
    }
  });
}

export async function signInWithGoogleWorkspace(): Promise<{ user: User; accessToken: string } | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    if (authListenerCallback) {
      authListenerCallback(currentUser, cachedAccessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    // Gracefully handle user cancellation or popup closed without throwing fatal error
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.code === 'auth/user-cancelled'
    ) {
      return null;
    }
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleWorkspace(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
  if (authListenerCallback) {
    authListenerCallback(null, null);
  }
}

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  errorMessage?: string;
}

/**
 * Creates or retrieves a Google Spreadsheet for the wedding
 */
export async function ensureWeddingSpreadsheet(existingId?: string): Promise<{ id: string; url: string }> {
  if (!cachedAccessToken) {
    throw new Error('Not authenticated with Google Workspace');
  }

  // If we already have an ID, verify it exists
  if (existingId) {
    try {
      const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}?fields=spreadsheetId,properties.title`, {
        headers: { Authorization: `Bearer ${cachedAccessToken}` }
      });
      if (checkRes.ok) {
        return {
          id: existingId,
          url: `https://docs.google.com/spreadsheets/d/${existingId}/edit`
        };
      }
    } catch {
      // Continue to create or search
    }
  }

  // Create a new spreadsheet with customized tabs and royal styling
  const createPayload = {
    properties: {
      title: 'Royal Indian Wedding Celebration 2026 - Master Planner',
      locale: 'en_IN',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: [
      { properties: { title: 'Dashboard & Summary', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Ceremonies Itinerary', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Budget & Expenses', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Vendors & Bookings', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Guests & RSVPs', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Ritual Checklists', gridProperties: { frozenRowCount: 1 } } }
    ]
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
  }

  const sheetData = await createRes.json();
  const id = sheetData.spreadsheetId;
  const url = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;

  return { id, url };
}

/**
 * Pushes all wedding data into the Google Spreadsheet
 */
export async function syncDataToGoogleSheet(
  spreadsheetId: string,
  state: any
): Promise<{ success: boolean; lastSyncedAt: string }> {
  if (!cachedAccessToken) {
    throw new Error('Please sign in to Google to sync.');
  }

  const nowFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // 1. Dashboard & Summary Tab
  const totalActual = (state.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
  const totalPaid = (state.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.paid) || 0), 0);
  const totalAttending = (state.guests || []).filter((g: any) => g.rsvp === 'Confirmed').reduce((sum: number, g: any) => sum + (Number(g.members) || 0), 0);
  const vendorsCount = (state.vendors || []).length;
  let pendingTasks = 0;
  if (state.rituals) {
    Object.values(state.rituals).forEach((list: any) => {
      pendingTasks += list.filter((t: any) => !t.done).length;
    });
  }

  const summaryValues = [
    ['METRIC / KPI', 'VALUE', 'REMARKS / DETAILS'],
    ['Celebration Title', 'Sharma & Verma Royal Wedding Celebration 2026', '6 Ceremonies (Nov 21 - 27, 2026)'],
    ['Target Budget', state.targetBudget || 2500000, 'INR Currency Target Limit'],
    ['Total Committed Expenses', totalActual, `INR ${(totalActual / 100000).toFixed(2)} Lakhs`],
    ['Total Amount Paid', totalPaid, `INR ${(totalPaid / 100000).toFixed(2)} Lakhs`],
    ['Total Balance Pending', totalActual - totalPaid, `INR ${((totalActual - totalPaid) / 100000).toFixed(2)} Lakhs`],
    ['Total Confirmed Guests', totalAttending, `${(state.guests || []).length} families registered`],
    ['Active Vendor Bookings', vendorsCount, 'Contracts on record'],
    ['Pending Ritual Tasks', pendingTasks, 'Across all 6 ceremonies'],
    ['Last Cloud Auto-Sync', nowFormatted, 'Live sync from Royal Wedding Platform'],
    ['', '', ''],
    ['CEREMONY SCHEDULE OVERVIEW', 'DATE & TIME', 'PRIMARY VENUE']
  ];

  (state.events || []).forEach((evt: any) => {
    summaryValues.push([`${evt.title} (${evt.hindi || ''})`, `${evt.dateStr} • ${evt.time}`, evt.venue]);
  });

  // 2. Ceremonies Itinerary Tab
  const ceremonyValues = [
    ['EVENT ID', 'CEREMONY TITLE', 'HINDI TITLE', 'DATE', 'TIME WINDOW', 'VENUE ADDRESS', 'COORDINATOR & PHONE', 'DRESS CODE', 'RITUAL & CULTURAL NOTES']
  ];
  (state.events || []).forEach((evt: any) => {
    ceremonyValues.push([
      evt.id,
      evt.title,
      evt.hindi || '',
      evt.dateStr,
      evt.time,
      evt.venue,
      evt.coordinator,
      evt.dressCode,
      evt.description
    ]);
  });

  // 3. Budget & Expenses Tab
  const expenseValues = [
    ['EXPENSE ID', 'ITEM / SERVICE NAME', 'EVENT TAG', 'CATEGORY', 'ESTIMATED (INR)', 'ACTUAL COST (INR)', 'PAID AMOUNT (INR)', 'BALANCE DUE (INR)', 'PAYMENT STATUS', 'NOTES & VENDOR DETAILS']
  ];
  (state.expenses || []).forEach((e: any) => {
    const act = Number(e.actual) || 0;
    const pd = Number(e.paid) || 0;
    expenseValues.push([
      e.id,
      e.name,
      e.event,
      e.category,
      e.estimated || 0,
      act,
      pd,
      act - pd,
      e.status,
      e.notes || ''
    ]);
  });

  // 4. Vendors & Bookings Tab
  const vendorValues = [
    ['VENDOR ID', 'BUSINESS / VENDOR NAME', 'SERVICE TYPE', 'ASSIGNED EVENT', 'CONTACT PERSON', 'PHONE NUMBER', 'CONTRACT AMOUNT (INR)', 'ADVANCE PAID (INR)', 'REMAINING BALANCE (INR)', 'STATUS', 'INCLUSIONS & NOTES']
  ];
  (state.vendors || []).forEach((v: any) => {
    const ca = Number(v.contractAmount) || 0;
    const ap = Number(v.advancePaid) || 0;
    vendorValues.push([
      v.id,
      v.name,
      v.service,
      v.event,
      v.contactPerson || '',
      v.phone || '',
      ca,
      ap,
      ca - ap,
      v.status,
      v.notes || ''
    ]);
  });

  // 5. Guests & RSVPs Tab
  const guestValues = [
    ['GUEST ID', 'FAMILY / GUEST NAME', 'SIDE', 'MEMBERS COUNT', 'HOTEL & ROOM', 'TRAVEL / FLIGHT DETAILS', 'RSVP STATUS', 'TILAK (NOV 21)', 'MATKOR (NOV 22)', 'MADWA (NOV 23)', 'BHATMAN (NOV 24)', 'BARAT (NOV 25)', 'RECEPTION (NOV 27)', 'PHONE / CONTACT']
  ];
  (state.guests || []).forEach((g: any) => {
    const ev = g.events || {};
    guestValues.push([
      g.id,
      g.name,
      g.side,
      g.members || 1,
      g.accommodation ? (g.hotel || 'Yes - Needs Hotel') : 'No Accommodation',
      g.transport || 'Local / None',
      g.rsvp,
      ev.tilak ? 'Attending' : 'No',
      ev.matkor ? 'Attending' : 'No',
      ev.madwa ? 'Attending' : 'No',
      ev.bhatman ? 'Attending' : 'No',
      ev.barat ? 'Attending' : 'No',
      ev.reception ? 'Attending' : 'No',
      g.contact || ''
    ]);
  });

  // 6. Ritual Checklists Tab
  const ritualValues = [
    ['TASK ID', 'CEREMONY', 'TASK / SAMAGRI ITEM', 'CATEGORY', 'COMPLETION STATUS', 'COORDINATOR INSTRUCTIONS / NOTES']
  ];
  if (state.rituals) {
    Object.entries(state.rituals).forEach(([eventId, taskList]: [string, any]) => {
      const evtName = (state.events || []).find((e: any) => e.id === eventId)?.title || eventId.toUpperCase();
      (taskList || []).forEach((t: any) => {
        ritualValues.push([
          t.id,
          evtName,
          t.text,
          t.category || 'Operations',
          t.done ? 'COMPLETED' : 'PENDING',
          t.notes || ''
        ]);
      });
    });
  }

  // Clear and update all 6 ranges in a batch
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: "'Dashboard & Summary'!A1:C50", values: summaryValues },
      { range: "'Ceremonies Itinerary'!A1:I50", values: ceremonyValues },
      { range: "'Budget & Expenses'!A1:J100", values: expenseValues },
      { range: "'Vendors & Bookings'!A1:K100", values: vendorValues },
      { range: "'Guests & RSVPs'!A1:N200", values: guestValues },
      { range: "'Ritual Checklists'!A1:F200", values: ritualValues }
    ]
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update Google Sheet values');
  }

  return { success: true, lastSyncedAt: nowFormatted };
}
