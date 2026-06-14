const STORAGE_KEY = "naver-series-manager-table-v2";

const state = {
  accounts: [],
  works: [],
  workSort: { key: "title", direction: "asc" },
  workSearch: ""
};

const els = {};

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function createAccount() {
  return {
    id: uid(),
    name: "",
    loginId: "",
    cookieTotal: 0,
    expireToday: 0,
    expireTomorrow: 0,
    expireDayAfterTomorrow: 0,
    note: "",
    expanded: false,
    purchases: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function createWork() {
  return {
    id: uid(),
    title: "",
    price: 0,
    isDiscounted: false,
    discountEndDate: "",
    note: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function createPurchase() {
  return {
    id: uid(),
    workId: "",
    title: "",
    cookieCost: 0
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.accounts = Array.isArray(saved.accounts) ? saved.accounts.map(normalizeAccount) : [];
    state.works = Array.isArray(saved.works) ? saved.works.map(normalizeWork) : [];
    if (saved.workSort && (saved.workSort.key === "title" || saved.workSort.key === "price")) {
      state.workSort.key = saved.workSort.key;
      state.workSort.direction = saved.workSort.direction === "desc" ? "desc" : "asc";
    }
  } catch (error) {
    console.error("저장 데이터 로드 실패", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accounts: state.accounts,
    works: state.works,
    workSort: state.workSort
  }));
}

function normalizeAccount(item) {
  return {
    id: item.id || uid(),
    name: typeof item.name === "string" ? item.name : "",
    loginId: typeof item.loginId === "string" ? item.loginId : "",
    cookieTotal: toNonNegativeInt(item.cookieTotal),
    expireToday: toNonNegativeInt(item.expireToday),
    expireTomorrow: toNonNegativeInt(item.expireTomorrow),
    expireDayAfterTomorrow: toNonNegativeInt(item.expireDayAfterTomorrow),
    note: typeof item.note === "string" ? item.note : "",
    expanded: Boolean(item.expanded),
    purchases: Array.isArray(item.purchases) ? item.purchases.map(normalizePurchase) : [],
    createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : nowIso()
  };
}

function normalizeWork(item) {
  return {
    id: item.id || uid(),
    title: typeof item.title === "string" ? item.title : "",
    price: toNonNegativeInt(item.price),
    isDiscounted: Boolean(item.isDiscounted),
    discountEndDate: typeof item.discountEndDate === "string" ? item.discountEndDate : "",
    note: typeof item.note === "string" ? item.note : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : nowIso()
  };
}

function normalizePurchase(item) {
  return {
    id: item.id || uid(),
    workId: typeof item.workId === "string" ? item.workId : "",
    title: typeof item.title === "string" ? item.title : "",
    cookieCost: toNonNegativeInt(item.cookieCost)
  };
}

function initElements() {
  els.accountTableBody = document.getElementById("accountTableBody");
  els.workTableBody = document.getElementById("workTableBody");
  els.addAccountBtn = document.getElementById("addAccountBtn");
  els.backupBtn = document.getElementById("backupBtn");
  els.restoreBtn = document.getElementById("restoreBtn");
  els.restoreInput = document.getElementById("restoreInput");
  els.resetBtn = document.getElementById("resetBtn");
  els.summaryAccounts = document.getElementById("summaryAccounts");
  els.summaryCookies = document.getElementById("summaryCookies");
  els.summaryExpireSoon = document.getElementById("summaryExpireSoon");
  els.summaryWorks = document.getElementById("summaryWorks");
  els.workForm = document.getElementById("workForm");
  els.workId = document.getElementById("workId");
  els.workTitle = document.getElementById("workTitle");
  els.workPrice = document.getElementById("workPrice");
  els.workDiscount = document.getElementById("workDiscount");
  els.workDiscountEnd = document.getElementById("workDiscountEnd");
  els.workNote = document.getElementById("workNote");
  els.cancelWorkEditBtn = document.getElementById("cancelWorkEditBtn");
  els.sortTitleBtn = document.getElementById("sortTitleBtn");
  els.sortPriceBtn = document.getElementById("sortPriceBtn");
  els.workSearchInput = document.getElementById("workSearchInput");
  els.workListData = document.getElementById("workListData");
  els.purchaseRowTemplate = document.getElementById("purchaseRowTemplate");
}

function bindEvents() {
  els.addAccountBtn.addEventListener("click", () => {
    state.accounts.push(createAccount());
    commit();
  });

  els.backupBtn.addEventListener("click", backupJson);

  els.restoreBtn.addEventListener("click", () => els.restoreInput.click());

  els.restoreInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      state.accounts = Array.isArray(data.accounts) ? data.accounts.map(normalizeAccount) : [];
      state.works = Array.isArray(data.works) ? data.works.map(normalizeWork) : [];
      if (data.workSort && (data.workSort.key === "title" || data.workSort.key === "price")) {
        state.workSort = {
          key: data.workSort.key,
          direction: data.workSort.direction === "desc" ? "desc" : "asc"
        };
      }
      commit();
      alert("불러오기를 완료했습니다.");
    } catch (error) {
      console.error(error);
      alert("JSON 파일을 불러오지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  });

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("모든 계정/작품 데이터를 초기화할까요?")) return;
    state.accounts = [];
    state.works = [];
    state.workSort = { key: "title", direction: "asc" };
    state.workSearch = "";
    resetWorkForm();
    commit();
  });

  els.workForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveWorkForm();
  });

  els.cancelWorkEditBtn.addEventListener("click", resetWorkForm);

  els.sortTitleBtn.addEventListener("click", () => toggleWorkSort("title"));
  els.sortPriceBtn.addEventListener("click", () => toggleWorkSort("price"));

  els.workSearchInput.addEventListener("input", (event) => {
    state.workSearch = event.target.value.trim().toLowerCase();
    renderWorks();
  });
}

