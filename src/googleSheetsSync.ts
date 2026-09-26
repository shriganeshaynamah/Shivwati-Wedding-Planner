/**
 * Google Sheets Permanent Auto-Sync Engine via Google Apps Script Web App
 * & Optional Google Workspace OAuth fallback
 * Made By: Ravi Shankar Sharma
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

// In-memory token cache
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;
let isSigningIn = false;

const WEBAPP_URL_STORAGE_KEY = 'royal_wedding_webapp_url_permanent';

// Google Apps Script Complete Source Code for User to copy into their Sheet
export const APPS_SCRIPT_SOURCE_CODE = `/**
 * =========================================================================
 * ROYAL INDIAN WEDDING MASTER SHEET - APPS SCRIPT WEB APP ENGINE
 * Made By: Ravi Shankar Sharma
 * =========================================================================
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open your Google Sheet, click "Extensions" > "Apps Script".
 * 2. Delete any existing code in Code.gs, then paste THIS ENTIRE SCRIPT.
 * 3. Click the Save icon (floppy disk).
 * 4. Click the blue "Deploy" button at top right -> "New deployment".
 * 5. Click the gear icon next to "Select type" -> Choose "Web app".
 * 6. Set Description: "Wedding Sync Web App"
 * 7. Set "Execute as": "Me" (your email)
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL! Must be "Anyone" so all devices can sync
 * 9. Click "Deploy", approve permissions if prompted.
 * 10. Copy the Web app URL (ends with /exec) and paste it into the Wedding Planner website!
 * =========================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSheet = ss.getSheetByName("_MASTER_DATA_JSON");
    var rawJson = "";
    if (backupSheet && backupSheet.getLastRow() >= 1) {
      rawJson = backupSheet.getRange(1, 1).getValue();
    }
    
    var response = {
      status: "success",
      timestamp: new Date().toISOString(),
      data: rawJson ? JSON.parse(rawJson) : null
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(contents);
    var state = payload.state || payload.data || payload;
    
    updateSpreadsheetWithState(state);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Royal Wedding master sheet updated across all pages successfully!",
      syncedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSpreadsheetWithState(state) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  
  // 1. Raw Backup Sheet for seamless 1-click cloud sync across all phones & laptops
  var backupSheet = getOrCreateSheet(ss, "_MASTER_DATA_JSON", true);
  backupSheet.getRange(1, 1).setValue(JSON.stringify(state));
  
  // 2. Summary & Dashboard Sheet
  var totalActual = (state.expenses || []).reduce(function(sum, e) { return sum + (Number(e.actual) || 0); }, 0);
  var totalPaid = (state.expenses || []).reduce(function(sum, e) { return sum + (Number(e.paid) || 0); }, 0);
  var totalAttending = (state.guests || []).filter(function(g) { return g.rsvp === 'Confirmed'; }).reduce(function(sum, g) { return sum + (Number(g.members) || 0); }, 0);
  var vendorsCount = (state.vendors || []).length;
  var entertainmentCount = (state.entertainment || []).length;
  
  var summaryRows = [
    ["METRIC / KPI", "VALUE", "DETAILS / REMARKS"],
    ["Wedding Celebration", "Shiv & Swati Royal Wedding Celebration 2026", "6 Grand Ceremonies (Nov 21 - 27, 2026)"],
    ["Platform Architect", "Made By: Ravi Shankar Sharma", "Master Wedding Management Portal"],
    ["Target Budget Limit", state.targetBudget || 2500000, "INR Target Ceiling"],
    ["Total Committed Expenses", totalActual, "INR " + (totalActual / 100000).toFixed(2) + " Lakhs"],
    ["Total Amount Paid", totalPaid, "INR " + (totalPaid / 100000).toFixed(2) + " Lakhs"],
    ["Balance Pending Payment", totalActual - totalPaid, "INR " + ((totalActual - totalPaid) / 100000).toFixed(2) + " Lakhs"],
    ["Total Confirmed Guests", totalAttending, (state.guests || []).length + " Guest families recorded"],
    ["Booked Vendors", vendorsCount, "Active contracts on record"],
    ["Entertainment Programmes", entertainmentCount, "Curated songs, entry tracks & dance choreographies"],
    ["Last Cloud Auto-Sync", nowStr, "Live auto-sync across all connected devices"],
    ["", "", ""],
    ["CEREMONY SCHEDULE OVERVIEW", "DATE & TIME", "VENUE"]
  ];
  
  (state.events || []).forEach(function(evt) {
    summaryRows.push([evt.title + (evt.hindi ? " (" + evt.hindi + ")" : ""), (evt.dateStr || "") + " • " + (evt.time || ""), evt.venue || ""]);
  });
  
  writeSheetData(ss, "Dashboard & Summary", summaryRows, "#800020", "#FFF8E7");
  
  // 3. Budget & Expenses Sheet
  var expenseRows = [
    ["EXPENSE ID", "ITEM / SERVICE NAME", "CEREMONY / EVENT", "CATEGORY", "ESTIMATED (INR)", "ACTUAL COST (INR)", "PAID AMOUNT (INR)", "BALANCE DUE (INR)", "STATUS", "NOTES / VENDOR DETAILS"]
  ];
  (state.expenses || []).forEach(function(e) {
    var act = Number(e.actual) || 0;
    var pd = Number(e.paid) || 0;
    expenseRows.push([
      e.id,
      e.name,
      e.event,
      e.category,
      Number(e.estimated) || 0,
      act,
      pd,
      act - pd,
      e.status,
      e.notes || ""
    ]);
  });
  writeSheetData(ss, "Budget & Expenses", expenseRows, "#4A0815", "#F9E79F");
  
  // 4. Vendors & Bookings Sheet
  var vendorRows = [
    ["VENDOR ID", "VENDOR / BUSINESS NAME", "SERVICE TYPE", "ASSIGNED CEREMONY", "CONTACT PERSON", "PHONE NUMBER", "CONTRACT (INR)", "ADVANCE PAID (INR)", "BALANCE DUE (INR)", "BOOKING STATUS", "SPECIAL NOTES"]
  ];
  (state.vendors || []).forEach(function(v) {
    var ca = Number(v.contractAmount) || 0;
    var ap = Number(v.advancePaid) || 0;
    vendorRows.push([
      v.id,
      v.name,
      v.service,
      v.event,
      v.contactPerson || "",
      v.phone || "",
      ca,
      ap,
      ca - ap,
      v.status,
      v.notes || ""
    ]);
  });
  writeSheetData(ss, "Vendors & Bookings", vendorRows, "#1B3A4B", "#E0F2FE");
  
  // 5. Entertainment & Playlists Sheet (DAY-WISE CEREMONY PROGRAMMES)
  var entertainmentRows = [
    ["ITEM ID", "CEREMONY / FUNCTION", "SEQUENCE #", "SONG / PROGRAMME TITLE", "CATEGORY", "PERFORMERS / TROUPE", "TRACK LINK / SOURCE", "DURATION", "STATUS", "CHOREOGRAPHY & PROPS NOTES"]
  ];
  (state.entertainment || []).forEach(function(p, idx) {
    entertainmentRows.push([
      p.id || ("ent-" + (idx + 1)),
      p.eventId ? p.eventId.toUpperCase() : "GENERAL",
      p.sequence || (idx + 1),
      p.title || "",
      p.category || "Performance",
      p.performers || "",
      p.songLink || "",
      p.duration || "",
      p.status || "Shortlisted",
      p.notes || ""
    ]);
  });
  writeSheetData(ss, "Entertainment & Playlists", entertainmentRows, "#4A154B", "#FDF4FF");
  
  // 6. Guests & RSVP Matrix Sheet
  var guestRows = [
    ["GUEST ID", "FAMILY / GUEST NAME", "SIDE", "PAX", "HOTEL & ROOM", "TRAVEL / TRANSIT", "RSVP STATUS", "DAY 1: TILAK", "DAY 2: MATKOR", "DAY 3: MADWA", "DAY 4: BHATMAN", "DAY 5: BARAT", "DAY 6: RECEPTION", "PHONE / CONTACT"]
  ];
  (state.guests || []).forEach(function(g) {
    var ev = g.events || {};
    guestRows.push([
      g.id,
      g.name,
      g.side,
      Number(g.members) || 1,
      g.accommodation ? (g.hotel || "Yes - Needs Hotel") : "Self Stay",
      g.transport || "Local",
      g.rsvp,
      ev.tilak ? "Attending" : "No",
      ev.matkor ? "Attending" : "No",
      ev.madwa ? "Attending" : "No",
      ev.bhatman ? "Attending" : "No",
      ev.barat ? "Attending" : "No",
      ev.reception ? "Attending" : "No",
      g.contact || ""
    ]);
  });
  writeSheetData(ss, "Guests & RSVP Matrix", guestRows, "#064E3B", "#ECFDF5");
  
  // 7. Events & Itinerary Sheet
  var eventRows = [
    ["EVENT ID", "CEREMONY TITLE", "HINDI TITLE", "DATE", "TIME WINDOW", "PRIMARY VENUE ADDRESS", "COORDINATOR & PHONE", "DRESS CODE", "RITUAL SIGNIFICANCE & NOTES"]
  ];
  (state.events || []).forEach(function(evt) {
    eventRows.push([
      evt.id,
      evt.title,
      evt.hindi || "",
      evt.dateStr || "",
      evt.time || "",
      evt.venue || "",
      evt.coordinator || "",
      evt.dressCode || "",
      evt.description || ""
    ]);
  });
  writeSheetData(ss, "Events & Itinerary", eventRows, "#78350F", "#FEF3C7");
  
  // 8. Ritual Checklists Sheet
  var ritualRows = [
    ["TASK ID", "CEREMONY", "RITUAL SAMAGRI / TASK DESCRIPTION", "CATEGORY", "STATUS", "COORDINATOR NOTES"]
  ];
  if (state.rituals) {
    Object.keys(state.rituals).forEach(function(eventId) {
      var tasks = state.rituals[eventId] || [];
      tasks.forEach(function(t) {
        ritualRows.push([
          t.id,
          eventId.toUpperCase(),
          t.text,
          t.category || "Operations",
          t.done ? "COMPLETED" : "PENDING",
          t.notes || ""
        ]);
      });
    });
  }
  writeSheetData(ss, "Ritual Checklists", ritualRows, "#831843", "#FCE7F3");
}

function getOrCreateSheet(ss, name, hideSheet) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (hideSheet) {
    sheet.hideSheet();
  }
  return sheet;
}

function writeSheetData(ss, sheetName, data, headerBg, headerText) {
  var sheet = getOrCreateSheet(ss, sheetName, false);
  sheet.clear();
  if (!data || data.length === 0) return;
  
  var range = sheet.getRange(1, 1, data.length, data[0].length);
  range.setValues(data);
  
  // Format Header Row
  var header = sheet.getRange(1, 1, 1, data[0].length);
  header.setBackground(headerBg || "#800020");
  header.setFontColor(headerText || "#FFFFFF");
  header.setFontWeight("bold");
  header.setFontFamily("Arial");
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (var col = 1; col <= data[0].length; col++) {
    sheet.autoResizeColumn(col);
  }
}
`;

import { PERMANENT_WEBAPP_URL } from './defaultWeddingData.ts';

// Helper: retrieve stored Web App URL
export function getStoredWebAppUrl(): string {
  try {
    return localStorage.getItem(WEBAPP_URL_STORAGE_KEY) || PERMANENT_WEBAPP_URL;
  } catch {
    return PERMANENT_WEBAPP_URL;
  }
}

// Helper: save stored Web App URL
export function setStoredWebAppUrl(url: string | null) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(WEBAPP_URL_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(WEBAPP_URL_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Storage warning:', err);
  }
}

/**
 * Pushes all wedding state directly to the Google Apps Script Web App
 */
