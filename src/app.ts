/**
 * Royal Indian Wedding Management Platform - Main Controller
 * Fully editable dashboard, itinerary, budget, vendors, guests, rituals & Google Sheets Auto-Sync
 */

import Chart from 'chart.js/auto';
import {
  initGoogleAuth,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  ensureWeddingSpreadsheet,
  syncDataToGoogleSheet,
  getCurrentUser,
  getCachedToken
} from './googleSheetsSync.ts';

const STORAGE_KEY = 'royal_wedding_planner_2026_data';

// Default 6-event sequences
export const DEFAULT_EVENTS = [
  {
    id: 'tilak',
    title: 'Tilak Ceremony',
    hindi: 'तिलक उत्सव',
    dateStr: 'November 21, 2026',
    venue: 'The Grand Heritage Ballroom, Lucknow',
    time: '11:00 AM - 04:00 PM',
    coordinator: 'Rajesh Sharma (+91 98765 43210)',
    description: 'Auspicious welcoming of groom & family, tilak applying by bride\'s brother & elders, presentation of sacred shagun gifts, gold coins, and sweets.',
    dressCode: 'Royal Yellow / Mustard Kurta Pajama & Sarees',
    tagColor: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    id: 'matkor',
    title: 'Matkor Ceremony',
    hindi: 'मटकोर पूजा',
    dateStr: 'November 22, 2026',
    venue: 'Ancestral Courtyard & Riverbank Route',
    time: '04:00 PM - 08:30 PM',
    coordinator: 'Sunita Sharma & Chachi Ji (+91 98765 43211)',
    description: 'Traditional soil collection ritual by married ladies, singing folk Mangal Geet with dhol, bringing blessed clay to construct the sacred wedding chulha.',
    dressCode: 'Traditional Bandhani / Leheriya Orange & Red',
    tagColor: 'bg-orange-100 text-orange-900 border-orange-300'
  },
  {
    id: 'madwa',
    title: 'Madwa (Mandap Chhadan)',
    hindi: 'मड़वा पूजन',
    dateStr: 'November 23, 2026',
    venue: 'Palace Central Lawns, Pavilion A',
    time: '09:30 AM - 02:00 PM',
    coordinator: 'Manoj Sharma (+91 98765 43212)',
    description: 'Erection of the holy bamboo & mango leaf canopy (Madwa), Harish wooden pillar installation, Gauri-Ganesh sthapana, and Kuldevta invocation.',
    dressCode: 'Pastel Peach, Mint Green & Ivory Silks',
    tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    id: 'bhatman',
    title: 'Bhatman (Mamere Feast)',
    hindi: 'भात / मायरा पूजन',
    dateStr: 'November 24, 2026',
    venue: 'The Royal Sheesh Mahal Dining Pavilion',
    time: '12:00 PM - 05:00 PM',
    coordinator: 'Ramesh Varma (Mama Ji) (+91 98765 43213)',
    description: 'Grand festive reception of maternal uncles (Nanihal / Mama-Mami), presentation of bridal jewelry, wedding trousseau, and lavish sit-down traditional feast.',
    dressCode: 'Banarasi Brocade & Royal Magenta / Fuchsia',
    tagColor: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  {
    id: 'barat',
    title: 'Barat & Sacred Wedding',
    hindi: 'शुभ विवाह एवं बारात',
    dateStr: 'November 25, 2026',
    venue: 'Royal Palace Grand Front Lawns & Mandap',
    time: '06:30 PM - Late Night (Pheras at 01:15 AM)',
    coordinator: 'Vikram Sharma & Alok Varma (+91 98765 43214)',
    description: 'The Royal Procession with vintage carriage & brass band, hydraulic varmala exchange, Vedic 7-pheras around sacred fire, Sindoor daan, and emotional Bidaai.',
    dressCode: 'Black Tie / Royal Sherwani & Heavy Zardozi Lehengas',
    tagColor: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  {
    id: 'reception',
    title: 'Royal Wedding Reception',
    hindi: 'प्रीतिभोज स्वागत समारोह',
    dateStr: 'November 27, 2026',
    venue: 'Imperial Crystal Ballroom & Royal Terrace',
    time: '07:30 PM - 12:00 Midnight',
    coordinator: 'Kavita Varma (+91 98765 43215)',
    description: 'Formal gala night to celebrate the newlywed couple with dignitary blessings, live Sufi band, cake cutting, multi-cuisine banquet, and photo reception.',
    dressCode: 'Black Tie, Indo-Western Tuxedos & Cocktail Gowns',
    tagColor: 'bg-indigo-100 text-indigo-900 border-indigo-300'
  }
];

export function getDefaultAppState() {
  return {
    targetBudget: 2500000,
    googleSheetId: '',
    googleSheetUrl: '',
    lastSyncedAt: '',
    events: JSON.parse(JSON.stringify(DEFAULT_EVENTS)),
    expenses: [
      { id: 'exp-1', name: 'Palace Royal Lawns & Ballroom Venue Deposit', event: 'Barat', category: 'Venue', estimated: 650000, actual: 650000, paid: 500000, status: 'Partial', notes: 'Includes Mandap lawn and banquet halls' },
      { id: 'exp-2', name: 'Awadhi & Continental Catering (600 Pax Banquet)', event: 'Barat', category: 'Catering', estimated: 750000, actual: 780000, paid: 400000, status: 'Partial', notes: '50 live counters, chaat, royal sweets' },
      { id: 'exp-3', name: 'Hydraulic Varmala Stage & Floral Mandap', event: 'Barat', category: 'Decoration', estimated: 320000, actual: 300000, paid: 300000, status: 'Paid', notes: 'Imported fresh orchids & lotus' },
      { id: 'exp-4', name: 'Bridal Zardozi Lehenga & Royal Groom Sherwani', event: 'Barat', category: 'Attire', estimated: 380000, actual: 410000, paid: 410000, status: 'Paid', notes: 'Custom heritage Sabyasachi-inspired embroidery' },
      { id: 'exp-5', name: 'Cinematic Drone & Candid Photography Team (6 Days)', event: 'General', category: 'Photography', estimated: 240000, actual: 230000, paid: 150000, status: 'Partial', notes: '4 photographers + 2 cinematographers + live stream' },
      { id: 'exp-6', name: 'Bhatman Sit-Down Traditional Lunch Thali (220 Pax)', event: 'Bhatman', category: 'Catering', estimated: 140000, actual: 135000, paid: 135000, status: 'Paid', notes: 'Traditional Kansa thali service' },
      { id: 'exp-7', name: 'Tilak Ceremony Shagun Sweets & Silver Coins', event: 'Tilak', category: 'Ritual Supplies', estimated: 95000, actual: 110000, paid: 110000, status: 'Paid', notes: 'Pure silver dry fruit boxes & shagun envelopes' },
      { id: 'exp-8', name: 'Vintage Carriage, Ghodi & 25-Piece Brass Band', event: 'Barat', category: 'Entertainment', estimated: 85000, actual: 80000, paid: 40000, status: 'Partial', notes: 'Includes floral chhatra & battery lights' },
      { id: 'exp-9', name: 'Matkor Dholak, Folk Singers & Decorated Baskets', event: 'Matkor', category: 'Ritual Supplies', estimated: 35000, actual: 32000, paid: 32000, status: 'Paid', notes: 'Brass spade, decorative soop & earthen ghada' },
      { id: 'exp-10', name: 'Guest Transport AC Innovas & Airport Fleet (4 Days)', event: 'General', category: 'Transport', estimated: 120000, actual: 115000, paid: 60000, status: 'Partial', notes: '6 dedicated AC Innovas for outstation families' },
      { id: 'exp-11', name: 'Reception Live Sufi Band & Pyrotechnics Entry', event: 'Reception', category: 'Entertainment', estimated: 90000, actual: 95000, paid: 50000, status: 'Partial', notes: 'Cold pyros on couple entry + 4-piece Sufi troupe' },
      { id: 'exp-12', name: 'Madwa Bamboo, Mango Foliage & Hawan Samagri', event: 'Madwa', category: 'Ritual Supplies', estimated: 45000, actual: 48000, paid: 48000, status: 'Paid', notes: 'Fresh mango leaves, samidha, pure cow ghee' }
    ],
    vendors: [
      { id: 'v-1', name: 'Royal Awadh Caterers & Banquets', service: 'Catering', event: 'Barat', contactPerson: 'Chef Irfan Qureshi', phone: '+919876511223', contractAmount: 915000, advancePaid: 535000, status: 'Confirmed', notes: 'Menu frozen. Separate pure sattvic kitchen arranged.' },
      { id: 'v-2', name: 'Mayur Floral Decorators & Mandap Specialists', service: 'Decoration', event: 'Barat', contactPerson: 'Sunil Kumar', phone: '+919876522334', contractAmount: 420000, advancePaid: 350000, status: 'Confirmed', notes: 'Hydraulic stage safety test scheduled Nov 24.' },
      { id: 'v-3', name: 'Drishti Cinematic Moments & Films', service: 'Photography', event: 'General', contactPerson: 'Aakash Mehra', phone: '+919876533445', contractAmount: 230000, advancePaid: 150000, status: 'Confirmed', notes: 'Deliver same-day teaser for Barat reception.' },
      { id: 'v-4', name: 'Jea Brass Band & Vintage Carriage Fleet', service: 'Entertainment', event: 'Barat', contactPerson: 'Master Pappu Khan', phone: '+919876544556', contractAmount: 80000, advancePaid: 40000, status: 'Confirmed', notes: 'Uniformed 25 players + royal umbrella.' },
      { id: 'v-5', name: 'Maharaja Luxury Fleet & Airport Shuttles', service: 'Transport', event: 'General', contactPerson: 'Gurvinder Singh', phone: '+919876555667', contractAmount: 115000, advancePaid: 60000, status: 'Confirmed', notes: '6 Innova Crysta with placards.' },
      { id: 'v-6', name: 'Raga Soul & Sufi Ensemble', service: 'Entertainment', event: 'Reception', contactPerson: 'Faizan Warsi', phone: '+919876566778', contractAmount: 95000, advancePaid: 50000, status: 'Tentative', notes: 'Sound rider received, pending sound check.' }
    ],
    guests: [
      { id: 'g-1', name: 'Sharma Ji & Family (Chacha Ji)', side: 'Groom', members: 4, accommodation: true, hotel: 'Fortune Landmark, Suite 302', transport: 'Arriving Nov 20 Indigo 6E-241', rsvp: 'Confirmed', events: { tilak: true, matkor: true, madwa: true, bhatman: true, barat: true, reception: true }, contact: '+91 98101 23456' },
      { id: 'g-2', name: 'Ramesh Varma (Maternal Uncle / Mama Ji)', side: 'Bride', members: 5, accommodation: true, hotel: 'Fortune Landmark, Room 405-406', transport: 'Arriving Nov 22 Vande Bharat Express', rsvp: 'Confirmed', events: { tilak: false, matkor: true, madwa: true, bhatman: true, barat: true, reception: true }, contact: '+91 98102 34567' },
      { id: 'g-3', name: 'Dr. Vivek Saxena & Family', side: 'Groom', members: 3, accommodation: true, hotel: 'Hotel Royal Orchid, Room 210', transport: 'Arriving Nov 24 by Road from Kanpur', rsvp: 'Confirmed', events: { tilak: false, matkor: false, madwa: false, bhatman: true, barat: true, reception: true }, contact: '+91 98103 45678' },
      { id: 'g-4', name: 'Pooja Varma & In-laws (Didi & Jija Ji)', side: 'Bride', members: 4, accommodation: true, hotel: 'Fortune Landmark, Room 312', transport: 'Arriving Nov 21 Air India AI-420', rsvp: 'Confirmed', events: { tilak: true, matkor: true, madwa: true, bhatman: true, barat: true, reception: true }, contact: '+91 98104 56789' },
      { id: 'g-5', name: 'Ambassador K. P. Singh & Family', side: 'Groom', members: 2, accommodation: false, hotel: 'Self-Stay at Gomti Nagar Home', transport: 'Local City Car', rsvp: 'Confirmed', events: { tilak: false, matkor: false, madwa: false, bhatman: false, barat: true, reception: true }, contact: '+91 98105 67890' },
      { id: 'g-6', name: 'Sunil Mathur & Associates (College Friends)', side: 'Groom', members: 5, accommodation: true, hotel: 'Hotel Clarks Avadh, Rooms 101, 102', transport: 'Arriving Nov 24 Shatabdi Express', rsvp: 'Pending', events: { tilak: false, matkor: false, madwa: false, bhatman: false, barat: true, reception: true }, contact: '+91 98106 78901' },
      { id: 'g-7', name: 'Rajeev Malhotra & Family (Mumbai)', side: 'Bride', members: 3, accommodation: true, hotel: 'Fortune Landmark, Room 410', transport: 'Flight scheduled Nov 23', rsvp: 'Confirmed', events: { tilak: false, matkor: false, madwa: true, bhatman: true, barat: true, reception: true }, contact: '+91 98107 89012' }
    ],
    rituals: {
      tilak: [
        { id: 'r-t1', text: 'Shagun silver gift display table setup with royal velvet cloth', category: 'Operations', done: true, notes: 'Designated room key with Rajesh' },
        { id: 'r-t2', text: 'Pooja Samagri: Roli, Chandan, Akshat, Supari, Paan, Fresh Flowers, Ghee Diya', category: 'Samagri', done: true, notes: 'Purchased from Shastri Pooja Bhandar' },
        { id: 'r-t3', text: 'Silver coins & Cash Shagun Envelopes organized by denomination', category: 'Samagri', done: false, notes: 'Handed to Dadaji' },
        { id: 'r-t4', text: 'Shehnai & Live Folk Welcome Musicians arrival check at 10:30 AM', category: 'Operations', done: true, notes: 'Contact: Master Bilal' },
        { id: 'r-t5', text: 'Catering welcome drinks (Kesar Thandai, Badam Milk & Starters)', category: 'Operations', done: false, notes: 'Setup ready by 11:30 AM' }
      ],
      matkor: [
        { id: 'r-m1', text: 'Spade (Kudal) decorated with turmeric, mouli & marigold garland', category: 'Samagri', done: false, notes: 'Chachi Ji to oversee decoration' },
        { id: 'r-m2', text: 'Decorated wicker baskets (Soop), new earthen pot (Ghada) & cloth cover', category: 'Samagri', done: false, notes: '4 decorative soop ready' },
        { id: 'r-m3', text: 'Police route intimation & local path clearance for soil procession', category: 'Operations', done: true, notes: 'Intimation letter submitted' },
        { id: 'r-m4', text: 'Dhol & Women Folk Singer troupe arrival at 03:30 PM', category: 'Operations', done: false, notes: 'Sound check in courtyard' },
        { id: 'r-m5', text: 'Fresh Haldi / Ubtan paste preparation with sandalwood & saffron', category: 'Samagri', done: false, notes: 'Natural ingredients only' }
      ],
      madwa: [
        { id: 'r-mw1', text: 'Green Bamboo poles & fresh Mango branch canopy structure check', category: 'Operations', done: false, notes: 'Carpenter team arriving 07:00 AM' },
        { id: 'r-mw2', text: 'Mandap consecration Samagri: Hawan Kund, 5 Dry Coconuts, Navgrah Samidha', category: 'Samagri', done: false, notes: 'Acharya Harish Ji list verified' },
        { id: 'r-mw3', text: 'Harish wooden pillar installation & vermilion auspicious marks', category: 'Operations', done: false, notes: 'Elder uncle lead ritual' },
        { id: 'r-mw4', text: 'Family sitting arrangement with gaddas, masnads & floral carpets', category: 'Operations', done: false, notes: 'Shade awning confirmed' }
      ],
      bhatman: [
        { id: 'r-b1', text: 'Maternal Uncle (Mama & Mami) reception welcoming team at entry gate', category: 'Operations', done: false, notes: 'Aarti thali with silver diyas' },
        { id: 'r-b2', text: 'Mamere / Bhat inventory room setup with lock & secure registry book', category: 'Operations', done: false, notes: 'Treasurer: Manoj Sharma' },
        { id: 'r-b3', text: 'Traditional sit-down feast service (Patta / Kansa Thali arrangement)', category: 'Operations', done: false, notes: 'Puri, Daal Kachori, Ghevar, Rabri' },
        { id: 'r-b4', text: 'Presents of wedding clothes (Mayra attire) display & inspection', category: 'Operations', done: false, notes: 'Dry-cleaned and pressed' }
      ],
      barat: [
        { id: 'r-ba1', text: 'Procession route legal permission & traffic marshal deployment', category: 'Operations', done: true, notes: 'Permit #LP-8842/26' },
        { id: 'r-ba2', text: 'Vintage Car / Ghodi with floral chhatra & water supply vehicle', category: 'Operations', done: false, notes: 'Reporting at 05:30 PM sharp' },
        { id: 'r-ba3', text: '25-piece Brass band & lighting trolley test', category: 'Operations', done: false, notes: 'Full uniform check' },
        { id: 'r-ba4', text: 'Hydraulic Varmala Stage motor test & safety barrier inspection', category: 'Operations', done: false, notes: 'Engineer Sunil signoff' },
        { id: 'r-ba5', text: 'Fresh Varmalas (Exotic Thai Orchids & Red Roses) in cold storage', category: 'Samagri', done: false, notes: 'Keep at 18 deg C until 08:30 PM' },
        { id: 'r-ba6', text: 'Full Phera Hawan Kit: 5kg Desi Ghee, Lave/Puffed Rice, Gangajal, Sindoor, Mangalsutra, Janeu', category: 'Samagri', done: false, notes: 'Pandit ji sacred basket' },
        { id: 'r-ba7', text: 'Emergency Bridal Kit: Safety pins, touchup cosmetics, pain relief, extra heels', category: 'Operations', done: true, notes: 'With Bridesmaid Kavita' },
        { id: 'r-ba8', text: 'Bidaai decorated royal car & luggage transport escort team ready', category: 'Operations', done: false, notes: 'Driver verified & briefed' }
      ],
      reception: [
        { id: 'r-r1', text: 'Stage grand entry sequence, low-smoke fog & cold spark pyros', category: 'Operations', done: false, notes: 'Safety distance 15 feet verified' },
        { id: 'r-r2', text: 'Token & Shagun gift registry collection desk with digital QR & ledger', category: 'Operations', done: false, notes: '2 coordinators on duty' },
        { id: 'r-r3', text: 'VIP hospitality & royal family photo-op queue manager', category: 'Operations', done: false, notes: 'Hostess team briefed' },
        { id: 'r-r4', text: 'Live Sufi band soundcheck completed by 06:00 PM', category: 'Operations', done: false, notes: 'Sound engineer on console' },
        { id: 'r-r5', text: 'Valet parking desk & key storage tagged system with 12 valets', category: 'Operations', done: true, notes: 'Covered parking for 250 cars' }
      ]
    },
    emergencyChecklist: {
      legal: [
        { text: 'Police station intimation for Barat procession & route clearance', done: true },
        { text: 'Sound & acoustic amplification permission post 10:00 PM', done: true },
        { text: 'Fire safety NOC & fire extinguisher inspection at palace lawns', done: true },
        { text: 'Excise license for private reception cocktail area', done: false }
      ],
      power: [
        { text: 'Primary 125 KVA DG generator fueled & load-tested', done: true },
        { text: 'Secondary backup 82.5 KVA generator on hot standby', done: true },
        { text: 'Dedicated electrician on-site with emergency contact radio', done: true },
        { text: 'Heavy load cables insulated & covered with safety ramps', done: false }
      ],
      medical: [
        { text: 'Emergency doctor on-call with private phone line verified', done: true },
        { text: 'First-aid kit with ORS, antacids, painkillers, bandages at front desk', done: true },
        { text: 'Designated emergency ambulance stationed 500m from venue gate', done: false },
        { text: 'Wheelchairs available at main palace entrance for elders', done: true }
      ]
    }
  };
}

export let appState: any = null;
let activeRitualTab = 'tilak';
let autoSyncTimeout: any = null;
let isSyncingToSheets = false;

// Currency & formatting
export function formatINR(amount: number) {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatLakhs(amount: number) {
  if (isNaN(amount)) return '₹0.00L';
  const lakhs = (amount / 100000).toFixed(2);
  return `₹${lakhs}L`;
}

// Data persistence
export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      appState = JSON.parse(saved);
      // Migrate events if not in saved state
      if (!appState.events || !Array.isArray(appState.events) || appState.events.length === 0) {
        appState.events = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
      }
    } else {
      appState = getDefaultAppState();
      saveData(false);
    }
  } catch {
    appState = getDefaultAppState();
  }
}