function commit() {
  saveState();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderWorkDatalist();
  renderAccounts();
  renderWorks();
}

function renderSummary() {
  const accountCount = state.accounts.length;
  const totalCookies = state.accounts.reduce((sum, account) => sum + account.cookieTotal, 0);
  const totalExpireSoon = state.accounts.reduce((sum, account) => {
    return sum + account.expireToday + account.expireTomorrow + account.expireDayAfterTomorrow;
  }, 0);
  els.summaryAccounts.textContent = String(accountCount);
  els.summaryCookies.textContent = String(totalCookies);
  els.summaryExpireSoon.textContent = String(totalExpireSoon);
  els.summaryWorks.textContent = String(state.works.length);
}

function renderAccounts() {
  els.accountTableBody.innerHTML = "";
  if (state.accounts.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="empty-cell" colspan="11">계정을 추가해서 시작하세요.</td>`;
    els.accountTableBody.appendChild(tr);
    return;
  }

  state.accounts.forEach((account) => {
    const tr = document.createElement("tr");
    const expireSoon = account.expireToday + account.expireTomorrow + account.expireDayAfterTomorrow;
    const planned = account.purchases.reduce((sum, purchase) => sum + purchase.cookieCost, 0);
    const remain = account.cookieTotal - planned;

    tr.innerHTML = `
      <td><input type="text" data-action="update-account" data-id="${account.id}" data-key="name" value="${escapeHtmlAttr(account.name)}" /></td>
      <td><input type="text" data-action="update-account" data-id="${account.id}" data-key="loginId" value="${escapeHtmlAttr(account.loginId)}" /></td>
      <td><input type="number" min="0" step="1" data-action="update-account-number" data-id="${account.id}" data-key="cookieTotal" value="${account.cookieTotal}" /></td>
      <td><input type="number" min="0" step="1" data-action="update-account-number" data-id="${account.id}" data-key="expireToday" value="${account.expireToday}" /></td>
      <td><input type="number" min="0" step="1" data-action="update-account-number" data-id="${account.id}" data-key="expireTomorrow" value="${account.expireTomorrow}" /></td>
      <td><input type="number" min="0" step="1" data-action="update-account-number" data-id="${account.id}" data-key="expireDayAfterTomorrow" value="${account.expireDayAfterTomorrow}" /></td>
      <td class="numeric-cell">${expireSoon}</td>
      <td class="numeric-cell">${planned}</td>
      <td class="numeric-cell ${remain < 0 ? "negative" : ""}">${remain}</td>
      <td><input type="text" data-action="update-account" data-id="${account.id}" data-key="note" value="${escapeHtmlAttr(account.note)}" /></td>
      <td>
        <div class="account-actions">
          <button type="button" class="btn btn-small" data-action="toggle-detail" data-id="${account.id}">${account.expanded ? "접기" : "상세"}</button>
          <button type="button" class="btn btn-small btn-danger" data-action="delete-account" data-id="${account.id}">삭제</button>
        </div>
      </td>
    `;
    els.accountTableBody.appendChild(tr);

    if (account.expanded) {
      const detailTr = document.createElement("tr");
      detailTr.className = "account-detail-row";
      const detailTd = document.createElement("td");
      detailTd.colSpan = 11;
      detailTd.appendChild(buildPurchaseDetail(account, planned));
      detailTr.appendChild(detailTd);
      els.accountTableBody.appendChild(detailTr);
    }
  });

  bindAccountTableEvents();
}

function buildPurchaseDetail(account, planned) {
  const wrap = document.createElement("div");
  wrap.className = "purchase-box";

  const toolbar = document.createElement("div");
  toolbar.className = "purchase-toolbar";
  toolbar.innerHTML = `
    <div class="purchase-summary">오늘 구매 작품 ${account.purchases.length}건 · 합계 ${planned} 쿠키</div>
    <button type="button" class="btn btn-small" data-action="add-purchase" data-id="${account.id}">작품 추가</button>
  `;
  wrap.appendChild(toolbar);

  const table = document.createElement("table");
  table.className = "purchase-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>작품명</th>
        <th style="width: 140px;">쿠키 수량</th>
        <th style="width: 90px;">삭제</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");

  if (account.purchases.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="empty-cell">구매할 작품을 추가하세요.</td>`;
    tbody.appendChild(tr);
  } else {
    account.purchases.forEach((purchase) => {
      const tr = els.purchaseRowTemplate.content.firstElementChild.cloneNode(true);
      const titleInput = tr.querySelector(".purchase-title-input");
      const costInput = tr.querySelector(".purchase-cost-input");
      const deleteButton = tr.querySelector(".btn-delete-purchase");

      titleInput.value = purchase.title;
      titleInput.dataset.action = "purchase-title";
      titleInput.dataset.accountId = account.id;
      titleInput.dataset.purchaseId = purchase.id;

      costInput.value = purchase.cookieCost;
      costInput.dataset.action = "purchase-cost";
      costInput.dataset.accountId = account.id;
      costInput.dataset.purchaseId = purchase.id;

      deleteButton.dataset.action = "delete-purchase";
      deleteButton.dataset.accountId = account.id;
      deleteButton.dataset.purchaseId = purchase.id;

      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function bindAccountTableEvents() {
  els.accountTableBody.querySelectorAll("[data-action='update-account']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const account = findAccount(event.target.dataset.id);
      if (!account) return;
      account[event.target.dataset.key] = event.target.value;
      account.updatedAt = nowIso();
      saveState();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='update-account-number']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const account = findAccount(event.target.dataset.id);
      if (!account) return;
      account[event.target.dataset.key] = toNonNegativeInt(event.target.value);
      account.updatedAt = nowIso();
      renderAccounts();
      renderSummary();
      saveState();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='toggle-detail']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const account = findAccount(event.target.dataset.id);
      if (!account) return;
      account.expanded = !account.expanded;
      renderAccounts();
      saveState();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='delete-account']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const accountId = event.target.dataset.id;
      if (!confirm("이 계정을 삭제할까요?")) return;
      state.accounts = state.accounts.filter((account) => account.id !== accountId);
      commit();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='add-purchase']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const account = findAccount(event.target.dataset.id);
      if (!account) return;
      account.purchases.push(createPurchase());
      account.updatedAt = nowIso();
      commit();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='delete-purchase']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const account = findAccount(event.target.dataset.accountId);
      if (!account) return;
      account.purchases = account.purchases.filter((purchase) => purchase.id !== event.target.dataset.purchaseId);
      account.updatedAt = nowIso();
      commit();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='purchase-title']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const account = findAccount(event.target.dataset.accountId);
      if (!account) return;
      const purchase = account.purchases.find((item) => item.id === event.target.dataset.purchaseId);
      if (!purchase) return;

      const title = event.target.value;
      const matched = state.works.find((work) => work.title === title);
      purchase.title = title;
      purchase.workId = matched ? matched.id : "";
      if (matched) purchase.cookieCost = matched.price;
      account.updatedAt = nowIso();
      renderAccounts();
      renderSummary();
      saveState();
    });
  });

  els.accountTableBody.querySelectorAll("[data-action='purchase-cost']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const account = findAccount(event.target.dataset.accountId);
      if (!account) return;
      const purchase = account.purchases.find((item) => item.id === event.target.dataset.purchaseId);
      if (!purchase) return;
      purchase.cookieCost = toNonNegativeInt(event.target.value);
      account.updatedAt = nowIso();
      renderAccounts();
      renderSummary();
      saveState();
    });
  });
}

