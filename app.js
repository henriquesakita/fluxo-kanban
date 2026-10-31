(() => {
  'use strict';

  const STORAGE_KEY = 'fluxo.kanban.v2';
  const LEGACY_KEY = 'fluxo.kanban.v1';
  const DAY = 86400000;

  const $ = (sel, root = document) => root.querySelector(sel);

  const icons = {
    pencil: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };

  const PRIORITIES = {
    low: { label: 'Baixa' },
    medium: { label: 'Média' },
    high: { label: 'Alta' }
  };

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

  const createdFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

  const fmtCreated = (ts) => {
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? '' : createdFmt.format(date).replace(/\./g, '');
  };

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  function isoDate(offsetDays) {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + offsetDays);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function dueInfo(value) {
    const date = parseDate(value);
    if (!date) return null;

    const today = startOfDay(new Date());
    const diff = Math.round((date - today) / DAY);

    if (diff < 0) return { tone: 'late', label: `Atrasado · ${shortFmt.format(date)}`, date };
    if (diff === 0) return { tone: 'today', label: 'Hoje', date };
    if (diff === 1) return { tone: 'today', label: 'Amanhã', date };
    return { tone: 'soon', label: shortFmt.format(date), date };
  }

  /* ---------------- Seed e normalização ---------------- */

  function makeCard(data) {
    return {
      id: uid(),
      title: data.title,
      desc: data.desc || '',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      dueDate: data.dueDate || '',
      checklist: (data.checklist || []).map((item) => ({ id: uid(), text: item.text, done: !!item.done })),
      createdAt: Date.now()
    };
  }

  function defaultColumns() {
    return [
      { id: uid(), title: 'A fazer', cards: [] },
      { id: uid(), title: 'Em andamento', cards: [] },
      { id: uid(), title: 'Concluído', cards: [] }
    ];
  }

  function seedBoard() {
    return {
      id: uid(),
      name: 'Meu quadro',
      columns: [
        {
          id: uid(),
          title: 'A fazer',
          cards: [
            makeCard({
              title: 'Definir o escopo da primeira versão',
              desc: 'Listar as telas, funcionalidades e o que fica para depois.',
              priority: 'high',
              tags: ['planejamento'],
              dueDate: isoDate(2),
              checklist: [
                { text: 'Telas', done: true },
                { text: 'Funcionalidades', done: false },
                { text: 'Prioridades', done: false }
              ]
            }),
            makeCard({
              title: 'Escolher a identidade visual',
              desc: 'Paleta escura, tipografia limpa e um acento vibrante.',
              priority: 'medium',
              tags: ['design'],
              dueDate: isoDate(5)
            }),
            makeCard({
              title: 'Escrever os textos da página inicial',
              priority: 'low',
              tags: ['conteúdo']
            })
          ]
        },
        {
          id: uid(),
          title: 'Em andamento',
          cards: [
            makeCard({
              title: 'Montar o quadro Kanban',
              desc: 'Colunas, cartões e arrastar e soltar funcionando.',
              priority: 'high',
              tags: ['produto', 'front-end'],
              dueDate: isoDate(-1),
              checklist: [
                { text: 'Colunas', done: true },
                { text: 'Arrastar e soltar', done: true },
                { text: 'Checklist', done: false }
              ]
            }),
            makeCard({
              title: 'Revisar atalhos de teclado',
              priority: 'low',
              tags: ['acessibilidade']
            })
          ]
        },
        {
          id: uid(),
          title: 'Concluído',
          cards: [
            makeCard({
              title: 'Configurar o projeto',
              desc: 'Estrutura base criada e rodando localmente.',
              priority: 'medium',
              tags: ['setup'],
              checklist: [{ text: 'Estrutura', done: true }]
            })
          ]
        }
      ]
    };
  }

  function normalizeCard(card) {
    return {
      id: typeof card.id === 'string' && card.id ? card.id : uid(),
      title: String(card.title || 'Sem título'),
      desc: String(card.desc || ''),
      priority: PRIORITIES[card.priority] ? card.priority : 'medium',
      tags: Array.isArray(card.tags) ? card.tags.map(String).slice(0, 6) : [],
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(card.dueDate || '') ? card.dueDate : '',
      checklist: (Array.isArray(card.checklist) ? card.checklist : [])
        .filter((item) => item && typeof item === 'object' && String(item.text || '').trim())
        .map((item) => ({
          id: typeof item.id === 'string' && item.id ? item.id : uid(),
          text: String(item.text),
          done: !!item.done
        })),
      createdAt: Number(card.createdAt) || Date.now()
    };
  }

  function normalizeBoard(raw) {
    if (!raw || !Array.isArray(raw.columns)) return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      name: String(raw.name || 'Quadro'),
      columns: raw.columns
        .filter((column) => column && typeof column === 'object')
        .map((column) => ({
          id: typeof column.id === 'string' && column.id ? column.id : uid(),
          title: String(column.title || 'Coluna'),
          cards: (Array.isArray(column.cards) ? column.cards : [])
            .filter((card) => card && typeof card === 'object')
            .map(normalizeCard)
        }))
    };
  }

  function normalizeState(raw) {
    // Aceita também o formato antigo ({ columns }) e o importado sem boards.
    if (raw && Array.isArray(raw.columns)) {
      raw = { boards: [{ name: 'Quadro importado', columns: raw.columns }] };
    }
    if (!raw || !Array.isArray(raw.boards)) return null;

    const boards = raw.boards.map(normalizeBoard).filter(Boolean);
    if (!boards.length) return null;

    return {
      version: 2,
      boards,
      activeBoardId: boards.some((board) => board.id === raw.activeBoardId) ? raw.activeBoardId : boards[0].id
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeState(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch {
      /* dados corrompidos: segue para o próximo passo */
    }

    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && Array.isArray(legacy.columns)) {
        const board = normalizeBoard({ name: 'Meu quadro', columns: legacy.columns });
        if (board) return { version: 2, boards: [board], activeBoardId: board.id };
      }
    } catch {
      /* sem dados antigos */
    }

    const board = seedBoard();
    return { version: 2, boards: [board], activeBoardId: board.id };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* armazenamento indisponível ou cheio */
    }
  }

  /* ---------------- Estado ---------------- */

  let state = load();
  let filter = '';
  let composerColumnId = null;
  let editing = null;
  let draftChecklist = [];
  let lastDeleted = null;
  let toastTimer = null;
  let menuOpen = false;

  const boardEl = $('#board');
  const modal = $('#modal');

  const activeBoard = () => state.boards.find((board) => board.id === state.activeBoardId) || state.boards[0];

  /* ---------------- Render ---------------- */

  function matches(card) {
    if (!filter) return true;
    const haystack = [card.title, card.desc, ...(card.tags || [])].join(' ').toLowerCase();
    return haystack.includes(filter);
  }

  function cardHTML(card) {
    const priority = PRIORITIES[card.priority] || PRIORITIES.medium;
    const due = dueInfo(card.dueDate);
    const total = card.checklist.length;
    const done = card.checklist.filter((item) => item.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const tags = (card.tags || [])
      .map((tag) => `<span class="tag">${esc(tag)}</span>`)
      .join('');

    return `<article class="card" data-id="${card.id}" tabindex="0" aria-label="${esc(card.title)}">
      <div class="card-top">
        <span class="badge p-${card.priority}">${priority.label}</span>
        ${due ? `<span class="due due-${due.tone}" title="Prazo: ${shortFmt.format(due.date)}">${esc(due.label)}</span>` : ''}
        <button class="icon-btn card-del" data-action="delete-card" data-id="${card.id}" title="Excluir cartão" aria-label="Excluir cartão">${icons.x}</button>
      </div>
      <h3 class="card-title">${esc(card.title)}</h3>
      ${card.desc ? `<p class="card-desc">${esc(card.desc)}</p>` : ''}
      ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      ${total ? `<div class="card-check">
        <div class="check-bar"><span style="width:${percent}%"></span></div>
        <span class="check-count">${done}/${total}</span>
      </div>` : ''}
      <footer class="card-meta"><span>${fmtCreated(card.createdAt)}</span></footer>
    </article>`;
  }

  function composerHTML() {
    return `<div class="composer">
      <textarea placeholder="Título do cartão..." rows="2" aria-label="Título do novo cartão"></textarea>
      <div class="composer-actions">
        <button class="btn btn-primary" data-action="submit-card" type="button">Adicionar</button>
        <button class="btn" data-action="cancel-card" type="button">Cancelar</button>
        <span class="composer-hint">Enter para salvar</span>
      </div>
    </div>`;
  }

  function columnHTML(column) {
    const visible = column.cards.filter(matches);
    const cardsHTML = visible.map(cardHTML).join('');
    const emptyHTML = visible.length
      ? ''
      : `<p class="empty">${filter ? 'Nenhum cartão encontrado' : 'Arraste cartões para cá'}</p>`;
    const footer = composerColumnId === column.id
      ? composerHTML()
      : `<button class="add-card" data-action="add-card" data-column="${column.id}" type="button">+ Adicionar cartão</button>`;

    return `<section class="column" data-column-id="${column.id}">
      <header class="column-head">
        <div class="column-title-wrap">
          <h2 class="column-title" data-column="${column.id}" title="Clique duas vezes para renomear">${esc(column.title)}</h2>
          <span class="column-count">${visible.length}</span>
        </div>
        <div class="column-actions">
          <button class="icon-btn" data-action="rename-column" data-column="${column.id}" title="Renomear coluna" aria-label="Renomear coluna">${icons.pencil}</button>
          <button class="icon-btn danger" data-action="delete-column" data-column="${column.id}" title="Excluir coluna" aria-label="Excluir coluna">${icons.trash}</button>
        </div>
      </header>
      <div class="cards" data-column="${column.id}">${cardsHTML}${emptyHTML}</div>
      ${footer}
    </section>`;
  }

  function render() {
    const current = activeBoard();
    $('#board-name').textContent = current.name;
    document.title = `${current.name} — Fluxo`;

    if (current.columns.length === 0) {
      boardEl.innerHTML = `<div class="board-empty">
        <h2>Quadro vazio</h2>
        <p>Crie a primeira coluna para começar a organizar seus cartões.</p>
        <button class="btn btn-primary" type="button" data-action="add-column">+ Criar coluna</button>
      </div>`;
    } else {
      boardEl.innerHTML = current.columns.map(columnHTML).join('');
    }

    const cards = current.columns.flatMap((column) => column.cards);
    const late = cards.filter((card) => {
      const info = dueInfo(card.dueDate);
      return info && info.tone === 'late';
    }).length;

    $('#stat').textContent = `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'}${late ? ` · ${late} atrasado${late > 1 ? 's' : ''}` : ''}`;

    if (composerColumnId) {
      const textarea = $('.composer textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }

    if (menuOpen) renderBoardMenu();
  }

  /* ---------------- Helpers ---------------- */

  function findColumn(id) {
    return activeBoard().columns.find((column) => column.id === id);
  }

  function findCard(columnId, cardId) {
    const column = findColumn(columnId);
    return column ? column.cards.find((card) => card.id === cardId) : null;
  }

  function locateCard(cardId) {
    for (const column of activeBoard().columns) {
      const index = column.cards.findIndex((card) => card.id === cardId);
      if (index >= 0) return { column, index, card: column.cards[index] };
    }
    return null;
  }

  function showToast(message, undo = false) {
    const toast = $('#toast');
    toast.innerHTML = `<span>${esc(message)}</span>${undo ? '<button class="btn" id="undo-btn" type="button">Desfazer</button>' : ''}`;
    toast.hidden = false;
    clearTimeout(toastTimer);

    if (undo) {
      $('#undo-btn').onclick = () => {
        if (!lastDeleted) return;
        const { card, columnId, index } = lastDeleted;
        const column = state.boards
          .flatMap((board) => board.columns)
          .find((item) => item.id === columnId);
        if (column) {
          column.cards.splice(Math.min(index, column.cards.length), 0, card);
          save();
          render();
        }
        lastDeleted = null;
        toast.hidden = true;
      };
    }

    toastTimer = setTimeout(() => {
      toast.hidden = true;
      lastDeleted = null;
    }, 6000);
  }

  /* ---------------- Quadros ---------------- */

  function renderBoardMenu() {
    const list = $('#board-list');
    list.innerHTML = state.boards.map((board) => {
      const count = board.columns.reduce((sum, column) => sum + column.cards.length, 0);
      return `<div class="board-item ${board.id === state.activeBoardId ? 'active' : ''}" data-board="${board.id}">
        <button type="button" class="board-pick" data-action="switch-board" data-board="${board.id}">
          <span class="board-pick-name">${esc(board.name)}</span>
          <span class="board-pick-count">${count}</span>
        </button>
        <button type="button" class="icon-btn" data-action="rename-board" data-board="${board.id}" title="Renomear quadro" aria-label="Renomear quadro">${icons.pencil}</button>
        <button type="button" class="icon-btn danger" data-action="delete-board" data-board="${board.id}" title="Excluir quadro" aria-label="Excluir quadro" ${state.boards.length === 1 ? 'disabled' : ''}>${icons.trash}</button>
      </div>`;
    }).join('');
  }

  function setMenu(open) {
    menuOpen = open;
    $('#board-menu').hidden = !open;
    $('#board-btn').setAttribute('aria-expanded', String(open));
    if (open) renderBoardMenu();
  }

  function switchBoard(id) {
    if (!state.boards.some((board) => board.id === id)) return;
    state.activeBoardId = id;
    composerColumnId = null;
    filter = '';
    $('#search').value = '';
    save();
    render();
    setMenu(false);
  }

  function newBoard() {
    let number = state.boards.length + 1;
    while (state.boards.some((board) => board.name === `Quadro ${number}`)) number += 1;

    const board = { id: uid(), name: `Quadro ${number}`, columns: defaultColumns() };
    state.boards.push(board);
    state.activeBoardId = board.id;
    composerColumnId = null;
    filter = '';
    $('#search').value = '';
    save();
    render();
    setMenu(true);
    startBoardRename(board.id);
  }

  function deleteBoard(id) {
    if (state.boards.length <= 1) return;
    const board = state.boards.find((item) => item.id === id);
    if (!board) return;

    const count = board.columns.reduce((sum, column) => sum + column.cards.length, 0);
    if (count > 0 && !confirm(`Excluir o quadro "${board.name}" e seus ${count} cartão(ões)?`)) return;

    state.boards = state.boards.filter((item) => item.id !== id);
    if (state.activeBoardId === id) {
      state.activeBoardId = state.boards[0].id;
      filter = '';
      $('#search').value = '';
    }
    save();
    render();
    renderBoardMenu();
  }

  function startBoardRename(id) {
    const row = document.querySelector(`.board-item[data-board="${id}"]`);
    const board = state.boards.find((item) => item.id === id);
    if (!row || !board) return;

    const pick = row.querySelector('.board-pick');
    if (!pick) return;

    const input = document.createElement('input');
    input.className = 'board-rename';
    input.value = board.name;
    input.setAttribute('aria-label', 'Nome do quadro');
    pick.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      if (commit) {
        const value = input.value.trim();
        if (value) board.name = value;
        save();
      }
      render();
      renderBoardMenu();
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  /* ---------------- Cartões ---------------- */

  function addCard(columnId) {
    const textarea = $('.composer textarea');
    const title = textarea ? textarea.value.trim() : '';
    if (!title) {
      if (textarea) textarea.focus();
      return;
    }

    const column = findColumn(columnId);
    if (!column) return;

    column.cards.push(makeCard({ title }));
    save();
    render();
  }

  function deleteCard(cardId) {
    const found = locateCard(cardId);
    if (!found) return;

    lastDeleted = { card: found.card, columnId: found.column.id, index: found.index };
    found.column.cards.splice(found.index, 1);
    save();
    render();
    showToast('Cartão excluído', true);
  }

  function moveCard(cardId, fromColumnId, toColumnId, index) {
    const from = findColumn(fromColumnId);
    const to = findColumn(toColumnId);
    if (!from || !to) return;

    const currentIndex = from.cards.findIndex((card) => card.id === cardId);
    if (currentIndex < 0) return;

    const [card] = from.cards.splice(currentIndex, 1);
    const target = Math.max(0, Math.min(index, to.cards.length));
    to.cards.splice(target, 0, card);
    save();
    render();
  }

  /* ---------------- Colunas ---------------- */

  function addColumn() {
    const column = { id: uid(), title: 'Nova coluna', cards: [] };
    activeBoard().columns.push(column);
    save();
    render();
    startRename(column.id);
  }

  function deleteColumn(columnId) {
    const column = findColumn(columnId);
    if (!column) return;

    if (column.cards.length > 0) {
      const ok = confirm(`Excluir a coluna "${column.title}" e seus ${column.cards.length} cartão(ões)?`);
      if (!ok) return;
    }

    activeBoard().columns = activeBoard().columns.filter((item) => item.id !== columnId);
    if (composerColumnId === columnId) composerColumnId = null;
    save();
    render();
  }

  function startRename(columnId) {
    const titleEl = boardEl.querySelector(`.column[data-column-id="${columnId}"] .column-title`);
    const column = findColumn(columnId);
    if (!titleEl || !column) return;

    const input = document.createElement('input');
    input.className = 'column-title-input';
    input.value = column.title;
    input.setAttribute('aria-label', 'Nome da coluna');
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      if (commit) {
        const value = input.value.trim();
        if (value) column.title = value;
        save();
      }
      render();
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  /* ---------------- Modal ---------------- */

  function renderChecklist() {
    const total = draftChecklist.length;
    const done = draftChecklist.filter((item) => item.done).length;
    $('#cl-progress').textContent = total ? `${done} de ${total}` : 'nenhum item';

    $('#checklist').innerHTML = draftChecklist.map((item) => `<li class="check-item ${item.done ? 'done' : ''}" data-id="${item.id}">
      <label class="check-label">
        <input type="checkbox" data-check="${item.id}" ${item.done ? 'checked' : ''}>
        <span>${esc(item.text)}</span>
      </label>
      <button type="button" class="icon-btn" data-remove-check="${item.id}" aria-label="Remover item">${icons.x}</button>
    </li>`).join('');
  }

  function addChecklistItem() {
    const input = $('#cl-input');
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    draftChecklist.push({ id: uid(), text, done: false });
    input.value = '';
    renderChecklist();
    input.focus();
  }

  function openEditor(columnId, cardId) {
    const card = findCard(columnId, cardId);
    if (!card) return;

    editing = { columnId, cardId };
    draftChecklist = card.checklist.map((item) => ({ ...item }));

    $('#f-title').value = card.title;
    $('#f-desc').value = card.desc || '';
    $('#f-priority').value = card.priority;
    $('#f-due').value = card.dueDate || '';
    $('#f-tags').value = (card.tags || []).join(', ');
    $('#cl-input').value = '';
    renderChecklist();

    modal.hidden = false;
    requestAnimationFrame(() => {
      const title = $('#f-title');
      title.focus();
      title.select();
    });
  }

  function closeModal() {
    modal.hidden = true;
    editing = null;
    draftChecklist = [];
  }

  $('#card-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!editing) return;

    const card = findCard(editing.columnId, editing.cardId);
    if (!card) {
      closeModal();
      return;
    }

    const title = $('#f-title').value.trim();
    if (!title) {
      $('#f-title').focus();
      return;
    }

    card.title = title;
    card.desc = $('#f-desc').value.trim();
    card.priority = $('#f-priority').value;
    card.dueDate = $('#f-due').value || '';
    card.tags = $('#f-tags').value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 6);
    card.checklist = draftChecklist.map((item) => ({ ...item }));

    save();
    render();
    closeModal();
  });

  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-delete').addEventListener('click', () => {
    if (!editing) return;
    const cardId = editing.cardId;
    closeModal();
    deleteCard(cardId);
  });

  modal.addEventListener('pointerdown', (event) => {
    if (event.target === modal) closeModal();
  });

  $('#checklist').addEventListener('change', (event) => {
    const id = event.target.dataset.check;
    if (!id) return;
    const item = draftChecklist.find((entry) => entry.id === id);
    if (item) {
      item.done = event.target.checked;
      renderChecklist();
    }
  });

  $('#checklist').addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-remove-check]');
    if (!trigger) return;
    draftChecklist = draftChecklist.filter((item) => item.id !== trigger.dataset.removeCheck);
    renderChecklist();
  });

  $('#cl-add').addEventListener('click', addChecklistItem);
  $('#cl-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addChecklistItem();
    }
  });

  /* ---------------- Drag & drop ---------------- */

  let drag = null;

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const cardEl = event.target.closest('.card');
    if (!cardEl || event.target.closest('button')) return;

    const columnEl = cardEl.closest('.column');
    if (!columnEl) return;

    const rect = cardEl.getBoundingClientRect();
    drag = {
      cardEl,
      cardId: cardEl.dataset.id,
      columnId: columnEl.dataset.columnId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      active: false,
      mode: null,
      ghost: null,
      placeholder: null
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function startDrag() {
    drag.active = true;
    document.body.classList.add('is-dragging');

    const ghost = drag.cardEl.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('dragging');
    ghost.style.width = `${drag.width}px`;
    ghost.style.transform = `translate(${drag.startX - drag.offsetX}px, ${drag.startY - drag.offsetY}px) rotate(1.5deg)`;
    document.body.appendChild(ghost);
    drag.ghost = ghost;

    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    placeholder.style.height = `${drag.height}px`;
    drag.cardEl.before(placeholder);
    drag.placeholder = placeholder;

    drag.cardEl.classList.add('dragging');
  }

  function onPointerMove(event) {
    if (!drag) return;

    if (drag.mode === 'scroll') return;

    if (!drag.active) {
      const dx = Math.abs(event.clientX - drag.startX);
      const dy = Math.abs(event.clientY - drag.startY);
      if (dx < 6 && dy < 6) return;

      // No toque, um arrasto vertical é rolagem da coluna (comportamento nativo).
      if (drag.pointerType !== 'mouse' && dy > dx) {
        drag.mode = 'scroll';
        return;
      }

      startDrag();
    }

    event.preventDefault();

    drag.ghost.style.transform =
      `translate(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px) rotate(1.5deg)`;

    const under = document.elementFromPoint(event.clientX, event.clientY);
    const container = under ? under.closest('.cards') : null;
    if (container) {
      const siblings = [...container.querySelectorAll('.card:not(.dragging)')];
      let before = null;
      for (const sibling of siblings) {
        const rect = sibling.getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          before = sibling;
          break;
        }
      }
      if (before) container.insertBefore(drag.placeholder, before);
      else container.appendChild(drag.placeholder);
    }

    const boardRect = boardEl.getBoundingClientRect();
    if (event.clientX < boardRect.left + 60) boardEl.scrollLeft -= 14;
    else if (event.clientX > boardRect.right - 60) boardEl.scrollLeft += 14;
  }

  function onPointerUp(event) {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    if (!drag) return;
    const current = drag;
    drag = null;

    if ((event && event.type === 'pointercancel') || current.mode === 'scroll') return;

    if (!current.active) {
      openEditor(current.columnId, current.cardId);
      return;
    }

    const placeholder = current.placeholder;
    const targetContainer = placeholder.parentElement;
    const targetColumnEl = targetContainer ? targetContainer.closest('.column') : null;

    let targetColumnId = current.columnId;
    let targetIndex = 0;

    if (targetContainer && targetColumnEl) {
      targetColumnId = targetColumnEl.dataset.columnId;
      for (const child of targetContainer.children) {
        if (child === placeholder) break;
        if (child.classList.contains('card') && !child.classList.contains('dragging')) targetIndex += 1;
      }
    }

    current.ghost.remove();
    current.cardEl.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    if (placeholder.parentElement) placeholder.remove();

    moveCard(current.cardId, current.columnId, targetColumnId, targetIndex);
  }

  /* ---------------- Eventos do quadro ---------------- */

  boardEl.addEventListener('pointerdown', onPointerDown);

  boardEl.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.dataset.action;
    const columnId = trigger.dataset.column || trigger.closest('.column')?.dataset.columnId;

    if (action === 'add-card') {
      composerColumnId = columnId;
      render();
    } else if (action === 'cancel-card') {
      composerColumnId = null;
      render();
    } else if (action === 'submit-card') {
      addCard(columnId);
    } else if (action === 'delete-card') {
      deleteCard(trigger.dataset.id);
    } else if (action === 'delete-column') {
      deleteColumn(columnId);
    } else if (action === 'rename-column') {
      startRename(columnId);
    } else if (action === 'add-column') {
      addColumn();
    }
  });

  boardEl.addEventListener('dblclick', (event) => {
    const title = event.target.closest('.column-title');
    if (title) startRename(title.dataset.column);
  });

  boardEl.addEventListener('keydown', (event) => {
    const textarea = event.target.closest('.composer textarea');

    if (textarea) {
      const columnId = textarea.closest('.column')?.dataset.columnId;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addCard(columnId);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        composerColumnId = null;
        render();
      }
      return;
    }

    if (event.target.classList.contains('card') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const cardId = event.target.dataset.id;
      const columnId = event.target.closest('.column')?.dataset.columnId;
      if (cardId && columnId) openEditor(columnId, cardId);
    }
  });

  /* ---------------- Topbar ---------------- */

  $('#board-btn').addEventListener('click', () => setMenu(!menuOpen));

  $('#board-menu').addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const id = trigger.dataset.board;
    if (trigger.dataset.action === 'switch-board') switchBoard(id);
    else if (trigger.dataset.action === 'rename-board') startBoardRename(id);
    else if (trigger.dataset.action === 'delete-board') deleteBoard(id);
  });

  $('#board-new').addEventListener('click', newBoard);

  document.addEventListener('pointerdown', (event) => {
    if (menuOpen && !event.target.closest('.board-switcher')) setMenu(false);
  });

  $('#search').addEventListener('input', (event) => {
    filter = event.target.value.trim().toLowerCase();
    render();
  });

  $('#add-column-btn').addEventListener('click', addColumn);

  $('#export-btn').addEventListener('click', async () => {
    const data = JSON.stringify(state, null, 2);
    const native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    const Filesystem = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
    const Share = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;

    if (native && Filesystem) {
      try {
        const bytes = new TextEncoder().encode(data);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        const saved = await Filesystem.writeFile({
          path: 'fluxo-quadros.json',
          data: base64,
          directory: 'CACHE',
          encoding: 'base64'
        });

        if (Share) {
          await Share.share({
            title: 'Backup do Fluxo',
            text: 'Quadros do Fluxo em JSON',
            files: [saved.uri],
            dialogTitle: 'Salvar backup do Fluxo'
          });
        }
        showToast('Quadros exportados');
      } catch {
        showToast('Não foi possível exportar');
      }
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fluxo-quadros.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Quadros exportados');
  });

  $('#import-btn').addEventListener('click', () => $('#import-file').click());

  $('#import-file').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeState(JSON.parse(String(reader.result)));
        if (!imported) throw new Error('formato inválido');
        state = imported;
        composerColumnId = null;
        filter = '';
        $('#search').value = '';
        save();
        render();
        showToast('Quadros importados');
      } catch {
        showToast('Arquivo inválido');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (!modal.hidden) {
      closeModal();
    } else if (menuOpen) {
      setMenu(false);
    } else if (composerColumnId) {
      composerColumnId = null;
      render();
    }
  });

  render();
})();
