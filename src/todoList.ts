/**
 * Wedding To-Do List & Task Management Module
 * Allows users to add, edit, filter, delete, and check-off to-dos by date with optional categories.
 * Syncs seamlessly across devices and persists to LocalStorage & Google Sheets.
 * Made By: Ravi Shankar Sharma (Contact: +91 8271890090)
 */

import { appState, saveData, showToast, showConfirmDialog, closeModal } from './app.ts';
import type { TodoItem } from './defaultWeddingData.ts';
import { DEFAULT_TODOS } from './defaultWeddingData.ts';

export type { TodoItem };
export { DEFAULT_TODOS };

let activeCategoryFilter = 'ALL';
let activeStatusFilter = 'ALL';
let activeDateFilter = '';
let searchQuery = '';

export function getActiveTodos(): TodoItem[] {
  if (!appState.todos || !Array.isArray(appState.todos)) {
    appState.todos = JSON.parse(JSON.stringify(DEFAULT_TODOS));
  }
  return appState.todos;
}

export function setTodoCategoryFilter(category: string) {
  activeCategoryFilter = category;
  renderTodoList();
}

export function setTodoStatusFilter(status: string) {
  activeStatusFilter = status;
  renderTodoList();
}

export function setTodoDateFilter(dateVal: string) {
  activeDateFilter = dateVal;
  renderTodoList();
}

export function setTodoSearch(query: string) {
  searchQuery = query.toLowerCase().trim();
  renderTodoList();
}

export function toggleTodoDone(todoId: string) {
  const todos = getActiveTodos();
  const item = todos.find(t => t.id === todoId);
  if (!item) return;

  item.done = !item.done;
  saveData(true);
  renderTodoList();
  showToast(item.done ? `Marked "${item.task}" as completed!` : `Reopened "${item.task}"`, 'success');
}

export function deleteTodo(todoId: string) {
  const todos = getActiveTodos();
  const item = todos.find(t => t.id === todoId);
  if (!item) return;

  showConfirmDialog({
    title: 'Delete To-Do Item',
    message: `Are you sure you want to delete "${item.task}"? This will be removed across all connected devices.`,
    confirmLabel: 'Delete Item',
    icon: 'fa-trash',
    confirmStyle: 'bg-rose-700 hover:bg-rose-800 text-white',
    onConfirm: () => {
      appState.todos = todos.filter(t => t.id !== todoId);
      saveData(true);
      renderTodoList();
      showToast('To-Do item deleted successfully', 'info');
    }
  });
}

