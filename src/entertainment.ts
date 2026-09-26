/**
 * Function Day-Wise Entertainment & Programmes Manager
 * Songs, dance performances, special entry tracks, and anchoring sequence for 6 wedding ceremonies.
 * Made By: Ravi Shankar Sharma
 */

import { appState, saveData, showToast, showConfirmDialog, closeModal } from './app.ts';
import type { EntertainmentItem } from './defaultWeddingData.ts';
import { DEFAULT_ENTERTAINMENT } from './defaultWeddingData.ts';

export type { EntertainmentItem };
export { DEFAULT_ENTERTAINMENT };

let activeEntertainmentDayFilter = 'ALL';

export function getActiveEntertainmentDay(): string {
  return activeEntertainmentDayFilter;
}

export function setEntertainmentDayFilter(dayId: string) {
  activeEntertainmentDayFilter = dayId;
  renderEntertainment();
}

export function renderEntertainment() {
  if (!appState.entertainment || !Array.isArray(appState.entertainment)) {
    appState.entertainment = JSON.parse(JSON.stringify(DEFAULT_ENTERTAINMENT));
  }

  const items: EntertainmentItem[] = appState.entertainment;

  // Update Stats
  const totalEl = document.getElementById('ent-stat-total');
  const readyEl = document.getElementById('ent-stat-ready');
  const rehearsingEl = document.getElementById('ent-stat-rehearsing');
  const entriesEl = document.getElementById('ent-stat-entries');
  const kpiCountEl = document.getElementById('kpi-entertainment-count');

  if (totalEl) totalEl.innerText = String(items.length);
  if (kpiCountEl) kpiCountEl.innerText = `${items.length} Songs`;
  if (readyEl) readyEl.innerText = String(items.filter(i => i.status === 'Ready / Finalized').length);
  if (rehearsingEl) rehearsingEl.innerText = String(items.filter(i => i.status === 'Rehearsing').length);
  if (entriesEl) entriesEl.innerText = String(items.filter(i => i.category === 'Entry Song' || i.category === 'Couple Special').length);

  // Sync & populate Ceremony Filter Dropdown
  const selectDropdown = document.getElementById('entertainment-day-filter-select') as HTMLSelectElement;
  if (selectDropdown) {
    const daysConfig = [
      { id: 'ALL', label: 'All Ceremonies (Complete Playlists)' },
      { id: 'tilak', label: 'Day 1 • Tilak (Nov 21)' },
      { id: 'matkor', label: 'Day 2 • Matkor (Nov 22)' },
      { id: 'madwa', label: 'Day 3 • Madwa (Nov 23)' },
      { id: 'bhatman', label: 'Day 4 • Bhatman (Nov 24)' },
      { id: 'barat', label: 'Day 5 • Barat (Nov 25)' },
      { id: 'reception', label: 'Day 6 • Reception (Nov 27)' }
    ];
    selectDropdown.innerHTML = daysConfig.map(d => {
      const count = items.filter(i => d.id === 'ALL' || i.eventId === d.id).length;
      return `<option value="${d.id}" ${activeEntertainmentDayFilter === d.id ? 'selected' : ''}>${d.label} (${count} Songs)</option>`;
    }).join('');
  }

  // Active Day Banner
  const currentEvent = (appState.events || []).find((e: any) => e.id === activeEntertainmentDayFilter);
  const bannerContainer = document.getElementById('active-entertainment-banner');

  if (bannerContainer) {
    if (currentEvent) {
      bannerContainer.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-maroon text-gold flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-music"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-cinzel font-bold text-sm sm:text-base text-maroon truncate">${currentEvent.title} • Entertainment Flow</h4>
            <p class="text-xs text-slate-600 truncate">${currentEvent.dateStr} • ${currentEvent.venue}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg">
            Coordinator: ${currentEvent.coordinator.split('(')[0]}
          </span>
        </div>
      `;
      bannerContainer.classList.remove('hidden');
    } else {
      bannerContainer.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-gold/20 text-maroon flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-guitar"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-cinzel font-bold text-sm sm:text-base text-maroon">Complete Wedding Entertainment & Musical Flow</h4>
            <p class="text-xs text-slate-600">Showing playlists, choreographies & song sequences across all 6 festivities</p>
          </div>
        </div>
        <button onclick="window.openEntertainmentModal()" class="text-xs font-bold text-maroon hover:text-gold-dark flex items-center gap-1">
          <i class="fa-solid fa-plus"></i> Add New Track
        </button>
      `;
    }
  }

  // Filter items
  const searchInput = (document.getElementById('entertainment-search') as HTMLInputElement)?.value.toLowerCase().trim() || '';
  const catFilter = (document.getElementById('entertainment-filter-category') as HTMLSelectElement)?.value || 'ALL';
  const statusFilter = (document.getElementById('entertainment-filter-status') as HTMLSelectElement)?.value || 'ALL';

  let filtered = items.filter(item => {
    if (activeEntertainmentDayFilter !== 'ALL' && item.eventId !== activeEntertainmentDayFilter) return false;
    if (catFilter !== 'ALL' && item.category !== catFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchInput) {
      const match = (item.title || '').toLowerCase().includes(searchInput) ||
                    (item.performers || '').toLowerCase().includes(searchInput) ||
                    (item.notes || '').toLowerCase().includes(searchInput) ||
                    (item.songLink || '').toLowerCase().includes(searchInput);
      if (!match) return false;
    }
    return true;
  });

  const countEl = document.getElementById('entertainment-filter-count');
  if (countEl) countEl.innerText = `${filtered.length} songs shown`;

  const container = document.getElementById('entertainment-items-container');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 royal-card">
        <i class="fa-solid fa-music text-3xl mb-2 text-gold/60"></i>
        <p class="text-sm font-semibold">No songs or performances found matching your filter</p>
        <button onclick="window.openEntertainmentModal()" class="mt-3 px-4 py-2 bg-maroon text-gold-light rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
          <i class="fa-solid fa-plus"></i> Add First Song for this Function
        </button>
      </div>
    `;
    return;
  }

  // Category badge colors
  const catColors: Record<string, string> = {
    'Entry Song': 'bg-rose-100 text-rose-800 border-rose-300',
    'Dance Performance': 'bg-purple-100 text-purple-800 border-purple-300',
    'Couple Special': 'bg-pink-100 text-pink-800 border-pink-300',
    'Folk / Traditional Geet': 'bg-amber-100 text-amber-900 border-amber-300',
    'DJ / BGM Track': 'bg-blue-100 text-blue-800 border-blue-300',
    'Anchoring / Sequence': 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };

  // Status colors
  const statusColors: Record<string, string> = {
    'Ready / Finalized': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Rehearsing': 'bg-amber-100 text-amber-800 border-amber-300',
    'Shortlisted': 'bg-slate-100 text-slate-700 border-slate-300'
  };

  container.innerHTML = filtered.map(item => {
    const evt = (appState.events || []).find((e: any) => e.id === item.eventId);
    const evtName = evt ? evt.title.split(' ')[0] : item.eventId.toUpperCase();

    return `
      <div class="royal-card p-4 flex flex-col justify-between hover:border-gold transition-all relative group bg-white/95">
        <div>
          <!-- Header: Sequence & Status Badge -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-full bg-maroon text-gold-light text-xs font-bold flex items-center justify-center shrink-0">
                #${item.sequence || 1}
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-gold/40">
                ${evtName}
              </span>
            </div>
            
            <button onclick="window.cycleEntertainmentStatus('${item.id}')" title="Click to change status" class="px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform active:scale-95 cursor-pointer ${statusColors[item.status] || 'bg-slate-100 text-slate-700 border-slate-300'}">
              <i class="fa-solid fa-arrows-rotate text-[9px] mr-1 opacity-70"></i>${item.status}
            </button>
          </div>

          <!-- Title -->
          <h4 class="font-cinzel font-bold text-sm sm:text-base text-maroon leading-snug line-clamp-2 mb-1.5">
            ${item.title}
          </h4>

          <!-- Category Pill -->
          <div class="mb-2.5">
            <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catColors[item.category] || 'bg-slate-100 text-slate-700 border-slate-300'}">
              ${item.category}
            </span>
            ${item.duration ? `<span class="text-[11px] text-slate-500 font-medium ml-2"><i class="fa-regular fa-clock text-[10px]"></i> ${item.duration}</span>` : ''}
          </div>

          <!-- Performers -->
          <div class="text-xs text-slate-700 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
            <p class="font-semibold text-slate-900 text-[11px] flex items-center gap-1.5 mb-0.5">
              <i class="fa-solid fa-user-group text-gold-dark text-[10px]"></i> Performers / Lead:
            </p>
            <p class="text-xs text-slate-700 pl-4 font-medium">${item.performers || 'General Track'}</p>
          </div>

          <!-- Notes / Props -->
          ${item.notes ? `
            <p class="text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded-lg border border-gold/20 mb-3 leading-relaxed">
              <i class="fa-solid fa-lightbulb text-gold mr-1"></i>${item.notes}
            </p>
          ` : ''}

          <!-- Song Link / Source -->
          ${item.songLink ? `
            <div class="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mb-2">
              <i class="fa-solid fa-link text-slate-400 text-[10px]"></i>
              <span class="truncate font-medium text-slate-600">${item.songLink}</span>
            </div>
          ` : ''}
        </div>

        <!-- Footer Actions -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
          <span class="text-[10px] text-slate-400">Function: ${evt ? evt.title : item.eventId}</span>
          <div class="flex items-center gap-2">
            <button onclick="window.openEntertainmentModal('${item.id}')" class="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-gold hover:text-maroon-dark text-slate-700 font-semibold transition-colors flex items-center gap-1">
              <i class="fa-solid fa-pen text-[10px]"></i> Edit
            </button>
            <button onclick="window.deleteEntertainment('${item.id}')" class="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-semibold transition-colors flex items-center gap-1">
              <i class="fa-solid fa-trash text-[10px]"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function cycleEntertainmentStatus(id: string) {
  const item = (appState.entertainment || []).find((i: EntertainmentItem) => i.id === id);
  if (!item) return;

  if (item.status === 'Shortlisted') {
    item.status = 'Rehearsing';
  } else if (item.status === 'Rehearsing') {
    item.status = 'Ready / Finalized';
  } else {
    item.status = 'Shortlisted';
  }

  saveData(true);
  renderEntertainment();
  showToast(`${item.title} marked as ${item.status}`);
}