function renderWorkDatalist() {
  els.workListData.innerHTML = "";
  const sorted = [...state.works].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  sorted.forEach((work) => {
    const option = document.createElement("option");
    option.value = work.title;
    els.workListData.appendChild(option);
  });
}

function toggleWorkSort(key) {
  if (state.workSort.key === key) {
    state.workSort.direction = state.workSort.direction === "asc" ? "desc" : "asc";
  } else {
    state.workSort.key = key;
    state.workSort.direction = "asc";
  }
  renderWorks();
  saveState();
}

function renderWorks() {
  els.workTableBody.innerHTML = "";
  const works = getFilteredSortedWorks();

  if (works.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="empty-cell" colspan="6">등록된 작품이 없습니다.</td>`;
    els.workTableBody.appendChild(tr);
    return;
  }

  works.forEach((work) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(work.title)}</td>
      <td class="numeric-cell">${work.price}</td>
      <td>${work.isDiscounted ? '<span class="badge badge-discount">할인</span>' : '<span class="badge badge-normal">일반</span>'}</td>
      <td>${work.discountEndDate ? formatDate(work.discountEndDate) : "-"}</td>
      <td>${escapeHtml(work.note || "-")}</td>
      <td>
        <div class="account-actions">
          <button type="button" class="btn btn-small" data-action="edit-work" data-id="${work.id}">수정</button>
          <button type="button" class="btn btn-small btn-danger" data-action="delete-work" data-id="${work.id}">삭제</button>
        </div>
      </td>
    `;
    els.workTableBody.appendChild(tr);
  });

  bindWorkTableEvents();
}