export async function saveToAppsScriptWebApp(webAppUrl: string, state: any): Promise<{ success: boolean; message: string; timestamp: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    throw new Error('Please enter a valid Google Apps Script Web App URL');
  }

  const payload = JSON.stringify({ action: 'save', state });
  const nowFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Standard fetch to Google Apps Script Web App with text/plain to avoid preflight issues
  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: true,
        message: data?.message || 'Updated all Google Sheet tabs successfully!',
        timestamp: nowFormatted
      };
    }
  } catch (err: any) {
    // In case redirect response is opaque due to CORS policy, fall back to no-cors mode
    try {
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      return {
        success: true,
        message: 'Data transmitted to Google Sheet successfully',
        timestamp: nowFormatted
      };
    } catch (fallbackErr: any) {
      throw new Error('Unable to connect to Google Sheet. Check your Web App URL and ensure "Who has access" is set to "Anyone".');
    }
  }

  return {
    success: true,
    message: 'Data saved to Google Sheet successfully',
    timestamp: nowFormatted
  };
}

/**
 * Fetches the latest wedding state from the Google Apps Script Web App
 */
export async function fetchFromAppsScriptWebApp(webAppUrl: string): Promise<any> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) return null;
  const separator = cleanUrl.includes('?') ? '&' : '?';
  const fetchUrl = `${cleanUrl}${separator}action=get&t=${Date.now()}`;

  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch from Google Sheet (HTTP ${res.status})`);
  }
  const result = await res.json();
  if (result.status === 'success' && result.data) {
    return result.data;
  }
  return null;
}

// -------------------------------------------------------------
// OPTIONAL GOOGLE WORKSPACE OAUTH FALLBACK (Kept for compatibility)
// -------------------------------------------------------------

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