export function openAddTodoModal(initialDate?: string) {
  const defaultDate = initialDate || new Date().toISOString().split('T')[0];
  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-8 h-8 rounded-lg bg-amber-100 text-maroon flex items-center justify-center text-sm">
            <i class="fa-solid fa-calendar-check"></i>
          </span>
          <h3 class="text-lg sm:text-xl font-cinzel font-bold text-maroon">
            Add New To-Do Item
          </h3>
        </div>
        <p class="text-xs text-slate-500 mb-4">Set date, task details, and optional category to track on your master checklist</p>

        <form onsubmit="window.handleSaveTodo(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">To-Do Task / Description *</label>
            <input type="text" id="modal-todo-task" required placeholder="e.g. Collect pagris, safas & sherwani matching stoles" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold font-medium text-slate-800">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Due Date *</label>
              <input type="date" id="modal-todo-date" required value="${defaultDate}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold font-semibold text-slate-800">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Category <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-todo-category" list="todo-category-suggestions" placeholder="e.g. Shopping, Outfits, Arrangements" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
              <datalist id="todo-category-suggestions">
                <option value="Shopping">
                <option value="Outfits & Wardrobe">
                <option value="Arrangements & Operations">
                <option value="Transport & Vehicles">
                <option value="Payments & Cash Envelopes">
                <option value="Puja & Samagri">
                <option value="Entertainment & Music">
                <option value="Hospitality & Hotel">
                <option value="Personal / Groom">
              </datalist>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Assigned Person / In-charge <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-todo-assignee" placeholder="e.g. Ravi, Rohit, Chacha Ji" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Special Notes / Phone <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-todo-notes" placeholder="e.g. Call shopkeeper at 11 AM" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-plus text-xs"></i>
              <span>Add To-Do Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleSaveTodo(e: Event) {
  e.preventDefault();
  const taskInput = document.getElementById('modal-todo-task') as HTMLInputElement;
  const dateInput = document.getElementById('modal-todo-date') as HTMLInputElement;
  const catInput = document.getElementById('modal-todo-category') as HTMLInputElement;
  const assigneeInput = document.getElementById('modal-todo-assignee') as HTMLInputElement;
  const notesInput = document.getElementById('modal-todo-notes') as HTMLInputElement;

  if (!taskInput || !dateInput || !taskInput.value.trim()) return;

  const newTodo: TodoItem = {
    id: 'todo-' + Date.now(),
    task: taskInput.value.trim(),
    dueDate: dateInput.value || new Date().toISOString().split('T')[0],
    category: catInput?.value.trim() || undefined,
    assignedTo: assigneeInput?.value.trim() || undefined,
    notes: notesInput?.value.trim() || undefined,
    done: false,
    createdAt: new Date().toISOString()
  };

  const todos = getActiveTodos();
  todos.unshift(newTodo);
  saveData(true);
  closeModal();
  renderTodoList();
  showToast(`Added: "${newTodo.task}" on ${newTodo.dueDate}`);
}

export function openEditTodoModal(todoId: string) {
  const todos = getActiveTodos();
  const item = todos.find(t => t.id === todoId);
  if (!item) return;

  const modalsPlaceholder = document.getElementById('modals-placeholder');
  if (!modalsPlaceholder) return;

  modalsPlaceholder.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-gold/40 shadow-2xl relative">
        <button onclick="window.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-8 h-8 rounded-lg bg-amber-100 text-maroon flex items-center justify-center text-sm">
            <i class="fa-solid fa-pen-to-square"></i>
          </span>
          <h3 class="text-lg sm:text-xl font-cinzel font-bold text-maroon">
            Edit To-Do Item
          </h3>
        </div>
        <p class="text-xs text-slate-500 mb-4">Modify task details, target date or category</p>

        <form onsubmit="window.handleUpdateTodo(event, '${item.id}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">To-Do Task / Description *</label>
            <input type="text" id="modal-edit-todo-task" required value="${item.task.replace(/"/g, '&quot;')}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold font-medium text-slate-800">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Due Date *</label>
              <input type="date" id="modal-edit-todo-date" required value="${item.dueDate || ''}" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold font-semibold text-slate-800">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Category <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-edit-todo-category" value="${(item.category || '').replace(/"/g, '&quot;')}" list="todo-category-suggestions" placeholder="e.g. Shopping, Outfits" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Assigned Person / In-charge <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-edit-todo-assignee" value="${(item.assignedTo || '').replace(/"/g, '&quot;')}" placeholder="e.g. Ravi, Rohit" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Special Notes / Phone <span class="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" id="modal-edit-todo-notes" value="${(item.notes || '').replace(/"/g, '&quot;')}" placeholder="e.g. Additional details" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-gold text-slate-800">
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button type="button" onclick="window.deleteTodo('${item.id}'); window.closeModal();" class="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold shadow-md flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-floppy-disk text-xs"></i>
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function handleUpdateTodo(e: Event, todoId: string) {
  e.preventDefault();
  const todos = getActiveTodos();
  const item = todos.find(t => t.id === todoId);
  if (!item) return;

  const taskInput = document.getElementById('modal-edit-todo-task') as HTMLInputElement;
  const dateInput = document.getElementById('modal-edit-todo-date') as HTMLInputElement;
  const catInput = document.getElementById('modal-edit-todo-category') as HTMLInputElement;
  const assigneeInput = document.getElementById('modal-edit-todo-assignee') as HTMLInputElement;
  const notesInput = document.getElementById('modal-edit-todo-notes') as HTMLInputElement;

  if (taskInput && taskInput.value.trim()) item.task = taskInput.value.trim();
  if (dateInput) item.dueDate = dateInput.value;
  item.category = catInput?.value.trim() || undefined;
  item.assignedTo = assigneeInput?.value.trim() || undefined;
  item.notes = notesInput?.value.trim() || undefined;

  saveData(true);
  closeModal();
  renderTodoList();
  showToast(`Updated: "${item.task}"`);
}

function formatDateDisplay(dateStr: string): { formatted: string; isPast: boolean; isToday: boolean; isWeddingWeek: boolean } {
  if (!dateStr) return { formatted: 'No date', isPast: false, isToday: false, isWeddingWeek: false };

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = dateObj.getTime() === today.getTime();
  const isPast = dateObj.getTime() < today.getTime() && !isToday;

  // Wedding ceremonies Nov 21 - 27, 2026
  const isWeddingWeek = y === 2026 && m === 11 && d >= 21 && d <= 27;

  const formatted = dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return { formatted, isPast, isToday, isWeddingWeek };
}

export function renderTodoList() {
  const container = document.getElementById('todos-container');
  if (!container) return;

  const todos = getActiveTodos();

  // Compute categories list for filter dropdown
  const categorySet = new Set<string>();
  todos.forEach(t => {
    if (t.category && t.category.trim()) categorySet.add(t.category.trim());
  });
  const categoryList = Array.from(categorySet).sort();

  // Populate Category Filter dropdown if exists
  const catSelect = document.getElementById('todo-filter-category') as HTMLSelectElement;
  if (catSelect) {
    const prevVal = activeCategoryFilter;
    let html = `<option value="ALL">All Categories (${todos.length})</option>`;
    categoryList.forEach(cat => {
      const count = todos.filter(t => t.category === cat).length;
      html += `<option value="${cat}">${cat} (${count})</option>`;
    });
    catSelect.innerHTML = html;
    catSelect.value = prevVal;
  }

  // Update Summary Stats
  const totalCount = todos.length;
  const completedCount = todos.filter(t => t.done).length;
  const pendingCount = totalCount - completedCount;
  const pctDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const totalEl = document.getElementById('todo-stat-total');
  const completedEl = document.getElementById('todo-stat-completed');
  const pendingEl = document.getElementById('todo-stat-pending');
  const progressEl = document.getElementById('todo-stat-progress');
  const progressBarEl = document.getElementById('todo-stat-progressbar');
  const countBadgeEl = document.getElementById('todo-filter-count');

  if (totalEl) totalEl.innerText = String(totalCount);
  if (completedEl) completedEl.innerText = String(completedCount);
  if (pendingEl) pendingEl.innerText = String(pendingCount);
  if (progressEl) progressEl.innerText = `${pctDone}% Complete`;
  if (progressBarEl) progressBarEl.style.width = `${pctDone}%`;

  // Apply filters
  let filtered = [...todos];

  // 1. Status Filter
  if (activeStatusFilter === 'PENDING') {
    filtered = filtered.filter(t => !t.done);
  } else if (activeStatusFilter === 'DONE') {
    filtered = filtered.filter(t => t.done);
  }

  // 2. Category Filter
  if (activeCategoryFilter !== 'ALL') {
    filtered = filtered.filter(t => (t.category || '').toLowerCase() === activeCategoryFilter.toLowerCase());
  }

  // 3. Date Filter
  if (activeDateFilter) {
    filtered = filtered.filter(t => t.dueDate === activeDateFilter);
  }

  // 4. Search Query
  if (searchQuery) {
    filtered = filtered.filter(t =>
      t.task.toLowerCase().includes(searchQuery) ||
      (t.category && t.category.toLowerCase().includes(searchQuery)) ||
      (t.assignedTo && t.assignedTo.toLowerCase().includes(searchQuery)) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery))
    );
  }

  if (countBadgeEl) {
    countBadgeEl.innerText = `${filtered.length} of ${totalCount} items`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4 rounded-2xl bg-amber-royal/40 border border-gold/30">
        <div class="w-14 h-14 mx-auto rounded-full bg-amber-100 text-maroon flex items-center justify-center text-xl mb-3 shadow-inner">
          <i class="fa-solid fa-list-check"></i>
        </div>
        <h4 class="font-cinzel font-bold text-maroon text-base mb-1">No To-Do Items Found</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          ${searchQuery || activeDateFilter || activeCategoryFilter !== 'ALL' || activeStatusFilter !== 'ALL' 
            ? 'No tasks match your current search / date filters. Try clearing filters or adding a new task.' 
            : 'You have not added any to-do items yet. Create your first task to stay organized!'}
        </p>
        <button onclick="window.openAddTodoModal('${activeDateFilter || ''}')" class="px-4 py-2 bg-maroon hover:bg-maroon-deep text-gold-light rounded-lg font-bold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add New To-Do</span>
        </button>
      </div>
    `;
    return;
  }

  // Group filtered items by Date (Chronological)
  // Sort: Pending first, then by dueDate ascending
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  // Grouping map
  const groupsByDate: { [date: string]: TodoItem[] } = {};
  filtered.forEach(item => {
    const key = item.dueDate || 'No Date Specified';
    if (!groupsByDate[key]) groupsByDate[key] = [];
    groupsByDate[key].push(item);
  });

  const sortedDates = Object.keys(groupsByDate).sort();

  let html = `<div class="space-y-4">`;

  sortedDates.forEach(dateKey => {
    const itemsInDate = groupsByDate[dateKey];
    const dateInfo = formatDateDisplay(dateKey);

    let dateBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
    let dateExtra = '';
    if (dateInfo.isToday) {
      dateBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
      dateExtra = ' • Today';
    } else if (dateInfo.isWeddingWeek) {
      dateBadgeClass = 'bg-rose-100 text-maroon border-gold font-bold';
      dateExtra = ' • Wedding Festivities';
    } else if (dateInfo.isPast) {
      dateBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
      dateExtra = ' • Past';
    }

    const completedInDate = itemsInDate.filter(t => t.done).length;

    html += `
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden hover:border-gold/50 transition-all">
        <!-- Date Header Banner -->
        <div class="bg-amber-50/70 border-b border-slate-200/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg text-xs border ${dateBadgeClass} flex items-center gap-1.5 shadow-2xs">
              <i class="fa-regular fa-calendar text-xs"></i>
              <span>${dateInfo.formatted}${dateExtra}</span>
            </span>
            <span class="text-[11px] font-semibold text-slate-500">
              ${completedInDate}/${itemsInDate.length} Completed
            </span>
          </div>
          <button onclick="window.openAddTodoModal('${dateKey}')" class="px-2 py-1 text-[11px] font-bold text-maroon hover:text-gold-dark hover:bg-white rounded-md transition-all flex items-center gap-1 border border-transparent hover:border-gold/40 cursor-pointer" title="Add another task for this date">
            <i class="fa-solid fa-plus text-[10px]"></i>
            <span>Add Task</span>
          </button>
        </div>

        <!-- Task Items List -->
        <div class="divide-y divide-slate-100">
    `;

    itemsInDate.forEach(item => {
      const isDone = item.done;
      html += `
        <div class="p-3 sm:p-3.5 flex items-start gap-3 hover:bg-amber-royal/20 transition-colors ${isDone ? 'bg-slate-50/60' : ''}">
          <!-- Checkbox Trigger -->
          <button onclick="window.toggleTodoDone('${item.id}')" class="mt-0.5 w-5 h-5 rounded-md border-2 ${isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-gold text-transparent'} flex items-center justify-center text-xs shrink-0 transition-all cursor-pointer shadow-2xs" title="${isDone ? 'Click to mark as pending' : 'Click to mark as completed'}">
            <i class="fa-solid fa-check text-[11px] ${isDone ? 'opacity-100' : 'opacity-0'}"></i>
          </button>

          <!-- Task Details -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              ${item.category ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
                  <i class="fa-solid fa-tag text-[8px] mr-1 text-gold-dark"></i>${item.category}
                </span>
              ` : ''}
              ${item.assignedTo ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <i class="fa-solid fa-user text-[8px] mr-1 text-slate-500"></i>${item.assignedTo}
                </span>
              ` : ''}
              ${isDone ? `
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ DONE
                </span>
              ` : ''}
            </div>

            <p class="text-xs sm:text-sm font-semibold text-slate-900 leading-snug ${isDone ? 'line-through text-slate-400' : ''}">
              ${item.task}
            </p>

            ${item.notes ? `
              <p class="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <i class="fa-regular fa-note-sticky text-gold-dark text-[10px]"></i>
                <span>${item.notes}</span>
              </p>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1 shrink-0 ml-1">
            <button onclick="window.openEditTodoModal('${item.id}')" class="p-1.5 text-slate-400 hover:text-gold-dark rounded-md hover:bg-white transition-colors cursor-pointer" title="Edit Task">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="window.deleteTodo('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors cursor-pointer" title="Delete Task">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;
}