export function saveData(triggerCloudSync: boolean = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }

  if (triggerCloudSync) {
    scheduleGoogleSheetsAutoSync();
  }
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-900 border-red-700 text-white' : (type === 'info' ? 'bg-blue-900 border-blue-700 text-white' : 'bg-[#4A0815] border-[#D4AF37] text-[#FFF8E7]');
  toast.className = `${bg} border px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation text-rose-400' : (type === 'info' ? 'fa-circle-info text-blue-300' : 'fa-circle-check text-[#D4AF37]')}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Debounced Google Sheets Auto-Sync Engine
export function scheduleGoogleSheetsAutoSync() {
  updateSyncStatusUI('saving_local');
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);

  autoSyncTimeout = setTimeout(async () => {
    const token = getCachedToken();
    if (!token) {
      updateSyncStatusUI('offline');
      return;
    }

    try {
      isSyncingToSheets = true;
      updateSyncStatusUI('syncing');

      // Ensure spreadsheet exists
      if (!appState.googleSheetId) {
        const sheet = await ensureWeddingSpreadsheet();
        appState.googleSheetId = sheet.id;
        appState.googleSheetUrl = sheet.url;
        saveData(false);
      }

      const res = await syncDataToGoogleSheet(appState.googleSheetId, appState);
      appState.lastSyncedAt = res.lastSyncedAt;
      saveData(false);
      updateSyncStatusUI('synced');
    } catch (err: any) {
      console.warn('Google Sheets sync notice:', err?.message || err);
      updateSyncStatusUI('error', err.message);
    } finally {
      isSyncingToSheets = false;
    }
  }, 1200);
}

export function updateSyncStatusUI(status: 'offline' | 'saving_local' | 'syncing' | 'synced' | 'error', errorMsg?: string) {
  const container = document.getElementById('google-sync-indicator');
  if (!container) return;

  const user = getCurrentUser();

  if (!user) {
    container.innerHTML = `
      <button onclick="window.triggerGoogleSignIn()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-[#D4AF37]/50 text-xs font-semibold text-[#FFF8E7] transition-all shadow-sm">
        <svg class="w-4 h-4" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        <span>Connect Google Sheet</span>
      </button>
    `;
    return;
  }

  const sheetUrl = appState.googleSheetUrl || (appState.googleSheetId ? `https://docs.google.com/spreadsheets/d/${appState.googleSheetId}/edit` : null);

  if (status === 'syncing') {
    container.innerHTML = `
      <div class="flex items-center gap-2 bg-amber-950/60 border border-gold/40 px-3 py-1.5 rounded-lg text-xs text-amber-200">
        <i class="fa-solid fa-arrows-rotate fa-spin text-gold"></i>
        <span>Auto-saving to Google Sheet...</span>
      </div>
    `;
  } else if (status === 'error') {
    container.innerHTML = `
      <div class="flex items-center gap-2 bg-red-950/60 border border-rose-500/50 px-2.5 py-1.5 rounded-lg text-xs text-rose-200">
        <i class="fa-solid fa-triangle-exclamation text-rose-400"></i>
        <span class="max-w-[140px] truncate" title="${errorMsg || 'Sync failed'}">Sheet Sync Error</span>
        <button onclick="window.forceManualSync()" class="underline text-gold hover:text-white text-[11px] font-bold">Retry</button>
      </div>
    `;
  } else {
    // Synced / active state
    container.innerHTML = `
      <div class="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs text-emerald-200">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <div class="flex flex-col">
          <span class="font-bold flex items-center gap-1.5">
            Auto-saved to Sheet
            ${sheetUrl ? `<a href="${sheetUrl}" target="_blank" rel="noopener noreferrer" class="text-gold hover:text-white transition-colors" title="Open Google Sheet"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a>` : ''}
          </span>
          <span class="text-[10px] text-emerald-300/80 leading-none">${appState.lastSyncedAt ? appState.lastSyncedAt.split(',')[1] || appState.lastSyncedAt : 'Active'}</span>
        </div>
        <button onclick="window.forceManualSync()" class="ml-1 p-1 hover:text-white text-gold" title="Push Now">
          <i class="fa-solid fa-cloud-arrow-up"></i>
        </button>
        <button onclick="window.triggerGoogleSignOut()" class="p-1 text-slate-400 hover:text-rose-300" title="Disconnect (${user.email})">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
  }
}

export async function forceManualSync() {
  const token = getCachedToken();
  if (!token) {
    await triggerGoogleSignIn();
    return;
  }
  showToast('Pushing updates to Google Sheet...', 'info');
  try {
    updateSyncStatusUI('syncing');
    if (!appState.googleSheetId) {
      const sheet = await ensureWeddingSpreadsheet();
      appState.googleSheetId = sheet.id;
      appState.googleSheetUrl = sheet.url;
      saveData(false);
    }
    const res = await syncDataToGoogleSheet(appState.googleSheetId, appState);
    appState.lastSyncedAt = res.lastSyncedAt;
    saveData(false);
    updateSyncStatusUI('synced');
    showToast('Successfully synced with Google Sheets!', 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to sync with Google Sheet', 'error');
    updateSyncStatusUI('error', err.message);
  }
}

export async function triggerGoogleSignIn() {
  try {
    showToast('Connecting with Google...', 'info');
    const authResult = await signInWithGoogleWorkspace();
    if (!authResult) {
      // User dismissed or closed the sign-in popup
      updateSyncStatusUI('offline');
      showToast('Google sign-in was cancelled', 'info');
      return;
    }
    const { user } = authResult;
    showToast(`Connected as ${user.displayName || user.email}!`, 'success');
    await forceManualSync();
  } catch (err: any) {
    console.warn('Sign-in status:', err?.message || err);
    showToast(err?.message || 'Google sign-in could not be completed', 'info');
    updateSyncStatusUI('offline');
  }
}

export async function triggerGoogleSignOut() {
  showConfirmDialog({
    title: 'Disconnect Google Sheets',
    message: 'Disconnect Google Sheets auto-sync for this session? Your changes in local storage will remain completely safe.',
    confirmLabel: 'Disconnect',
    icon: 'fa-right-from-bracket',
    confirmStyle: 'bg-slate-700 hover:bg-slate-800 text-white',
    onConfirm: async () => {
      await signOutGoogleWorkspace();
      updateSyncStatusUI('offline');
      showToast('Disconnected from Google Sheets', 'info');
    }
  });
}

// -------------------------------------------------------------
// EDITABLE CONTROLLERS: BUDGET, CEREMONIES, GUESTS, RITUALS
// -------------------------------------------------------------

export function openEditTargetBudgetModal() {
  const current = appState.targetBudget || 2500000;
  const modalsPlaceholder = document.getElementById('modals-placeholder')!;
  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          Edit Target Budget
        </h3>
        <p class="text-xs text-slate-500 mb-4">Set the overall ceiling limit for wedding expenses</p>
        <form onsubmit="window.handleSaveTargetBudget(event)" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Target Amount (in INR ₹) *</label>
            <input type="number" id="modal-target-budget-val" required min="10000" step="5000" value="${current}" class="w-full px-3 py-2 text-sm font-bold text-maroon rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            <p class="text-[11px] text-slate-400 mt-1">e.g. 2500000 for ₹25 Lakhs</p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">Update Budget</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveTargetBudget(e: Event) {
  e.preventDefault();
  const val = Number((document.getElementById('modal-target-budget-val') as HTMLInputElement).value) || 2500000;
  appState.targetBudget = val;
  saveData(true);
  window.closeModal();
  renderDashboard();
  renderBudgetStats();
  showToast(`Target budget updated to ${formatINR(val)}`);
}

export function openEditCeremonyModal(eventId: string) {
  const evt = (appState.events || []).find((e: any) => e.id === eventId);
  if (!evt) return;

  const modalsPlaceholder = document.getElementById('modals-placeholder')!;
  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 border border-gold/40 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          Edit Ceremony Details: ${evt.title}
        </h3>
        <p class="text-xs text-slate-500 mb-4">Update date, time window, venue, coordinator and cultural description</p>

        <form onsubmit="window.handleSaveCeremony(event, '${eventId}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Ceremony Title *</label>
            <input type="text" id="modal-evt-title" required value="${evt.title}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Date String *</label>
              <input type="text" id="modal-evt-date" required value="${evt.dateStr}" placeholder="e.g. November 21, 2026" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Time Schedule *</label>
              <input type="text" id="modal-evt-time" required value="${evt.time}" placeholder="e.g. 11:00 AM - 04:00 PM" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Venue & Location Address *</label>
            <input type="text" id="modal-evt-venue" required value="${evt.venue}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Assigned Family Coordinator *</label>
              <input type="text" id="modal-evt-coord" required value="${evt.coordinator}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Recommended Dress Code</label>
              <input type="text" id="modal-evt-dress" value="${evt.dressCode || ''}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Ritual & Cultural Context Description</label>
            <textarea id="modal-evt-desc" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">${evt.description || ''}</textarea>
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveCeremony(e: Event, eventId: string) {
  e.preventDefault();
  const evt = (appState.events || []).find((e: any) => e.id === eventId);
  if (!evt) return;

  evt.title = (document.getElementById('modal-evt-title') as HTMLInputElement).value.trim();
  evt.dateStr = (document.getElementById('modal-evt-date') as HTMLInputElement).value.trim();
  evt.time = (document.getElementById('modal-evt-time') as HTMLInputElement).value.trim();
  evt.venue = (document.getElementById('modal-evt-venue') as HTMLInputElement).value.trim();
  evt.coordinator = (document.getElementById('modal-evt-coord') as HTMLInputElement).value.trim();
  evt.dressCode = (document.getElementById('modal-evt-dress') as HTMLInputElement).value.trim();
  evt.description = (document.getElementById('modal-evt-desc') as HTMLTextAreaElement).value.trim();

  saveData(true);
  window.closeModal();
  renderDashboard();
  renderEventsView();
  renderRituals();
  showToast(`${evt.title} updated & auto-saved!`);
}

// 1-Click Guest Attendance Matrix Toggle directly in table
export function toggleGuestEventAttendance(guestId: string, eventId: string) {
  const guest = (appState.guests || []).find((g: any) => g.id === guestId);
  if (!guest) return;

  if (!guest.events) guest.events = {};
  guest.events[eventId] = !guest.events[eventId];

  saveData(true);
  renderGuestStats();
  renderGuestsTable();
  initOrUpdateCharts();
  const statusStr = guest.events[eventId] ? 'attending' : 'not attending';
  showToast(`${guest.name}: marked ${statusStr} for ${eventId.toUpperCase()}`, 'info');
}

// 1-Click Guest RSVP status changer directly in table
export function updateGuestRsvpDirect(guestId: string, newStatus: string) {
  const guest = (appState.guests || []).find((g: any) => g.id === guestId);
  if (!guest) return;

  guest.rsvp = newStatus;
  saveData(true);
  renderDashboard();
  renderGuestStats();
  renderGuestsTable();
  initOrUpdateCharts();
  showToast(`${guest.name} RSVP updated to ${newStatus}`);
}

// 1-Click Expense Status Switcher directly in table
export function cycleExpenseStatus(expenseId: string) {
  const exp = (appState.expenses || []).find((e: any) => e.id === expenseId);
  if (!exp) return;

  if (exp.status === 'Pending') {
    exp.status = 'Partial';
    if (exp.paid === 0) exp.paid = Math.round(exp.actual * 0.5);
  } else if (exp.status === 'Partial') {
    exp.status = 'Paid';
    exp.paid = exp.actual;
  } else {
    exp.status = 'Pending';
    exp.paid = 0;
  }

  saveData(true);
  renderDashboard();
  renderBudgetStats();
  renderExpensesTable();
  showToast(`${exp.name} marked as ${exp.status}`);
}

// -------------------------------------------------------------
// RENDERERS (DASHBOARD, EVENTS, BUDGET, VENDORS, GUESTS, RITUALS)
// -------------------------------------------------------------

let budgetChartInstance: any = null;
let guestChartInstance: any = null;

export function renderDashboard() {
  const totalActual = appState.expenses.reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
  const target = appState.targetBudget || 2500000;

  const budgetSpentEl = document.getElementById('kpi-budget-spent');
  if (budgetSpentEl) budgetSpentEl.innerText = `${formatLakhs(totalActual)} / ${formatLakhs(target)}`;

  const pctBudget = Math.round((totalActual / target) * 100);
  const budgetTargetEl = document.getElementById('kpi-budget-target');
  if (budgetTargetEl) budgetTargetEl.innerText = `${pctBudget}% of target budget spent`;

  const attendingHeads = appState.guests.filter((g: any) => g.rsvp === 'Confirmed').reduce((sum: number, g: any) => sum + (Number(g.members) || 0), 0);
  const guestsEl = document.getElementById('kpi-attending-guests');
  if (guestsEl) guestsEl.innerText = String(attendingHeads);

  const groupsEl = document.getElementById('kpi-guest-groups');
  if (groupsEl) groupsEl.innerText = `${appState.guests.length} guest groups total`;

  const vendorsEl = document.getElementById('kpi-vendors-count');
  if (vendorsEl) vendorsEl.innerText = `${appState.vendors.length} Vendors`;

  const activeContracts = appState.vendors.filter((v: any) => v.status === 'Confirmed').length;
  const vendorStatusEl = document.getElementById('kpi-vendors-status');
  if (vendorStatusEl) vendorStatusEl.innerText = `${activeContracts} confirmed active`;

  let pendingRituals = 0;
  Object.values(appState.rituals || {}).forEach((taskList: any) => {
    pendingRituals += (taskList || []).filter((t: any) => !t.done).length;
  });
  const pendingTasksEl = document.getElementById('kpi-pending-tasks');
  if (pendingTasksEl) pendingTasksEl.innerText = String(pendingRituals);

  renderDashboardEventsGrid();
  initOrUpdateCharts();
}

export function renderDashboardEventsGrid() {
  const container = document.getElementById('dashboard-events-grid');
  if (!container) return;

  const eventsList = appState.events || DEFAULT_EVENTS;

  container.innerHTML = eventsList.map((evt: any) => {
    const tasks = (appState.rituals && appState.rituals[evt.id]) || [];
    const completed = tasks.filter((t: any) => t.done).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const guestsForEvent = (appState.guests || [])
      .filter((g: any) => g.rsvp === 'Confirmed' && g.events && g.events[evt.id])
      .reduce((sum: number, g: any) => sum + Number(g.members), 0);

    return `
      <div class="p-4 rounded-xl border border-slate-200 bg-amber-royal/30 hover:border-gold/60 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${evt.tagColor || 'bg-amber-100 text-amber-900'}">
              ${evt.dateStr.split(',')[0]}
            </span>
            <span class="text-xs font-semibold text-slate-500">${guestsForEvent} Confirmed</span>
          </div>
          <div class="flex items-start justify-between">
            <h4 class="font-cinzel font-bold text-base text-maroon">${evt.title}</h4>
            <button onclick="window.openEditCeremonyModal('${evt.id}')" class="text-slate-400 hover:text-gold-dark p-1" title="Edit Ceremony Details">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
          </div>
          <p class="text-xs text-slate-600 line-clamp-1 mt-0.5"><i class="fa-solid fa-location-dot text-gold-dark text-[11px] mr-1"></i> ${evt.venue}</p>
          <p class="text-[11px] text-slate-500 mt-1 line-clamp-1"><i class="fa-solid fa-user-tie text-slate-400 mr-1"></i> ${evt.coordinator.split('(')[0]}</p>
        </div>
        
        <div class="mt-4 pt-3 border-t border-gold/20 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 flex-1 mr-3">
            <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-gold-dark h-1.5 rounded-full" style="width: ${pct}%"></div>
            </div>
            <span class="text-[11px] font-bold text-slate-600 shrink-0">${completed}/${total}</span>
          </div>
          <button onclick="window.openEventDetails('${evt.id}')" class="text-maroon hover:text-gold-dark font-semibold text-xs transition-colors shrink-0">
            Tasks <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderEventsView() {
  const container = document.getElementById('events-full-list');
  if (!container) return;

  const eventsList = appState.events || DEFAULT_EVENTS;

  container.innerHTML = eventsList.map((evt: any, idx: number) => {
    const tasks = (appState.rituals && appState.rituals[evt.id]) || [];
    const completed = tasks.filter((t: any) => t.done).length;
    const attending = (appState.guests || [])
      .filter((g: any) => g.rsvp === 'Confirmed' && g.events && g.events[evt.id])
      .reduce((sum: number, g: any) => sum + Number(g.members), 0);

    return `
      <div class="royal-card p-5 border-l-4 ${idx % 2 === 0 ? 'border-l-gold' : 'border-l-maroon'} flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${evt.tagColor || 'bg-amber-100 text-amber-900'}">
              Event ${idx + 1} • ${evt.dateStr}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500">${attending} Guests</span>
              <button onclick="window.openEditCeremonyModal('${evt.id}')" class="px-2.5 py-1 bg-amber-50 hover:bg-gold hover:text-maroon text-gold-dark border border-gold/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
            </div>
          </div>
          
          <div class="flex items-baseline justify-between mt-1">
            <h3 class="font-cinzel font-bold text-xl text-maroon">${evt.title}</h3>
            <span class="text-xs font-serif text-gold-dark font-medium">${evt.hindi || ''}</span>
          </div>

          <div class="space-y-1.5 mt-3 text-xs text-slate-600">
            <p><i class="fa-regular fa-clock text-gold-dark w-4"></i> <span class="font-medium">${evt.time}</span></p>
            <p><i class="fa-solid fa-location-dot text-gold-dark w-4"></i> <span class="font-medium">${evt.venue}</span></p>
            <p><i class="fa-solid fa-user-check text-gold-dark w-4"></i> <span>Coordinator: <strong class="text-slate-800">${evt.coordinator}</strong></span></p>
            <p><i class="fa-solid fa-vest text-gold-dark w-4"></i> <span>Dress Code: <strong class="text-slate-700">${evt.dressCode || 'Traditional Wedding Attire'}</strong></span></p>
          </div>

          <p class="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-lg border border-gold/20 mt-3 leading-relaxed">
            ${evt.description}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-gold/20 flex items-center justify-between">
          <span class="text-xs text-slate-500 font-medium">Checklist: <strong>${completed}/${tasks.length}</strong> tasks ready</span>
          <button onclick="window.openEventDetails('${evt.id}')" class="px-3 py-1.5 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg text-xs font-semibold transition-all">
            Manage Tasks <i class="fa-solid fa-arrow-right ml-1"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderBudgetStats() {
  const target = appState.targetBudget || 2500000;
  const totalEstimated = appState.expenses.reduce((sum: number, e: any) => sum + (Number(e.estimated) || 0), 0);
  const totalActual = appState.expenses.reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
  const totalPaid = appState.expenses.reduce((sum: number, e: any) => sum + (Number(e.paid) || 0), 0);

  const statTarget = document.getElementById('stat-target-budget');
  if (statTarget) {
    statTarget.innerHTML = `
      <span>${formatINR(target)}</span>
      <button onclick="window.openEditTargetBudgetModal()" class="ml-1.5 text-xs text-gold-dark hover:text-maroon" title="Edit Budget Limit">
        <i class="fa-solid fa-pen"></i>
      </button>
    `;
  }

  const statEst = document.getElementById('stat-estimated-budget');
  if (statEst) statEst.innerText = formatINR(totalEstimated);

  const statAct = document.getElementById('stat-actual-budget');
  if (statAct) statAct.innerText = formatINR(totalActual);

  const statPaid = document.getElementById('stat-paid-budget');
  if (statPaid) statPaid.innerText = formatINR(totalPaid);

  const pctCommitted = Math.min(Math.round((totalActual / target) * 100), 100);
  const pctPaid = Math.min(Math.round((totalPaid / target) * 100), 100);
  const pctPending = Math.max(0, pctCommitted - pctPaid);

  const progressLabel = document.getElementById('budget-progress-label');
  if (progressLabel) progressLabel.innerText = `Committed: ${formatINR(totalActual)} (${Math.round((totalActual / target) * 100)}% of Target)`;

  const paidLabel = document.getElementById('budget-paid-label');
  if (paidLabel) paidLabel.innerText = `Paid: ${formatINR(totalPaid)} (${pctPaid}%)`;

  const barPaid = document.getElementById('bar-paid');
  if (barPaid) barPaid.style.width = `${pctPaid}%`;

  const barPending = document.getElementById('bar-pending-committed');
  if (barPending) barPending.style.width = `${pctPending}%`;
}

// -------------------------------------------------------------
// DAY-WISE FILTER HELPERS FOR BUDGET, VENDORS, GUESTS
// -------------------------------------------------------------

export function setExpenseDayFilter(dayId: string) {
  const sel = document.getElementById('expense-filter-event') as HTMLSelectElement;
  if (sel) sel.value = dayId;
  renderExpensesTable();
}

export function setVendorDayFilter(dayId: string) {
  const sel = document.getElementById('vendor-filter-event') as HTMLSelectElement;
  if (sel) sel.value = dayId;
  renderVendorsGrid();
}

export function setGuestDayFilter(dayId: string) {
  const sel = document.getElementById('guest-filter-event') as HTMLSelectElement;
  if (sel) sel.value = dayId;
  renderGuestsTable();
}

function renderBudgetDayPills(activeDay: string) {
  const pillsContainer = document.getElementById('budget-day-pills');
  const summaryEl = document.getElementById('budget-day-summary');
  if (!pillsContainer) return;

  const daysConfig = [
    { id: 'ALL', label: 'All Days', sub: 'Nov 21-27' },
    { id: 'Tilak', label: 'Day 1 • Tilak', sub: 'Nov 21' },
    { id: 'Matkor', label: 'Day 2 • Matkor', sub: 'Nov 22' },
    { id: 'Madwa', label: 'Day 3 • Madwa', sub: 'Nov 23' },
    { id: 'Bhatman', label: 'Day 4 • Bhatman', sub: 'Nov 24' },
    { id: 'Barat', label: 'Day 5 • Barat', sub: 'Nov 25' },
    { id: 'Reception', label: 'Day 6 • Reception', sub: 'Nov 27' },
    { id: 'General', label: 'General / Common', sub: 'Misc' }
  ];

  pillsContainer.innerHTML = daysConfig.map(d => {
    const isActive = activeDay === d.id;
    const dayTotal = (appState.expenses || [])
      .filter((e: any) => d.id === 'ALL' || e.event === d.id)
      .reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
    const count = (appState.expenses || []).filter((e: any) => d.id === 'ALL' || e.event === d.id).length;

    const activeClasses = 'bg-maroon text-gold-light border-maroon shadow-xs ring-1 ring-gold font-bold';
    const inactiveClasses = 'bg-white hover:bg-amber-50 text-slate-700 border-gold/30 hover:border-gold font-medium';

    return `
      <button type="button" onclick="window.setExpenseDayFilter('${d.id}')" class="px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${isActive ? activeClasses : inactiveClasses}">
        <span class="${isActive ? 'text-gold' : 'text-slate-400'} text-[10px]"><i class="fa-solid fa-calendar-day"></i></span>
        <span>${d.label}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-gold/20 text-gold-light' : 'bg-amber-100/70 text-maroon font-bold'}">
          ${formatLakhs(dayTotal)} (${count})
        </span>
      </button>
    `;
  }).join('');

  if (summaryEl) {
    const activeObj = daysConfig.find(d => d.id === activeDay);
    const daySpent = (appState.expenses || [])
      .filter((e: any) => activeDay === 'ALL' || e.event === activeDay)
      .reduce((sum: number, e: any) => sum + (Number(e.actual) || 0), 0);
    summaryEl.innerText = activeDay === 'ALL' 
      ? `All 6 Ceremonies & General (${formatINR(daySpent)})` 
      : `${activeObj?.label || activeDay} • ${formatINR(daySpent)} spent`;
  }
}

export function renderExpensesTable() {
  const tbody = document.getElementById('expenses-table-body');
  if (!tbody) return;

  const search = ((document.getElementById('expense-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const eventFilter = (document.getElementById('expense-filter-event') as HTMLSelectElement)?.value || 'ALL';
  const catFilter = (document.getElementById('expense-filter-cat') as HTMLSelectElement)?.value || 'ALL';
  const statusFilter = (document.getElementById('expense-filter-status') as HTMLSelectElement)?.value || 'ALL';

  renderBudgetDayPills(eventFilter);

  const filtered = (appState.expenses || []).filter((item: any) => {
    const matchSearch = item.name.toLowerCase().includes(search) || (item.notes && item.notes.toLowerCase().includes(search));
    const matchEvent = eventFilter === 'ALL' || item.event === eventFilter;
    const matchCat = catFilter === 'ALL' || item.category === catFilter;
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchEvent && matchCat && matchStatus;
  });

  const countEl = document.getElementById('expense-filter-count');
  if (countEl) countEl.innerText = `Showing ${filtered.length} of ${appState.expenses.length} records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-8 text-center text-slate-400">
          <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300 block"></i>
          No expenses matching current day/event filters
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((item: any) => {
    const statusBadge = item.status === 'Paid'
      ? `<button onclick="window.cycleExpenseStatus('${item.id}')" title="Click to change status" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors">Paid <i class="fa-solid fa-arrows-rotate text-[8px] ml-1"></i></button>`
      : (item.status === 'Partial'
        ? `<button onclick="window.cycleExpenseStatus('${item.id}')" title="Click to change status" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors">Partial <i class="fa-solid fa-arrows-rotate text-[8px] ml-1"></i></button>`
        : `<button onclick="window.cycleExpenseStatus('${item.id}')" title="Click to change status" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors">Pending <i class="fa-solid fa-arrows-rotate text-[8px] ml-1"></i></button>`);

    return `
      <tr class="hover:bg-amber-50/40 transition-colors">
        <td class="py-3 px-4">
          <p class="font-semibold text-slate-800">${item.name}</p>
          ${item.notes ? `<p class="text-[11px] text-slate-500 italic mt-0.5">${item.notes}</p>` : ''}
        </td>
        <td class="py-3 px-3 font-semibold text-maroon">${item.event}</td>
        <td class="py-3 px-3 font-medium text-slate-600">${item.category}</td>
        <td class="py-3 px-3 text-right font-medium text-slate-600">${formatINR(item.estimated)}</td>
        <td class="py-3 px-3 text-right font-bold text-slate-900">${formatINR(item.actual)}</td>
        <td class="py-3 px-3 text-right font-semibold text-emerald-700">${formatINR(item.paid)}</td>
        <td class="py-3 px-3 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="window.openExpenseModal('${item.id}')" class="w-7 h-7 rounded-md bg-slate-100 hover:bg-gold hover:text-maroon-dark text-slate-600 transition-colors" title="Edit">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="window.deleteExpense('${item.id}')" class="w-7 h-7 rounded-md bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-colors" title="Delete">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderVendorDayPills(activeDay: string) {
  const pillsContainer = document.getElementById('vendor-day-pills');
  const summaryEl = document.getElementById('vendor-day-summary');
  if (!pillsContainer) return;

  const daysConfig = [
    { id: 'ALL', label: 'All Days', sub: 'Nov 21-27' },
    { id: 'Tilak', label: 'Day 1 • Tilak', sub: 'Nov 21' },
    { id: 'Matkor', label: 'Day 2 • Matkor', sub: 'Nov 22' },
    { id: 'Madwa', label: 'Day 3 • Madwa', sub: 'Nov 23' },
    { id: 'Bhatman', label: 'Day 4 • Bhatman', sub: 'Nov 24' },
    { id: 'Barat', label: 'Day 5 • Barat', sub: 'Nov 25' },
    { id: 'Reception', label: 'Day 6 • Reception', sub: 'Nov 27' },
    { id: 'All Events', label: 'Common / All Events', sub: 'General' }
  ];

  pillsContainer.innerHTML = daysConfig.map(d => {
    const isActive = activeDay === d.id;
    const count = (appState.vendors || []).filter((v: any) => {
      if (d.id === 'ALL') return true;
      if (d.id === 'All Events') return v.event === 'All Events' || v.event === 'General';
      return v.event === d.id || v.event === 'All Events';
    }).length;

    const activeClasses = 'bg-maroon text-gold-light border-maroon shadow-xs ring-1 ring-gold font-bold';
    const inactiveClasses = 'bg-white hover:bg-amber-50 text-slate-700 border-gold/30 hover:border-gold font-medium';

    return `
      <button type="button" onclick="window.setVendorDayFilter('${d.id}')" class="px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${isActive ? activeClasses : inactiveClasses}">
        <span class="${isActive ? 'text-gold' : 'text-slate-400'} text-[10px]"><i class="fa-solid fa-calendar-day"></i></span>
        <span>${d.label}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-gold/20 text-gold-light' : 'bg-amber-100/70 text-maroon font-bold'}">
          ${count}
        </span>
      </button>
    `;
  }).join('');

  if (summaryEl) {
    const activeObj = daysConfig.find(d => d.id === activeDay);
    const count = (appState.vendors || []).filter((v: any) => {
      if (activeDay === 'ALL') return true;
      if (activeDay === 'All Events') return v.event === 'All Events' || v.event === 'General';
      return v.event === activeDay || v.event === 'All Events';
    }).length;
    summaryEl.innerText = activeDay === 'ALL'
      ? `All Days & Bookings (${count} Vendors)`
      : `${activeObj?.label || activeDay} • ${count} Vendors active`;
  }
}

export function renderVendorsGrid() {
  const container = document.getElementById('vendors-grid');
  if (!container) return;

  const totalContracts = appState.vendors.reduce((s: number, v: any) => s + (Number(v.contractAmount) || 0), 0);
  const totalPaid = appState.vendors.reduce((s: number, v: any) => s + (Number(v.advancePaid) || 0), 0);
  const totalDue = totalContracts - totalPaid;

  const statTot = document.getElementById('vendor-stat-total');
  if (statTot) statTot.innerText = formatINR(totalContracts);
  const statPd = document.getElementById('vendor-stat-paid');
  if (statPd) statPd.innerText = formatINR(totalPaid);
  const statBal = document.getElementById('vendor-stat-balance');
  if (statBal) statBal.innerText = formatINR(totalDue);

  const search = ((document.getElementById('vendor-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const eventFilter = (document.getElementById('vendor-filter-event') as HTMLSelectElement)?.value || 'ALL';
  const statusFilter = (document.getElementById('vendor-filter-status') as HTMLSelectElement)?.value || 'ALL';

  renderVendorDayPills(eventFilter);

  const filtered = (appState.vendors || []).filter((v: any) => {
    const matchSearch = v.name.toLowerCase().includes(search) || v.service.toLowerCase().includes(search) || (v.contactPerson && v.contactPerson.toLowerCase().includes(search));
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchEvent = eventFilter === 'ALL' ||
      (eventFilter === 'All Events' ? (v.event === 'All Events' || v.event === 'General') :
      (v.event === eventFilter || v.event === 'All Events'));
    return matchSearch && matchStatus && matchEvent;
  });

  const countEl = document.getElementById('vendor-filter-count');
  if (countEl) countEl.innerText = `Showing ${filtered.length} of ${appState.vendors.length} vendors`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fa-solid fa-handshake-slash text-3xl mb-2 text-slate-300 block"></i>
        No vendors matching current ceremony/day filters
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((v: any) => {
    const balance = (Number(v.contractAmount) || 0) - (Number(v.advancePaid) || 0);
    const statusClass = v.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : (v.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800');

    return `
      <div class="royal-card p-5 flex flex-col justify-between hover:border-gold transition-all">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusClass}">
              ${v.status}
            </span>
            <span class="px-2 py-0.5 rounded-md bg-amber-50 text-gold-dark border border-gold/30 text-[11px] font-bold">
              <i class="fa-solid fa-calendar-day text-[9px] mr-1"></i>${v.event || 'All Events'}
            </span>
          </div>

          <h4 class="font-cinzel font-bold text-lg text-maroon">${v.name}</h4>
          <p class="text-xs font-semibold text-gold-dark uppercase tracking-wider">${v.service}</p>

          <div class="mt-3 text-xs text-slate-600 space-y-1">
            <p><i class="fa-solid fa-user text-slate-400 w-4"></i> ${v.contactPerson || 'Coordinator'}</p>
            <p><i class="fa-solid fa-phone text-slate-400 w-4"></i> <a href="tel:${v.phone}" class="text-blue-700 hover:underline font-medium">${v.phone}</a></p>
            ${v.notes ? `<p class="text-[11px] text-slate-500 italic mt-1">${v.notes}</p>` : ''}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-slate-50 p-2 rounded-lg">
              <p class="text-[10px] text-slate-500 uppercase">Contract</p>
              <p class="font-bold text-slate-800">${formatINR(v.contractAmount)}</p>
            </div>
            <div class="bg-emerald-50 p-2 rounded-lg">
              <p class="text-[10px] text-emerald-700 uppercase">Paid</p>
              <p class="font-bold text-emerald-800">${formatINR(v.advancePaid)}</p>
            </div>
            <div class="bg-rose-50 p-2 rounded-lg">
              <p class="text-[10px] text-rose-700 uppercase">Balance</p>
              <p class="font-bold text-rose-800">${formatINR(balance)}</p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <a href="tel:${v.phone}" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-phone"></i> Call
          </a>
          <button onclick="window.openVendorModal('${v.id}')" class="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold" title="Edit">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button onclick="window.deleteVendor('${v.id}')" class="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderGuestStats() {
  const confirmedGuests = (appState.guests || []).filter((g: any) => g.rsvp === 'Confirmed');
  const totalAttending = confirmedGuests.reduce((s: number, g: any) => s + (Number(g.members) || 0), 0);
  const groomGuests = confirmedGuests.filter((g: any) => g.side === 'Groom').reduce((s: number, g: any) => s + (Number(g.members) || 0), 0);
  const brideGuests = confirmedGuests.filter((g: any) => g.side === 'Bride').reduce((s: number, g: any) => s + (Number(g.members) || 0), 0);
  const roomsCount = (appState.guests || []).filter((g: any) => g.accommodation && g.hotel).length;

  const totEl = document.getElementById('guest-stat-total');
  if (totEl) totEl.innerText = String(totalAttending);
  const grEl = document.getElementById('guest-stat-groom');
  if (grEl) grEl.innerText = String(groomGuests);
  const brEl = document.getElementById('guest-stat-bride');
  if (brEl) brEl.innerText = String(brideGuests);
  const rmEl = document.getElementById('guest-stat-rooms');
  if (rmEl) rmEl.innerText = String(roomsCount);
}

function renderGuestDayPills(activeEventKey: string) {
  const pillsContainer = document.getElementById('guest-day-pills');
  const summaryEl = document.getElementById('guest-day-summary');
  if (!pillsContainer) return;

  const daysConfig = [
    { id: 'ALL', label: 'All Days', title: 'All Celebrations', sub: 'Nov 21-27' },
    { id: 'tilak', label: 'Day 1 • Tilak', title: 'Tilak Ceremony', sub: 'Nov 21' },
    { id: 'matkor', label: 'Day 2 • Matkor', title: 'Matkor Ceremony', sub: 'Nov 22' },
    { id: 'madwa', label: 'Day 3 • Madwa', title: 'Madwa Ceremony', sub: 'Nov 23' },
    { id: 'bhatman', label: 'Day 4 • Bhatman', title: 'Bhatman Ceremony', sub: 'Nov 24' },
    { id: 'barat', label: 'Day 5 • Barat', title: 'Barat & Varmala', sub: 'Nov 25' },
    { id: 'reception', label: 'Day 6 • Reception', title: 'Grand Reception', sub: 'Nov 27' }
  ];

  pillsContainer.innerHTML = daysConfig.map(d => {
    const isActive = activeEventKey === d.id;
    const attendingCount = (appState.guests || [])
      .filter((g: any) => g.rsvp === 'Confirmed' && (d.id === 'ALL' || (g.events && g.events[d.id])))
      .reduce((sum: number, g: any) => sum + (Number(g.members) || 0), 0);

    const activeClasses = 'bg-maroon text-gold-light border-maroon shadow-xs ring-1 ring-gold font-bold';
    const inactiveClasses = 'bg-white hover:bg-amber-50 text-slate-700 border-gold/30 hover:border-gold font-medium';

    return `
      <button type="button" onclick="window.setGuestDayFilter('${d.id}')" class="px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${isActive ? activeClasses : inactiveClasses}">
        <span class="${isActive ? 'text-gold' : 'text-slate-400'} text-[10px]"><i class="fa-solid fa-calendar-check"></i></span>
        <span>${d.label}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-gold/20 text-gold-light' : 'bg-amber-100/70 text-maroon font-bold'}">
          ${attendingCount} Confirmed
        </span>
      </button>
    `;
  }).join('');

  if (summaryEl) {
    const activeObj = daysConfig.find(d => d.id === activeEventKey);
    const attendingCount = (appState.guests || [])
      .filter((g: any) => g.rsvp === 'Confirmed' && (activeEventKey === 'ALL' || (g.events && g.events[activeEventKey])))
      .reduce((sum: number, g: any) => sum + (Number(g.members) || 0), 0);
    summaryEl.innerText = activeEventKey === 'ALL'
      ? `All 6 Celebrations Attendance (${attendingCount} Confirmed Guests)`
      : `${activeObj?.title || activeEventKey} (${activeObj?.sub}) • ${attendingCount} Confirmed Guests Attending`;
  }
}

export function renderGuestsTable() {
  const tbody = document.getElementById('guests-table-body');
  if (!tbody) return;

  const search = ((document.getElementById('guest-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const sideFilter = (document.getElementById('guest-filter-side') as HTMLSelectElement)?.value || 'ALL';
  const rsvpFilter = (document.getElementById('guest-filter-rsvp') as HTMLSelectElement)?.value || 'ALL';
  const eventFilter = (document.getElementById('guest-filter-event') as HTMLSelectElement)?.value || 'ALL';

  renderGuestDayPills(eventFilter);

  const filtered = (appState.guests || []).filter((g: any) => {
    const matchSearch = g.name.toLowerCase().includes(search) || (g.hotel && g.hotel.toLowerCase().includes(search)) || (g.contact && g.contact.includes(search));
    const matchSide = sideFilter === 'ALL' || g.side === sideFilter;
    const matchRsvp = rsvpFilter === 'ALL' || g.rsvp === rsvpFilter;
    const matchEvent = eventFilter === 'ALL' || (g.events && g.events[eventFilter]);
    return matchSearch && matchSide && matchRsvp && matchEvent;
  });

  const countEl = document.getElementById('guest-filter-count');
  if (countEl) countEl.innerText = `${filtered.length} of ${appState.guests.length} families`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-8 text-center text-slate-400">
          <i class="fa-solid fa-users-slash text-3xl mb-2 text-slate-300 block"></i>
          No guests found matching filters
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((g: any) => {
    const sideBadge = g.side === 'Groom'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Groom</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Bride</span>';

    // Interactive RSVP dropdown in table
    const rsvpSelect = `
      <select onchange="window.updateGuestRsvpDirect('${g.id}', this.value)" class="text-[10px] font-bold py-1 px-1.5 rounded-md border ${g.rsvp === 'Confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : (g.rsvp === 'Declined' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-amber-50 text-amber-800 border-amber-300')} focus:outline-none">
        <option value="Confirmed" ${g.rsvp === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="Pending" ${g.rsvp === 'Pending' ? 'selected' : ''}>Pending</option>
        <option value="Declined" ${g.rsvp === 'Declined' ? 'selected' : ''}>Declined</option>
      </select>
    `;

    // 1-Click Interactive Attendance matrix pills
    const eventsOrder = [
      { id: 'tilak', label: 'Til' },
      { id: 'matkor', label: 'Mat' },
      { id: 'madwa', label: 'Mad' },
      { id: 'bhatman', label: 'Bha' },
      { id: 'barat', label: 'Bar' },
      { id: 'reception', label: 'Rec' }
    ];

    const matrixPills = eventsOrder.map(e => {
      const isAttending = g.events && g.events[e.id];
      return `
        <button onclick="window.toggleGuestEventAttendance('${g.id}', '${e.id}')" title="Click to toggle ${e.id.toUpperCase()}" class="px-1.5 py-0.5 rounded text-[9px] font-bold transition-transform active:scale-95 ${isAttending ? 'bg-gold text-maroon-dark font-extrabold shadow-2xs' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}">
          ${e.label}
        </button>
      `;
    }).join(' ');

    return `
      <tr class="hover:bg-amber-50/40 transition-colors">
        <td class="py-3 px-4">
          <p class="font-semibold text-slate-900">${g.name}</p>
          ${g.contact ? `<p class="text-[11px] text-slate-500"><i class="fa-solid fa-phone text-[10px] mr-1"></i>${g.contact}</p>` : ''}
        </td>
        <td class="py-3 px-3">${sideBadge}</td>
        <td class="py-3 px-2 text-center font-bold text-slate-800">${g.members}</td>
        <td class="py-3 px-3 text-slate-600">
          ${g.accommodation ? `<span class="font-medium text-purple-900">${g.hotel || 'Hotel Assigned'}</span>` : '<span class="text-slate-400">Local / Self</span>'}
        </td>
        <td class="py-3 px-3 text-slate-500 text-[11px] max-w-[150px] truncate" title="${g.transport || ''}">
          ${g.transport || '—'}
        </td>
        <td class="py-3 px-3 text-center">
          <div class="flex items-center justify-center gap-1">
            ${matrixPills}
          </div>
        </td>
        <td class="py-3 px-3 text-center">${rsvpSelect}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="window.openGuestModal('${g.id}')" class="w-7 h-7 rounded-md bg-slate-100 hover:bg-gold hover:text-maroon-dark text-slate-600 transition-colors" title="Edit">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="window.deleteGuest('${g.id}')" class="w-7 h-7 rounded-md bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-colors" title="Delete">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function renderRituals() {
  const eventsList = appState.events || DEFAULT_EVENTS;
  const tabsContainer = document.getElementById('ritual-event-tabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = eventsList.map((evt: any) => {
      const isActive = evt.id === activeRitualTab;
      const tasks = (appState.rituals && appState.rituals[evt.id]) || [];
      const completed = tasks.filter((t: any) => t.done).length;
      return `
        <button onclick="window.setRitualTab('${evt.id}')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${isActive ? 'bg-maroon text-gold-light shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-gold'}">
          <span>${evt.title.split(' ')[0]}</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-gold text-maroon-dark font-bold' : 'bg-slate-100 text-slate-600'}">${completed}/${tasks.length}</span>
        </button>
      `;
    }).join('');
  }

  const currentEvt = eventsList.find((e: any) => e.id === activeRitualTab) || eventsList[0];
  const detailsCard = document.getElementById('active-event-details-card');
  const currentTasks = (appState.rituals && appState.rituals[activeRitualTab]) || [];
  const completedCount = currentTasks.filter((t: any) => t.done).length;
  const progressPct = currentTasks.length > 0 ? Math.round((completedCount / currentTasks.length) * 100) : 0;

  if (detailsCard) {
    detailsCard.innerHTML = `
      <div>
        <div class="flex items-center gap-2">
          <h3 class="font-cinzel font-bold text-xl text-maroon">${currentEvt.title} (${currentEvt.hindi || ''})</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${currentEvt.tagColor || 'bg-amber-100 text-amber-900'}">${currentEvt.dateStr}</span>
          <button onclick="window.openEditCeremonyModal('${currentEvt.id}')" class="text-xs text-gold-dark hover:text-maroon ml-2 font-semibold">
            <i class="fa-solid fa-pen"></i> Edit Ceremony
          </button>
        </div>
        <p class="text-xs text-slate-600 mt-1"><i class="fa-solid fa-location-dot text-gold-dark mr-1"></i> ${currentEvt.venue} • <i class="fa-regular fa-clock text-gold-dark mr-1"></i> ${currentEvt.time}</p>
        <p class="text-xs text-slate-700 mt-1"><i class="fa-solid fa-user-check text-gold-dark mr-1"></i> Coordinator: <strong>${currentEvt.coordinator}</strong></p>
      </div>
      <div class="text-right">
        <p class="text-xs font-semibold text-slate-500">Readiness: ${progressPct}%</p>
        <div class="w-36 bg-slate-200 rounded-full h-2 mt-1 overflow-hidden">
          <div class="bg-maroon h-2 rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
        </div>
        <p class="text-[11px] text-slate-500 mt-0.5">${completedCount} of ${currentTasks.length} tasks completed</p>
      </div>
    `;
  }

  const samagriContainer = document.getElementById('ritual-samagri-list');
  const opsContainer = document.getElementById('ritual-operations-list');

  const samagriTasks = currentTasks.filter((t: any) => t.category === 'Samagri');
  const opsTasks = currentTasks.filter((t: any) => t.category !== 'Samagri');

  function taskHtml(task: any) {
    return `
      <div class="p-3 rounded-xl border ${task.done ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'} flex items-start justify-between gap-3 hover:border-gold/60 transition-all">
        <div class="flex items-start gap-3 flex-1">
          <input type="checkbox" onchange="window.toggleTaskDone('${activeRitualTab}', '${task.id}')" ${task.done ? 'checked' : ''} class="w-4 h-4 rounded mt-0.5 text-maroon accent-maroon cursor-pointer">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold ${task.done ? 'task-done text-slate-400' : 'text-slate-800'}">${task.text}</p>
            ${task.notes ? `<p class="text-[11px] text-slate-500 mt-0.5 italic"><i class="fa-solid fa-circle-info text-[10px] mr-1 text-gold-dark"></i>${task.notes}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="window.openEditTaskModal('${activeRitualTab}', '${task.id}')" class="text-slate-400 hover:text-gold-dark text-xs p-1" title="Edit task details">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="window.deleteTask('${activeRitualTab}', '${task.id}')" class="text-slate-300 hover:text-rose-600 text-xs p-1" title="Remove task">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  }

  if (samagriContainer) {
    samagriContainer.innerHTML = samagriTasks.length > 0
      ? samagriTasks.map(taskHtml).join('')
      : '<p class="text-xs text-slate-400 italic p-3">No sacred samagri items listed yet.</p>';
  }

  if (opsContainer) {
    opsContainer.innerHTML = opsTasks.length > 0
      ? opsTasks.map(taskHtml).join('')
      : '<p class="text-xs text-slate-400 italic p-3">No operational logistics tasks added yet.</p>';
  }
}

export function openEditTaskModal(eventId: string, taskId: string) {
  const list = (appState.rituals && appState.rituals[eventId]) || [];
  const task = list.find((t: any) => t.id === taskId);
  if (!task) return;

  const modalsPlaceholder = document.getElementById('modals-placeholder')!;
  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          Edit Ritual Task
        </h3>
        <p class="text-xs text-slate-500 mb-4">Modify task description, category, and notes</p>

        <form onsubmit="window.handleUpdateTask(event, '${eventId}', '${taskId}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Task Category *</label>
            <select id="modal-task-cat" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
              <option value="Samagri" ${task.category === 'Samagri' ? 'selected' : ''}>Ritual Supplies & Sacred Samagri</option>
              <option value="Operations" ${task.category !== 'Samagri' ? 'selected' : ''}>Operational Logistics & Hospitality</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Task Description *</label>
            <input type="text" id="modal-task-text" required value="${task.text}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Coordinator Instructions / Notes</label>
            <input type="text" id="modal-task-notes" value="${task.notes || ''}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleUpdateTask(e: Event, eventId: string, taskId: string) {
  e.preventDefault();
  const list = (appState.rituals && appState.rituals[eventId]) || [];
  const task = list.find((t: any) => t.id === taskId);
  if (!task) return;

  task.category = (document.getElementById('modal-task-cat') as HTMLSelectElement).value;
  task.text = (document.getElementById('modal-task-text') as HTMLInputElement).value.trim();
  task.notes = (document.getElementById('modal-task-notes') as HTMLInputElement).value.trim();

  saveData(true);
  window.closeModal();
  renderRituals();
  showToast('Task updated and saved!');
}

export function initOrUpdateCharts() {
  const ChartLib = Chart;
  if (!ChartLib) return;

  // 1. Budget by category
  const catTotals: Record<string, number> = {};
  (appState.expenses || []).forEach((e: any) => {
    const cat = e.category || 'Other';
    catTotals[cat] = (catTotals[cat] || 0) + (Number(e.actual) || 0);
  });

  const catLabels = Object.keys(catTotals);
  const catData = Object.values(catTotals);

  const ctxBudget = document.getElementById('chart-budget-category') as HTMLCanvasElement;
  if (ctxBudget) {
    try {
      const existing = (ChartLib as any).getChart?.(ctxBudget);
      if (existing) existing.destroy();
      if (budgetChartInstance) {
        try { budgetChartInstance.destroy(); } catch (_) {}
      }
      budgetChartInstance = new ChartLib(ctxBudget, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catData,
            backgroundColor: ['#800020', '#D4AF37', '#C2593F', '#4A0815', '#AA820A', '#2D5A27', '#1E3A8A', '#7C2D12', '#64748B'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: ₹${(ctx.raw || 0).toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
    } catch (chartErr) {
      console.warn('Budget chart init error:', chartErr);
    }
  }

  // 2. RSVP by ceremony
  const eventsList = appState.events || DEFAULT_EVENTS;
  const eventHeadcounts = eventsList.map((evt: any) => {
    return (appState.guests || [])
      .filter((g: any) => g.rsvp === 'Confirmed' && g.events && g.events[evt.id])
      .reduce((sum: number, g: any) => sum + Number(g.members), 0);
  });

  const ctxGuests = document.getElementById('chart-guests-events') as HTMLCanvasElement;
  if (ctxGuests) {
    try {
      const existing = (ChartLib as any).getChart?.(ctxGuests);
      if (existing) existing.destroy();
      if (guestChartInstance) {
        try { guestChartInstance.destroy(); } catch (_) {}
      }
      guestChartInstance = new ChartLib(ctxGuests, {
        type: 'bar',
        data: {
          labels: eventsList.map((e: any) => e.title.split(' ')[0]),
          datasets: [{
            label: 'Confirmed Guests',
            data: eventHeadcounts,
            backgroundColor: '#800020',
            borderRadius: 6,
            hoverBackgroundColor: '#D4AF37'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(212, 175, 55, 0.15)' } },
            x: { grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` Attending: ${ctx.raw} guests`
              }
            }
          }
        }
      });
    } catch (chartErr) {
      console.warn('Guest chart init error:', chartErr);
    }
  }
}

// Live Dual Countdown
export function startCountdown() {
  const tilakDate = new Date('2026-11-21T11:00:00').getTime();
  const baratDate = new Date('2026-11-25T18:30:00').getTime();

  function update() {
    const now = new Date().getTime();

    // Tilak
    const diffTilak = tilakDate - now;
    if (diffTilak > 0) {
      const days = Math.floor(diffTilak / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTilak % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffTilak % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffTilak % (1000 * 60)) / 1000);
      const elD = document.getElementById('tilak-days');
      if (elD) elD.innerText = String(days).padStart(2, '0');
      const elH = document.getElementById('tilak-hours');
      if (elH) elH.innerText = String(hours).padStart(2, '0');
      const elM = document.getElementById('tilak-mins');
      if (elM) elM.innerText = String(mins).padStart(2, '0');
      const elS = document.getElementById('tilak-secs');
      if (elS) elS.innerText = String(secs).padStart(2, '0');
    }

    // Barat
    const diffBarat = baratDate - now;
    if (diffBarat > 0) {
      const days = Math.floor(diffBarat / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffBarat % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffBarat % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffBarat % (1000 * 60)) / 1000);
      const elD = document.getElementById('barat-days');
      if (elD) elD.innerText = String(days).padStart(2, '0');
      const elH = document.getElementById('barat-hours');
      if (elH) elH.innerText = String(hours).padStart(2, '0');
      const elM = document.getElementById('barat-mins');
      if (elM) elM.innerText = String(mins).padStart(2, '0');
      const elS = document.getElementById('barat-secs');
      if (elS) elS.innerText = String(secs).padStart(2, '0');
    }
  }

  update();
  setInterval(update, 1000);
}

// Tab navigation
export function switchTab(tabId: string) {
  const views = ['dashboard', 'events', 'budget', 'vendors', 'guests', 'rituals', 'emergency'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const nav = document.getElementById(`nav-${v}`);
    if (el) el.classList.toggle('hidden', v !== tabId);
    if (nav) nav.classList.toggle('active', v === tabId);
  });

  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'events') {
    renderEventsView();
  } else if (tabId === 'budget') {
    renderBudgetStats();
    renderExpensesTable();
  } else if (tabId === 'vendors') {
    renderVendorsGrid();
  } else if (tabId === 'guests') {
    renderGuestStats();
    renderGuestsTable();
  } else if (tabId === 'rituals') {
    renderRituals();
  } else if (tabId === 'emergency') {
    renderEmergency();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function closeModal() {
  const modalContainer = document.getElementById('modals-placeholder');
  if (modalContainer) modalContainer.innerHTML = '';
  (window as any).__pendingConfirmAction = null;
}

export function showConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  confirmStyle = 'bg-rose-700 hover:bg-rose-800 text-white',
  icon = 'fa-trash',
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmStyle?: string;
  icon?: string;
  onConfirm: () => void;
}) {
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) {
    onConfirm();
    return;
  }

  (window as any).__pendingConfirmAction = () => {
    closeModal();
    onConfirm();
  };

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 border border-gold/40 shadow-2xl relative text-center">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <i class="fa-solid ${icon} text-lg"></i>
        </div>
        <h3 class="text-lg font-cinzel font-bold text-maroon mb-1">
          ${title}
        </h3>
        <p class="text-xs text-slate-600 mb-6 leading-relaxed">
          ${message}
        </p>
        <div class="flex items-center justify-center gap-3">
          <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors">
            Cancel
          </button>
          <button type="button" onclick="window.__pendingConfirmAction && window.__pendingConfirmAction()" class="px-5 py-2 ${confirmStyle} rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid ${icon} text-[11px]"></i>
            <span>${confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Expense Add/Edit Modal
export function openExpenseModal(editId?: string) {
  const existing = editId ? (appState.expenses || []).find((e: any) => e.id === editId) : null;
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          ${existing ? 'Edit Expense Record' : 'Add New Expense Item'}
        </h3>
        <p class="text-xs text-slate-500 mb-4">Track budgeted vs actual payments across ceremonies</p>

        <form id="expense-form" onsubmit="window.handleSaveExpense(event, '${editId || ''}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Item / Service Name *</label>
            <input type="text" id="modal-exp-name" required value="${existing ? existing.name : ''}" placeholder="e.g. Royal Palace Lawn Deposit" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Event Tag</label>
              <select id="modal-exp-event" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Tilak" ${existing && existing.event === 'Tilak' ? 'selected' : ''}>Tilak</option>
                <option value="Matkor" ${existing && existing.event === 'Matkor' ? 'selected' : ''}>Matkor</option>
                <option value="Madwa" ${existing && existing.event === 'Madwa' ? 'selected' : ''}>Madwa</option>
                <option value="Bhatman" ${existing && existing.event === 'Bhatman' ? 'selected' : ''}>Bhatman</option>
                <option value="Barat" ${existing && existing.event === 'Barat' ? 'selected' : (!existing ? 'selected' : '')}>Barat (Main)</option>
                <option value="Reception" ${existing && existing.event === 'Reception' ? 'selected' : ''}>Reception</option>
                <option value="General" ${existing && existing.event === 'General' ? 'selected' : ''}>General / Common</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Category</label>
              <select id="modal-exp-cat" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Catering" ${existing && existing.category === 'Catering' ? 'selected' : ''}>Catering</option>
                <option value="Decoration" ${existing && existing.category === 'Decoration' ? 'selected' : ''}>Decoration</option>
                <option value="Attire" ${existing && existing.category === 'Attire' ? 'selected' : ''}>Attire & Jewellery</option>
                <option value="Venue" ${existing && existing.category === 'Venue' ? 'selected' : ''}>Venue</option>
                <option value="Photography" ${existing && existing.category === 'Photography' ? 'selected' : ''}>Photography</option>
                <option value="Ritual Supplies" ${existing && existing.category === 'Ritual Supplies' ? 'selected' : ''}>Ritual Supplies</option>
                <option value="Transport" ${existing && existing.category === 'Transport' ? 'selected' : ''}>Transport</option>
                <option value="Entertainment" ${existing && existing.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
                <option value="Other" ${existing && existing.category === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Estimated (₹)</label>
              <input type="number" id="modal-exp-est" min="0" value="${existing ? existing.estimated : '0'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Actual (₹) *</label>
              <input type="number" id="modal-exp-act" required min="0" value="${existing ? existing.actual : '0'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Paid (₹)</label>
              <input type="number" id="modal-exp-paid" min="0" value="${existing ? existing.paid : '0'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Payment Status</label>
              <select id="modal-exp-status" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Paid" ${existing && existing.status === 'Paid' ? 'selected' : ''}>Paid in Full</option>
                <option value="Partial" ${existing && existing.status === 'Partial' ? 'selected' : (!existing ? 'selected' : '')}>Partial Advance</option>
                <option value="Pending" ${existing && existing.status === 'Pending' ? 'selected' : ''}>Pending Payment</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Notes / Vendor Details</label>
              <input type="text" id="modal-exp-notes" value="${existing && existing.notes ? existing.notes : ''}" placeholder="Invoice or agreement info" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">${existing ? 'Update Record' : 'Save Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveExpense(event: Event, editId?: string) {
  event.preventDefault();
  const name = (document.getElementById('modal-exp-name') as HTMLInputElement).value.trim();
  const eventTag = (document.getElementById('modal-exp-event') as HTMLSelectElement).value;
  const category = (document.getElementById('modal-exp-cat') as HTMLSelectElement).value;
  const estimated = Number((document.getElementById('modal-exp-est') as HTMLInputElement).value) || 0;
  const actual = Number((document.getElementById('modal-exp-act') as HTMLInputElement).value) || 0;
  const paid = Number((document.getElementById('modal-exp-paid') as HTMLInputElement).value) || 0;
  const status = (document.getElementById('modal-exp-status') as HTMLSelectElement).value;
  const notes = (document.getElementById('modal-exp-notes') as HTMLInputElement).value.trim();

  if (editId) {
    const item = (appState.expenses || []).find((e: any) => e.id === editId);
    if (item) {
      Object.assign(item, { name, event: eventTag, category, estimated, actual, paid, status, notes });
    }
    showToast('Expense updated successfully');
  } else {
    appState.expenses.unshift({
      id: 'exp-' + Date.now(),
      name,
      event: eventTag,
      category,
      estimated,
      actual,
      paid,
      status,
      notes
    });
    showToast('New expense added');
  }

  saveData(true);
  closeModal();
  renderDashboard();
  renderBudgetStats();
  renderExpensesTable();
}

export function deleteExpense(id: string) {
  const item = (appState.expenses || []).find((e: any) => e.id === id);
  const itemName = item ? item.name : 'this expense record';

  showConfirmDialog({
    title: 'Delete Expense Item',
    message: `Are you sure you want to remove "${itemName}" from the expense manager? This action cannot be undone.`,
    confirmLabel: 'Delete Expense',
    onConfirm: () => {
      appState.expenses = (appState.expenses || []).filter((e: any) => e.id !== id);
      saveData(true);
      renderDashboard();
      renderBudgetStats();
      renderExpensesTable();
      showToast(`Expense "${itemName}" removed`, 'info');
    }
  });
}

// Vendor Add/Edit Modal
export function openVendorModal(editId?: string) {
  const existing = editId ? (appState.vendors || []).find((v: any) => v.id === editId) : null;
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          ${existing ? 'Edit Vendor Contract' : 'Add New Vendor'}
        </h3>
        <p class="text-xs text-slate-500 mb-4">Register service contract, contact, and advance payments</p>

        <form id="vendor-form" onsubmit="window.handleSaveVendor(event, '${editId || ''}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Vendor / Business Name *</label>
            <input type="text" id="modal-ven-name" required value="${existing ? existing.name : ''}" placeholder="e.g. Royal Rajputi Band" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Service Type *</label>
              <input type="text" id="modal-ven-service" required value="${existing ? existing.service : ''}" placeholder="e.g. Catering / Shehnai / Lights" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Assigned Event</label>
              <select id="modal-ven-event" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Barat" ${existing && existing.event === 'Barat' ? 'selected' : ''}>Barat (Main)</option>
                <option value="Tilak" ${existing && existing.event === 'Tilak' ? 'selected' : ''}>Tilak</option>
                <option value="Matkor" ${existing && existing.event === 'Matkor' ? 'selected' : ''}>Matkor</option>
                <option value="Madwa" ${existing && existing.event === 'Madwa' ? 'selected' : ''}>Madwa</option>
                <option value="Bhatman" ${existing && existing.event === 'Bhatman' ? 'selected' : ''}>Bhatman</option>
                <option value="Reception" ${existing && existing.event === 'Reception' ? 'selected' : ''}>Reception</option>
                <option value="General" ${existing && existing.event === 'General' ? 'selected' : (!existing ? 'selected' : '')}>All Events / General</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input type="text" id="modal-ven-person" value="${existing ? existing.contactPerson : ''}" placeholder="Name of POC" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input type="tel" id="modal-ven-phone" required value="${existing ? existing.phone : '+91 '}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Contract Amount (₹) *</label>
              <input type="number" id="modal-ven-amount" required min="0" value="${existing ? existing.contractAmount : '0'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Advance Paid (₹)</label>
              <input type="number" id="modal-ven-advance" min="0" value="${existing ? existing.advancePaid : '0'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Booking Status</label>
              <select id="modal-ven-status" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Confirmed" ${existing && existing.status === 'Confirmed' ? 'selected' : (!existing ? 'selected' : '')}>Confirmed</option>
                <option value="Tentative" ${existing && existing.status === 'Tentative' ? 'selected' : ''}>Tentative Inquiry</option>
                <option value="Completed" ${existing && existing.status === 'Completed' ? 'selected' : ''}>Completed</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Contract Notes</label>
              <input type="text" id="modal-ven-notes" value="${existing && existing.notes ? existing.notes : ''}" placeholder="Key inclusions or rider" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">${existing ? 'Update Vendor' : 'Save Vendor'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveVendor(event: Event, editId?: string) {
  event.preventDefault();
  const name = (document.getElementById('modal-ven-name') as HTMLInputElement).value.trim();
  const service = (document.getElementById('modal-ven-service') as HTMLInputElement).value.trim();
  const eventTag = (document.getElementById('modal-ven-event') as HTMLSelectElement).value;
  const contactPerson = (document.getElementById('modal-ven-person') as HTMLInputElement).value.trim();
  const phone = (document.getElementById('modal-ven-phone') as HTMLInputElement).value.trim();
  const contractAmount = Number((document.getElementById('modal-ven-amount') as HTMLInputElement).value) || 0;
  const advancePaid = Number((document.getElementById('modal-ven-advance') as HTMLInputElement).value) || 0;
  const status = (document.getElementById('modal-ven-status') as HTMLSelectElement).value;
  const notes = (document.getElementById('modal-ven-notes') as HTMLInputElement).value.trim();

  if (editId) {
    const item = (appState.vendors || []).find((v: any) => v.id === editId);
    if (item) {
      Object.assign(item, { name, service, event: eventTag, contactPerson, phone, contractAmount, advancePaid, status, notes });
    }
    showToast('Vendor contract updated');
  } else {
    appState.vendors.push({
      id: 'v-' + Date.now(),
      name,
      service,
      event: eventTag,
      contactPerson,
      phone,
      contractAmount,
      advancePaid,
      status,
      notes
    });
    showToast('Vendor registered successfully');
  }

  saveData(true);
  closeModal();
  renderDashboard();
  renderVendorsGrid();
}

export function deleteVendor(id: string) {
  const item = (appState.vendors || []).find((v: any) => v.id === id);
  const vendorName = item ? item.name : 'this vendor';

  showConfirmDialog({
    title: 'Delete Vendor Booking',
    message: `Are you sure you want to remove "${vendorName}" and cancel this vendor record?`,
    confirmLabel: 'Remove Vendor',
    onConfirm: () => {
      appState.vendors = (appState.vendors || []).filter((v: any) => v.id !== id);
      saveData(true);
      renderDashboard();
      renderVendorsGrid();
      showToast(`Vendor "${vendorName}" removed`, 'info');
    }
  });
}

// Guest Add/Edit Modal
export function openGuestModal(editId?: string) {
  const existing = editId ? (appState.guests || []).find((g: any) => g.id === editId) : null;
  const evts = existing ? existing.events : { tilak: true, matkor: true, madwa: true, bhatman: true, barat: true, reception: true };
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 border border-gold/40 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          ${existing ? 'Edit Guest Details' : 'Add Family / Guest Group'}
        </h3>
        <p class="text-xs text-slate-500 mb-4">Manage RSVP, family headcount, hotel room, and attendance matrix</p>

        <form id="guest-form" onsubmit="window.handleSaveGuest(event, '${editId || ''}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Family / Guest Name *</label>
            <input type="text" id="modal-gst-name" required value="${existing ? existing.name : ''}" placeholder="e.g. Ramesh Varma & Family" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Side *</label>
              <select id="modal-gst-side" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Groom" ${existing && existing.side === 'Groom' ? 'selected' : ''}>Groom Side</option>
                <option value="Bride" ${existing && existing.side === 'Bride' ? 'selected' : ''}>Bride Side</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Members Count *</label>
              <input type="number" id="modal-gst-members" min="1" max="25" required value="${existing ? existing.members : '2'}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">RSVP Status</label>
              <select id="modal-gst-rsvp" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="Confirmed" ${existing && existing.rsvp === 'Confirmed' ? 'selected' : (!existing ? 'selected' : '')}>Confirmed</option>
                <option value="Pending" ${existing && existing.rsvp === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Declined" ${existing && existing.rsvp === 'Declined' ? 'selected' : ''}>Declined</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone / Mobile</label>
              <input type="text" id="modal-gst-contact" value="${existing && existing.contact ? existing.contact : ''}" placeholder="+91 98..." class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Accommodation Needed?</label>
              <select id="modal-gst-accom" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
                <option value="yes" ${existing && existing.accommodation ? 'selected' : ''}>Yes - Hotel Required</option>
                <option value="no" ${existing && !existing.accommodation ? 'selected' : ''}>No - Local Resident / Self-Stay</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Hotel & Room Number Assignment</label>
            <input type="text" id="modal-gst-hotel" value="${existing && existing.hotel ? existing.hotel : ''}" placeholder="e.g. Fortune Landmark - Room 304" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Travel / Flight / Train Arrival Details</label>
            <input type="text" id="modal-gst-transport" value="${existing && existing.transport ? existing.transport : ''}" placeholder="e.g. Arriving Nov 21 Indigo 6E-241" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <!-- Multi-Event Attendance Matrix Checkboxes -->
          <div class="p-3 bg-amber-50/70 rounded-xl border border-gold/30">
            <label class="block font-bold text-maroon mb-2">Ceremonial Attendance Matrix (Select Events Attending):</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-tilak" ${evts && evts.tilak ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">1. Tilak</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-matkor" ${evts && evts.matkor ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">2. Matkor</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-madwa" ${evts && evts.madwa ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">3. Madwa</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-bhatman" ${evts && evts.bhatman ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">4. Bhatman</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-barat" ${evts && evts.barat ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">5. Barat (Main)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-chk-reception" ${evts && evts.reception ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon">
                <span class="font-medium text-slate-700">6. Reception</span>
              </label>
            </div>
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">${existing ? 'Update Guest' : 'Save Guest'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveGuest(event: Event, editId?: string) {
  event.preventDefault();
  const name = (document.getElementById('modal-gst-name') as HTMLInputElement).value.trim();
  const side = (document.getElementById('modal-gst-side') as HTMLSelectElement).value;
  const members = Number((document.getElementById('modal-gst-members') as HTMLInputElement).value) || 1;
  const rsvp = (document.getElementById('modal-gst-rsvp') as HTMLSelectElement).value;
  const contact = (document.getElementById('modal-gst-contact') as HTMLInputElement).value.trim();
  const accommodation = (document.getElementById('modal-gst-accom') as HTMLSelectElement).value === 'yes';
  const hotel = (document.getElementById('modal-gst-hotel') as HTMLInputElement).value.trim();
  const transport = (document.getElementById('modal-gst-transport') as HTMLInputElement).value.trim();

  const events = {
    tilak: (document.getElementById('modal-chk-tilak') as HTMLInputElement).checked,
    matkor: (document.getElementById('modal-chk-matkor') as HTMLInputElement).checked,
    madwa: (document.getElementById('modal-chk-madwa') as HTMLInputElement).checked,
    bhatman: (document.getElementById('modal-chk-bhatman') as HTMLInputElement).checked,
    barat: (document.getElementById('modal-chk-barat') as HTMLInputElement).checked,
    reception: (document.getElementById('modal-chk-reception') as HTMLInputElement).checked
  };

  if (editId) {
    const item = (appState.guests || []).find((g: any) => g.id === editId);
    if (item) {
      Object.assign(item, { name, side, members, rsvp, contact, accommodation, hotel, transport, events });
    }
    showToast('Guest record updated');
  } else {
    appState.guests.push({
      id: 'g-' + Date.now(),
      name,
      side,
      members,
      rsvp,
      contact,
      accommodation,
      hotel,
      transport,
      events
    });
    showToast('New guest registered');
  }

  saveData(true);
  closeModal();
  renderDashboard();
  renderGuestStats();
  renderGuestsTable();
}

export function deleteGuest(id: string) {
  const guest = (appState.guests || []).find((g: any) => g.id === id);
  const guestName = guest ? guest.name : 'this family';

  showConfirmDialog({
    title: 'Remove Guest',
    message: `Are you sure you want to remove "${guestName}" from the guest list and RSVP attendance matrix?`,
    confirmLabel: 'Remove Guest',
    onConfirm: () => {
      appState.guests = (appState.guests || []).filter((g: any) => g.id !== id);
      saveData(true);
      renderDashboard();
      renderGuestStats();
      renderGuestsTable();
      showToast(`Guest "${guestName}" removed`, 'info');
    }
  });
}

// Add Task to Ritual Checklist Modal
export function openAddTaskModal() {
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  const eventsList = appState.events || DEFAULT_EVENTS;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <h3 class="text-xl font-cinzel font-bold text-maroon mb-1">
          Add Ritual / Checklist Task
        </h3>
        <p class="text-xs text-slate-500 mb-4">Add sacred samagri or logistics operation item</p>

        <form onsubmit="window.handleSaveTask(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Select Event *</label>
            <select id="modal-task-event" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
              ${eventsList.map((e: any) => `<option value="${e.id}" ${e.id === activeRitualTab ? 'selected' : ''}>${e.title}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Category *</label>
            <select id="modal-task-cat" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold bg-white">
              <option value="Samagri">Ritual Supplies & Sacred Samagri</option>
              <option value="Operations">Event Operations & Logistics</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Task / Item Description *</label>
            <input type="text" id="modal-task-text" required placeholder="e.g. 5kg Pure Desi Cow Ghee for Hawan" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Coordinator Notes</label>
            <input type="text" id="modal-task-notes" placeholder="e.g. In-charge: Sharma Ji (+91 98...)" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold">
          </div>

          <div class="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md">Add to Checklist</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveTask(event: Event) {
  event.preventDefault();
  const eventId = (document.getElementById('modal-task-event') as HTMLSelectElement).value;
  const category = (document.getElementById('modal-task-cat') as HTMLSelectElement).value;
  const text = (document.getElementById('modal-task-text') as HTMLInputElement).value.trim();
  const notes = (document.getElementById('modal-task-notes') as HTMLInputElement).value.trim();

  if (!appState.rituals[eventId]) {
    appState.rituals[eventId] = [];
  }

  appState.rituals[eventId].push({
    id: 't-' + Date.now(),
    text,
    category,
    done: false,
    notes
  });

  saveData(true);
  closeModal();
  activeRitualTab = eventId;
  renderRituals();
  renderDashboard();
  showToast('Task added to ritual checklist');
}

// Emergency & Legal Rendering
export function renderEmergency() {
  const legalBox = document.getElementById('checklist-legal');
  const powerBox = document.getElementById('checklist-power');
  const medicalBox = document.getElementById('checklist-medical');

  function makeChecklist(items: any[], categoryKey: string) {
    return items.map((item, idx) => `
      <label class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
        <input type="checkbox" onchange="window.toggleEmergencyDone('${categoryKey}', ${idx})" ${item.done ? 'checked' : ''} class="w-4 h-4 rounded text-maroon accent-maroon mt-0.5">
        <span class="${item.done ? 'task-done text-slate-400' : 'text-slate-700 font-medium'}">${item.text}</span>
      </label>
    `).join('');
  }

  if (legalBox && appState.emergencyChecklist) legalBox.innerHTML = makeChecklist(appState.emergencyChecklist.legal || [], 'legal');
  if (powerBox && appState.emergencyChecklist) powerBox.innerHTML = makeChecklist(appState.emergencyChecklist.power || [], 'power');
  if (medicalBox && appState.emergencyChecklist) medicalBox.innerHTML = makeChecklist(appState.emergencyChecklist.medical || [], 'medical');
}

export function toggleEmergencyDone(category: string, idx: number) {
  if (appState.emergencyChecklist && appState.emergencyChecklist[category] && appState.emergencyChecklist[category][idx]) {
    appState.emergencyChecklist[category][idx].done = !appState.emergencyChecklist[category][idx].done;
    saveData(true);
    renderEmergency();
    showToast('Emergency checklist updated', 'info');
  }
}

// Backup & Restore
export function exportBackupData() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `royal-wedding-planner-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Wedding platform backup exported successfully!');
}

export function restoreBackupData(e: any) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt: any) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (parsed && parsed.expenses && parsed.vendors && parsed.guests && parsed.rituals) {
        appState = parsed;
        if (!appState.events) appState.events = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
        saveData(true);
        renderDashboard();
        showToast('Backup restored successfully!', 'success');
        e.target.value = '';
      } else {
        showToast('Invalid backup file structure', 'error');
      }
    } catch {
      showToast('Failed to parse backup JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

export function confirmResetModal() {
  showConfirmDialog({
    title: 'Reset to Sample Data',
    message: 'Are you sure you want to reset all wedding records to default sample data? Any unexported custom changes will be overwritten.',
    confirmLabel: 'Reset Everything',
    icon: 'fa-rotate-right',
    confirmStyle: 'bg-maroon hover:bg-maroon-deep text-gold-light',
    onConfirm: () => {
      appState = getDefaultAppState();
      saveData(true);
      renderDashboard();
      showToast('System reset to default wedding plan', 'info');
    }
  });
}

// Attach all methods to window for HTML event handlers
declare global {
  interface Window {
    [key: string]: any;
  }
}

// Expose all event handlers & state to window for HTML attributes
window.appState = appState;
window.formatINR = formatINR;
window.formatLakhs = formatLakhs;
window.showToast = showToast;
window.loadData = loadData;
window.saveData = saveData;

// Navigation & Modals
window.switchTab = switchTab;
window.closeModal = closeModal;
window.showConfirmDialog = showConfirmDialog;

// Expenses
window.openExpenseModal = openExpenseModal;
window.handleSaveExpense = handleSaveExpense;
window.deleteExpense = deleteExpense;
window.cycleExpenseStatus = cycleExpenseStatus;
window.renderExpensesTable = renderExpensesTable;
window.setExpenseDayFilter = setExpenseDayFilter;

// Vendors
window.openVendorModal = openVendorModal;
window.handleSaveVendor = handleSaveVendor;
window.deleteVendor = deleteVendor;
window.renderVendorsGrid = renderVendorsGrid;
window.setVendorDayFilter = setVendorDayFilter;

// Guests
window.openGuestModal = openGuestModal;
window.handleSaveGuest = handleSaveGuest;
window.deleteGuest = deleteGuest;
window.toggleGuestEventAttendance = toggleGuestEventAttendance;
window.updateGuestRsvpDirect = updateGuestRsvpDirect;
window.renderGuestsTable = renderGuestsTable;
window.renderGuestStats = renderGuestStats;
window.setGuestDayFilter = setGuestDayFilter;

// Rituals & Tasks
window.openAddTaskModal = openAddTaskModal;
window.handleSaveTask = handleSaveTask;
window.openEditTaskModal = openEditTaskModal;
window.handleUpdateTask = handleUpdateTask;
window.renderRituals = renderRituals;
window.setRitualTab = (eventId: string) => {
  activeRitualTab = eventId;
  renderRituals();
};
window.openEventDetails = (eventId: string) => {
  activeRitualTab = eventId;
  switchTab('rituals');
};
window.toggleTaskDone = (eventId: string, taskId: string) => {
  const list = (appState.rituals && appState.rituals[eventId]) || [];
  const task = list.find((t: any) => t.id === taskId);
  if (task) {
    task.done = !task.done;
    saveData(true);
    renderRituals();
    showToast(task.done ? 'Task marked complete' : 'Task reopened', 'info');
  }
};
window.deleteTask = (eventId: string, taskId: string) => {
  if (appState.rituals && appState.rituals[eventId]) {
    appState.rituals[eventId] = appState.rituals[eventId].filter((t: any) => t.id !== taskId);
    saveData(true);
    renderRituals();
    showToast('Task removed', 'info');
  }
};

// Target Budget & Ceremonies
window.openEditTargetBudgetModal = openEditTargetBudgetModal;
window.handleSaveTargetBudget = handleSaveTargetBudget;
window.openEditCeremonyModal = openEditCeremonyModal;
window.handleSaveCeremony = handleSaveCeremony;

// Emergency & Legal
window.renderEmergency = renderEmergency;
window.toggleEmergencyDone = toggleEmergencyDone;

// Backup, Restore & Reset
window.exportBackupData = exportBackupData;
window.restoreBackupData = restoreBackupData;
window.confirmResetModal = confirmResetModal;

// Google Sheets Auto-Sync
window.triggerGoogleSignIn = triggerGoogleSignIn;
window.triggerGoogleSignOut = triggerGoogleSignOut;
window.forceManualSync = forceManualSync;
window.scheduleGoogleSheetsAutoSync = scheduleGoogleSheetsAutoSync;

// Dashboard & Events View
window.renderDashboard = renderDashboard;
window.renderEventsView = renderEventsView;
window.renderBudgetStats = renderBudgetStats;
window.startCountdown = startCountdown;

// Initialize Application
export function initWeddingApp() {
  loadData();
  startCountdown();
  renderDashboard();

  // Initialize Google Auth Listener
  try {
    initGoogleAuth((user) => {
      if (user) {
        updateSyncStatusUI('synced');
      } else {
        updateSyncStatusUI('offline');
      }
    });
  } catch (authErr) {
    console.warn('Google Auth listener initialization:', authErr);
    updateSyncStatusUI('offline');
  }
}

// Auto run on module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWeddingApp);
} else {
  initWeddingApp();
}