function getFilteredSortedWorks() {
  const filtered = state.works.filter((work) => {
    if (!state.workSearch) return true;
    const value = `${work.title} ${work.note} ${work.price}`.toLowerCase();
    return value.includes(state.workSearch);
  });

  return filtered.sort((a, b) => {
    const direction = state.workSort.direction === "asc" ? 1 : -1;
    if (state.workSort.key === "price") {
      const diff = a.price - b.price;
      if (diff !== 0) return diff * direction;
      return a.title.localeCompare(b.title, "ko") * direction;
    }
    const diff = a.title.localeCompare(b.title, "ko");
    if (diff !== 0) return diff * direction;
    return (a.price - b.price) * direction;
  });
}

function bindWorkTableEvents() {
  els.workTableBody.querySelectorAll("[data-action='edit-work']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const work = state.works.find((item) => item.id === event.target.dataset.id);
      if (!work) return;
      els.workId.value = work.id;
      els.workTitle.value = work.title;
      els.workPrice.value = String(work.price);
      els.workDiscount.checked = work.isDiscounted;
      els.workDiscountEnd.value = work.discountEndDate;
      els.workNote.value = work.note;
      els.workTitle.focus();
    });
  });

  els.workTableBody.querySelectorAll("[data-action='delete-work']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const workId = event.target.dataset.id;
      const isUsed = state.accounts.some((account) => account.purchases.some((purchase) => purchase.workId === workId));
      const message = isUsed ? "이 작품은 구매 목록에 연결되어 있습니다. 그래도 삭제할까요?" : "이 작품을 삭제할까요?";
      if (!confirm(message)) return;

      const target = state.works.find((work) => work.id === workId);
      state.works = state.works.filter((work) => work.id !== workId);

      state.accounts.forEach((account) => {
        account.purchases.forEach((purchase) => {
          if (purchase.workId === workId) {
            purchase.workId = "";
          }
          if (target && purchase.title === target.title && !purchase.workId) {
            purchase.title = purchase.title;
          }
        });
      });

      if (els.workId.value === workId) resetWorkForm();
      commit();
    });
  });
}

function saveWorkForm() {
  const id = els.workId.value.trim();
  const title = els.workTitle.value.trim();
  if (!title) {
    alert("작품명은 필수입니다.");
    return;
  }

  const payload = {
    title,
    price: toNonNegativeInt(els.workPrice.value),
    isDiscounted: els.workDiscount.checked,
    discountEndDate: els.workDiscountEnd.value,
    note: els.workNote.value.trim(),
    updatedAt: nowIso()
  };

  if (id) {
    const work = state.works.find((item) => item.id === id);
    if (!work) return;
    const oldTitle = work.title;
    Object.assign(work, payload);

    state.accounts.forEach((account) => {
      account.purchases.forEach((purchase) => {
        if (purchase.workId === work.id || purchase.title === oldTitle) {
          purchase.workId = work.id;
          purchase.title = work.title;
          purchase.cookieCost = work.price;
        }
      });
    });
  } else {
    state.works.push({
      id: uid(),
      createdAt: nowIso(),
      ...payload
    });
  }

  resetWorkForm();
  commit();
}

function resetWorkForm() {
  els.workId.value = "";
  els.workTitle.value = "";
  els.workPrice.value = "0";
  els.workDiscount.checked = false;
  els.workDiscountEnd.value = "";
  els.workNote.value = "";
}

function backupJson() {
  const blob = new Blob([JSON.stringify({
    accounts: state.accounts,
    works: state.works,
    workSort: state.workSort
  }, null, 2)], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  anchor.href = url;
  anchor.download = `naver-series-manager-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function findAccount(id) {
  return state.accounts.find((account) => account.id === id);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value);
}

document.addEventListener("DOMContentLoaded", () => {
  initElements();
  loadState();
  bindEvents();
  renderAll();
});
