/**
 * Google Sheet Permanent Multi-Device Sync Modal & Controller
 * Made By: Ravi Shankar Sharma
 */

import {
  APPS_SCRIPT_SOURCE_CODE,
  getStoredWebAppUrl,
  setStoredWebAppUrl,
  saveToAppsScriptWebApp,
  fetchFromAppsScriptWebApp
} from './googleSheetsSync.ts';
import { appState, saveData, showToast, closeModal, renderDashboard, updateSyncStatusUI } from './app.ts';

export function openGoogleSheetLinkModal() {
  const currentUrl = getStoredWebAppUrl() || appState.googleWebAppUrl || '';
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 border border-gold/40 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>

        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-file-excel"></i>
          </div>
          <div>
            <h3 class="text-xl font-cinzel font-bold text-maroon">
              Link Google Sheet Permanently
            </h3>
            <p class="text-xs text-slate-500">Sync all pages and wedding details across all devices seamlessly</p>
          </div>
        </div>

        <!-- Connection Status Banner -->
        <div class="p-3 rounded-xl mb-4 text-xs flex items-center justify-between ${currentUrl ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-amber-50 border border-amber-300 text-amber-900'}">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${currentUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
            <span class="font-bold">${currentUrl ? 'Google Sheet Web App Linked' : 'Google Sheet Not Linked Yet'}</span>
          </div>
          ${appState.lastSyncedAt ? `<span class="text-[11px] text-slate-500">Last Synced: ${appState.lastSyncedAt}</span>` : ''}
        </div>

        <!-- Step 1: Apps Script Code to Copy -->
        <div class="mb-4 bg-slate-900 text-slate-200 p-3.5 rounded-xl border border-slate-700 text-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-gold text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-code"></i> Step 1: Copy Google Apps Script Code
            </span>
            <button onclick="window.copyAppsScriptCode()" id="btn-copy-code" class="px-3 py-1 bg-gold hover:bg-gold-dark text-maroon-dark rounded-md text-[11px] font-bold transition-all flex items-center gap-1">
              <i class="fa-solid fa-copy"></i> <span>Copy Apps Script Code</span>
            </button>
          </div>
          <p class="text-[11px] text-slate-400 mb-2">
            Open your Google Sheet &rarr; Click <b>Extensions &gt; Apps Script</b> &rarr; Paste this code &rarr; Deploy as <b>Web App</b> with access set to <b>"Anyone"</b>.
          </p>
          <div class="max-h-28 overflow-y-auto custom-scrollbar font-mono text-[10px] bg-black/50 p-2.5 rounded-lg border border-slate-800 text-amber-200/90 select-all whitespace-pre-wrap">
${APPS_SCRIPT_SOURCE_CODE.slice(0, 500)}...
(Click 'Copy Apps Script Code' button above to get the full script)
          </div>
        </div>

        <!-- Step 2: Paste Web App URL -->
        <div class="space-y-3 text-xs mb-4">
          <label class="block font-bold text-slate-800">
            Step 2: Paste Your Deployed Web App URL (/exec) *
          </label>
          <div class="relative">
            <input type="url" id="modal-webapp-url-input" value="${currentUrl}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full pl-3 pr-24 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-gold font-mono text-xs">
            <button onclick="window.handleSaveWebAppUrl()" class="absolute right-1 top-1 bottom-1 px-3 bg-maroon hover:bg-maroon-deep text-gold-light rounded-md font-bold text-[11px] transition-colors">
              Save URL
            </button>
          </div>
          <p class="text-[11px] text-slate-500">
            Must end with <code class="bg-slate-100 text-maroon px-1 py-0.5 rounded">/exec</code>. Once saved, every device will automatically sync to this sheet!
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <div class="flex items-center gap-2">
            ${currentUrl ? `
              <button onclick="window.handleDisconnectWebApp()" class="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors">
                Disconnect
              </button>
            ` : ''}
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.closeModal()" class="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold text-xs">
              Close
            </button>
            <button onclick="window.fetchDataFromGoogleSheet()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors" title="Fetch latest data from Google Sheet into this browser">
              <i class="fa-solid fa-cloud-arrow-down text-blue-600"></i> Fetch from Sheet
            </button>
            <button onclick="window.pushDataToGoogleSheet()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors" title="Save all website data to Google Sheet now">
              <i class="fa-solid fa-cloud-arrow-up text-gold-light"></i> Push to Sheet Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function copyAppsScriptCode() {
  navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE).then(() => {
    const btn = document.getElementById('btn-copy-code');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> <span>Copied to Clipboard!</span>';
      setTimeout(() => {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-copy"></i> <span>Copy Apps Script Code</span>';
      }, 3000);
    }
    showToast('Apps Script code copied to clipboard! Paste it in Extensions > Apps Script in Google Sheets.', 'success');
  }).catch(() => {
    showToast('Unable to copy automatically. Please select text manually.', 'error');
  });
}

export function handleSaveWebAppUrl() {
  const input = document.getElementById('modal-webapp-url-input') as HTMLInputElement;
  const url = input?.value.trim() || '';

  if (!url) {
    showToast('Please enter a Web App URL', 'error');
    return;
  }

  if (!url.startsWith('https://script.google.com/macros/s/')) {
    showToast('Warning: Ensure this is a valid Google Apps Script Web App URL (/exec)', 'info');
  }

  setStoredWebAppUrl(url);
  appState.googleWebAppUrl = url;
  saveData(false);
  updateSyncStatusUI('synced');
  showToast('Google Sheet Web App URL saved permanently! Syncing data...', 'success');
  pushDataToGoogleSheet();
}

export function handleDisconnectWebApp() {
  setStoredWebAppUrl(null);
  appState.googleWebAppUrl = '';
  saveData(false);
  updateSyncStatusUI('offline');
  closeModal();
  showToast('Google Sheet disconnected from this device.', 'info');
}

export async function pushDataToGoogleSheet() {
  const url = getStoredWebAppUrl() || appState.googleWebAppUrl;
  if (!url) {
    openGoogleSheetLinkModal();
    return;
  }

  showToast('Saving data to Google Sheet...', 'info');
  updateSyncStatusUI('syncing');

  try {
    const res = await saveToAppsScriptWebApp(url, appState);
    appState.lastSyncedAt = res.timestamp;
    saveData(false);
    updateSyncStatusUI('synced');
    showToast('Saved to Google Sheet successfully!', 'success');
  } catch (err: any) {
    updateSyncStatusUI('error', err.message);
    showToast(err.message || 'Saved locally. Google Sheet sync will retry.', 'error');
  }
}

export async function fetchDataFromGoogleSheet() {
  const url = getStoredWebAppUrl() || appState.googleWebAppUrl;
  if (!url) {
    openGoogleSheetLinkModal();
    return;
  }

  showToast('Fetching latest wedding details from Google Sheet...', 'info');
  updateSyncStatusUI('syncing');

  try {
    const cloudData = await fetchFromAppsScriptWebApp(url);
    if (cloudData && cloudData.expenses && cloudData.vendors) {
      // Merge while preserving newly entered fields
      Object.assign(appState, cloudData);
      appState.lastSyncedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      saveData(false);
      updateSyncStatusUI('synced');
      renderDashboard();
      closeModal();
      showToast('Successfully synchronized latest data from Google Sheet!', 'success');
    } else {
      showToast('Sheet connected! Ready for initial push to create pages.', 'info');
      updateSyncStatusUI('synced');
    }
  } catch (err: any) {
    updateSyncStatusUI('error', err.message);
    showToast(err.message || 'Failed to fetch from Google Sheet', 'error');
  }
}