export function openEntertainmentModal(editId?: string) {
  const existing = editId ? (appState.entertainment || []).find((i: EntertainmentItem) => i.id === editId) : null;
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  const eventsList = appState.events || [];

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-gold/40 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          ${existing ? 'Edit Song / Programme' : 'Add New Entertainment Track'}
        </h3>
        <p class="text-xs text-slate-500 mb-4">Set choreography details, performer credits, track length & ceremony</p>

        <form id="entertainment-form" onsubmit="window.handleSaveEntertainment(event, '${editId || ''}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Song / Performance Title *</label>
            <input type="text" id="modal-ent-title" required value="${existing ? existing.title : ''}" placeholder="e.g. Kala Chashma - Groom & Squad Swag Entry" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Ceremony / Function *</label>
              <select id="modal-ent-event" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                ${eventsList.map((e: any) => `
                  <option value="${e.id}" ${existing ? (existing.eventId === e.id ? 'selected' : '') : (activeEntertainmentDayFilter === e.id ? 'selected' : '')}>
                    ${e.title}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Performance Category *</label>
              <select id="modal-ent-cat" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Entry Song" ${existing && existing.category === 'Entry Song' ? 'selected' : ''}>Entry Song</option>
                <option value="Dance Performance" ${existing && existing.category === 'Dance Performance' ? 'selected' : ''}>Dance Performance</option>
                <option value="Couple Special" ${existing && existing.category === 'Couple Special' ? 'selected' : ''}>Couple Special</option>
                <option value="Folk / Traditional Geet" ${existing && existing.category === 'Folk / Traditional Geet' ? 'selected' : ''}>Folk / Traditional Geet</option>
                <option value="DJ / BGM Track" ${existing && existing.category === 'DJ / BGM Track' ? 'selected' : ''}>DJ / BGM Track</option>
                <option value="Anchoring / Sequence" ${existing && existing.category === 'Anchoring / Sequence' ? 'selected' : ''}>Anchoring / Sequence</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Sequence #</label>
              <input type="number" id="modal-ent-seq" min="1" value="${existing ? existing.sequence : '1'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Duration</label>
              <input type="text" id="modal-ent-dur" value="${existing && existing.duration ? existing.duration : '3:30 mins'}" placeholder="e.g. 3:45 mins" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Rehearsal Status</label>
              <select id="modal-ent-status" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Ready / Finalized" ${existing && existing.status === 'Ready / Finalized' ? 'selected' : ''}>Ready / Finalized</option>
                <option value="Rehearsing" ${existing && existing.status === 'Rehearsing' ? 'selected' : (!existing ? 'selected' : '')}>Rehearsing</option>
                <option value="Shortlisted" ${existing && existing.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Performers / Troupe / Couple *</label>
            <input type="text" id="modal-ent-performers" required value="${existing ? existing.performers : ''}" placeholder="e.g. Groom with Groomsmen, or Bride Solo" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Track Link / Spotify / Audio File</label>
            <input type="text" id="modal-ent-link" value="${existing && existing.songLink ? existing.songLink : ''}" placeholder="e.g. Spotify URL, YouTube link or Track MP3 name" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Choreography & Props Notes</label>
            <textarea id="modal-ent-notes" rows="2" placeholder="e.g. Props: LED sticks, sunglasses. Cold fire pyros at hook step." class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">${existing && existing.notes ? existing.notes : ''}</textarea>
          </div>

          <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">
              ${existing ? 'Update Song' : 'Add to Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveEntertainment(event: Event, editId?: string) {
  event.preventDefault();
  const title = (document.getElementById('modal-ent-title') as HTMLInputElement).value.trim();
  const eventId = (document.getElementById('modal-ent-event') as HTMLSelectElement).value;
  const category = (document.getElementById('modal-ent-cat') as HTMLSelectElement).value;
  const sequence = Number((document.getElementById('modal-ent-seq') as HTMLInputElement).value) || 1;
  const duration = (document.getElementById('modal-ent-dur') as HTMLInputElement).value.trim();
  const status = (document.getElementById('modal-ent-status') as HTMLSelectElement).value as any;
  const performers = (document.getElementById('modal-ent-performers') as HTMLInputElement).value.trim();
  const songLink = (document.getElementById('modal-ent-link') as HTMLInputElement).value.trim();
  const notes = (document.getElementById('modal-ent-notes') as HTMLTextAreaElement).value.trim();

  if (!appState.entertainment) {
    appState.entertainment = [];
  }

  if (editId) {
    const item = appState.entertainment.find((i: EntertainmentItem) => i.id === editId);
    if (item) {
      Object.assign(item, { title, eventId, category, sequence, duration, status, performers, songLink, notes });
    }
    showToast('Entertainment item updated!');
  } else {
    appState.entertainment.push({
      id: 'ent-' + Date.now(),
      title,
      eventId,
      category,
      sequence,
      duration,
      status,
      performers,
      songLink,
      notes
    });
    showToast('New song added to playlist!');
  }

  saveData(true);
  closeModal();
  renderEntertainment();
}

export function deleteEntertainment(id: string) {
  const item = (appState.entertainment || []).find((i: EntertainmentItem) => i.id === id);
  const itemName = item ? item.title : 'this song';

  showConfirmDialog({
    title: 'Remove Song / Programme',
    message: `Are you sure you want to remove "${itemName}" from the wedding entertainment itinerary?`,
    confirmLabel: 'Remove Track',
    onConfirm: () => {
      appState.entertainment = (appState.entertainment || []).filter((i: EntertainmentItem) => i.id !== id);
      saveData(true);
      renderEntertainment();
      showToast(`Removed "${itemName}"`, 'info');
    }
  });
}
