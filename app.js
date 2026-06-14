const STORAGE_KEY = "naver-series-manager-v1";

const state = {
  sort: { key: "title", direction: "asc" },
  searchTerm: "",
  data: loadState(),
};

const elements = {
  accountsContainer: document.getElementById("accountsContainer"),
  worksTableBody: document.getElementById("worksTableBody"),
  addAccountBtn: document.getElementById("addAccountBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  resetBtn: document.getElementById("resetBtn"),
  importFileInput: document.getElementById("importFileInput"),
  summaryAccountCount: document.getElementById("summaryAccountCount"),
  summaryWorkCount: document.getElementById("summaryWorkCount"),
  summaryTotalCookies: document.getElementById("summaryTotalCookies"),
  summaryExpireSoon: document.getElementById("summaryExpireSoon"),
  workForm: document.getElementById("workForm"),
  workId: document.getElementById("workId"),
  workTitle: document.getElementById("workTitle"),
  workPrice: document.getElementById("workPrice"),
  workDiscounted: document.getElementById("workDiscounted"),
  workDiscountEndDate: document.getElementById("workDiscountEndDate"),
  workNote: document.getElementById("workNote"),
  cancelWorkEditBtn: document.getElementById("cancelWorkEditBtn"),
  workSearchInput: document.getElementById("workSearchInput"),
  sortByTitleBtn: document.getElementById("sortByTitleBtn"),
  sortByPriceBtn: document.getElementById("sortByPriceBtn"),
  accountCardTemplate: document.getElementById("accountCardTemplate"),
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function createEmptyWork() {
  return {
    id: createId(),
    title: "",
    price: 0,
    isDiscounted: false,
    discountEndDate: "",
    note: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function createEmptyAccount() {
  return {
    id: createId(),
    name: "",
    email: "",
    note: "",
    cookieTotal: 0,
    expireToday: 0,
    expireTomorrow: 0,
    expireDayAfterTomorrow: 0,
    purchases: [],
    expanded: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function createEmptyPurchase() {
  return {
    id: createId(),
    workId: "",
    titleSnapshot: "",
    cookieCost: 0,
  };
}

function defaultStateData() {
  return {
    accounts: [],
    works: [],
  };
}

function normalizePurchase(raw) {
  return {
    id: typeof raw?.id === "string" ? raw.id : createId(),
    workId: typeof raw?.workId === "string" ? raw.workId : "",
    titleSnapshot: typeof raw?.titleSnapshot === "string" ? raw.titleSnapshot : "",
    cookieCost: toSafeNumber(raw?.cookieCost ?? 0),
  };
}

function normalizeAccount(raw) {
  return {
    id: typeof raw?.id === "string" ? raw.id : createId(),
    name: typeof raw?.name === "string" ? raw.name : "",
    email: typeof raw?.email === "string" ? raw.email : "",
    note: typeof raw?.note === "string" ? raw.note : "",
    cookieTotal: toSafeNumber(raw?.cookieTotal ?? 0),
    expireToday: toSafeNumber(raw?.expireToday ?? 0),
    expireTomorrow: toSafeNumber(raw?.expireTomorrow ?? 0),
    expireDayAfterTomorrow: toSafeNumber(raw?.expireDayAfterTomorrow ?? 0),
    purchases: Array.isArray(raw?.purchases) ? raw.purchases.map(normalizePurchase) : [],
    expanded: Boolean(raw?.expanded),
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : nowIso(),
  };
}

function normalizeWork(raw) {
  return {
    id: typeof raw?.id === "string" ? raw.id : createId(),
    title: typeof raw?.title === "string" ? raw.title : "",
    price: toSafeNumber(raw?.price ?? 0),
    isDiscounted: Boolean(raw?.isDiscounted),
    discountEndDate: typeof raw?.discountEndDate === "string" ? raw.discountEndDate : "",
    note: typeof raw?.note === "string" ? raw.note : "",
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : nowIso(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStateData();
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed?.accounts) ? parsed.accounts.map(normalizeAccount) : [],
      works: Array.isArray(parsed?.works) ? parsed.works.map(normalizeWork) : [],
    };
  } catch {
    return defaultStateData();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function updateAndRender() {
  persist();
  render();
}

function findWorkById(workId) {
  return state.data.works.find((work) => work.id === workId) || null;
}

function getSortedWorks() {
  const works = [...state.data.works];
  works.sort((a, b) => {
    const factor = state.sort.direction === "asc" ? 1 : -1;
    if (state.sort.key === "price") {
      if (a.price !== b.price) return (a.price - b.price) * factor;
      return a.title.localeCompare(b.title, "ko") * factor;
    }
    const titleDiff = a.title.localeCompare(b.title, "ko");
    if (titleDiff !== 0) return titleDiff * factor;
    return (a.price - b.price) * factor;
  });
  return works;
}

function getFilteredWorks() {
  const keyword = state.searchTerm.trim().toLowerCase();
  const works = getSortedWorks();
  if (!keyword) return works;
  return works.filter((work) => {
    return [work.title, work.note, String(work.price)].some((field) =>
      field.toLowerCase().includes(keyword)
    );
  });
}

function getAccountStats(account) {
  const expireSoon =
    account.expireToday + account.expireTomorrow + account.expireDayAfterTomorrow;
  const plannedCookies = account.purchases.reduce((sum, item) => sum + item.cookieCost, 0);
  return {
    expireSoon,
    plannedCookies,
    remainingAfterPurchase: account.cookieTotal - plannedCookies,
  };
}

function setWorkForm(work) {
  elements.workId.value = work?.id || "";
  elements.workTitle.value = work?.title || "";
  elements.workPrice.value = String(work?.price ?? 0);
  elements.workDiscounted.checked = Boolean(work?.isDiscounted);
  elements.workDiscountEndDate.value = work?.discountEndDate || "";
  elements.workNote.value = work?.note || "";
}

function resetWorkForm() {
  setWorkForm(createEmptyWork());
  elements.workId.value = "";
}

function renderSummary() {
  const accounts = state.data.accounts;
  const works = state.data.works;
  const totalCookies = accounts.reduce((sum, account) => sum + account.cookieTotal, 0);
  const expireSoon = accounts.reduce((sum, account) => {
    return sum + account.expireToday + account.expireTomorrow + account.expireDayAfterTomorrow;
  }, 0);

  elements.summaryAccountCount.textContent = String(accounts.length);
  elements.summaryWorkCount.textContent = String(works.length);
  elements.summaryTotalCookies.textContent = String(totalCookies);
  elements.summaryExpireSoon.textContent = String(expireSoon);
}

function renderAccounts() {
  const container = elements.accountsContainer;
  container.innerHTML = "";

  if (state.data.accounts.length === 0) {
    container.innerHTML = '<div class="empty-state">등록된 계정이 없습니다. 상단의 "계정 추가" 버튼으로 시작하세요.</div>';
    return;
  }

  state.data.accounts.forEach((account) => {
    const fragment = elements.accountCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".account-card");
    const detail = fragment.querySelector(".account-detail");
    const toggleButton = fragment.querySelector(".toggle-detail-btn");
    const stats = getAccountStats(account);

    fragment.querySelector(".account-name").textContent = account.name || "이름 없는 계정";
    fragment.querySelector(".account-email").textContent = account.email || "식별자 미입력";
    fragment.querySelector(".cookie-total").textContent = String(account.cookieTotal);
    fragment.querySelector(".expire-total").textContent = String(stats.expireSoon);
    fragment.querySelector(".planned-total").textContent = String(stats.plannedCookies);

    const remainingEl = fragment.querySelector(".remaining-total");
    remainingEl.textContent = String(stats.remainingAfterPurchase);
    remainingEl.classList.toggle("status-negative", stats.remainingAfterPurchase < 0);
    remainingEl.classList.toggle("status-positive", stats.remainingAfterPurchase >= 0);

    fragment.querySelector(".created-at").textContent = formatDateTime(account.createdAt);
    fragment.querySelector(".updated-at").textContent = formatDateTime(account.updatedAt);

    if (account.expanded) {
      detail.classList.remove("hidden");
      toggleButton.textContent = "요약보기";
    } else {
      detail.classList.add("hidden");
      toggleButton.textContent = "상세보기";
    }

    const nameInput = fragment.querySelector(".account-name-input");
    const emailInput = fragment.querySelector(".account-email-input");
    const cookieTotalInput = fragment.querySelector(".account-cookie-total-input");
    const expireTodayInput = fragment.querySelector(".account-expire-today-input");
    const expireTomorrowInput = fragment.querySelector(".account-expire-tomorrow-input");
    const expireDayAfterInput = fragment.querySelector(".account-expire-day-after-input");
    const noteInput = fragment.querySelector(".account-note-input");

    nameInput.value = account.name;
    emailInput.value = account.email;
    cookieTotalInput.value = String(account.cookieTotal);
    expireTodayInput.value = String(account.expireToday);
    expireTomorrowInput.value = String(account.expireTomorrow);
    expireDayAfterInput.value = String(account.expireDayAfterTomorrow);
    noteInput.value = account.note;

    nameInput.addEventListener("input", (event) => updateAccount(account.id, "name", event.target.value));
    emailInput.addEventListener("input", (event) => updateAccount(account.id, "email", event.target.value));
    cookieTotalInput.addEventListener("input", (event) => updateAccount(account.id, "cookieTotal", toSafeNumber(event.target.value)));
    expireTodayInput.addEventListener("input", (event) => updateAccount(account.id, "expireToday", toSafeNumber(event.target.value)));
    expireTomorrowInput.addEventListener("input", (event) => updateAccount(account.id, "expireTomorrow", toSafeNumber(event.target.value)));
    expireDayAfterInput.addEventListener("input", (event) => updateAccount(account.id, "expireDayAfterTomorrow", toSafeNumber(event.target.value)));
    noteInput.addEventListener("input", (event) => updateAccount(account.id, "note", event.target.value));

    toggleButton.addEventListener("click", () => {
      account.expanded = !account.expanded;
      account.updatedAt = nowIso();
      updateAndRender();
    });

    fragment.querySelector(".delete-account-btn").addEventListener("click", () => {
      if (!window.confirm("이 계정을 삭제할까요?")) return;
      state.data.accounts = state.data.accounts.filter((item) => item.id !== account.id);
      updateAndRender();
    });

    fragment.querySelector(".add-purchase-btn").addEventListener("click", () => {
      account.purchases.push(createEmptyPurchase());
      account.updatedAt = nowIso();
      updateAndRender();
    });

    renderPurchases(fragment.querySelector(".purchase-table-body"), account);

    container.appendChild(fragment);
  });
}

function renderPurchases(tbody, account) {
  tbody.innerHTML = "";

  if (account.purchases.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4" class="muted">등록된 구매 항목이 없습니다.</td>';
    tbody.appendChild(row);
    return;
  }

  const worksForSelect = [...state.data.works].sort((a, b) => a.title.localeCompare(b.title, "ko"));

  account.purchases.forEach((purchase) => {
    const row = document.createElement("tr");

    const workSelectCell = document.createElement("td");
    const workSelect = document.createElement("select");
    workSelect.className = "purchase-select";
    workSelect.innerHTML = '<option value="">작품 선택</option>';
    worksForSelect.forEach((work) => {
      const option = document.createElement("option");
      option.value = work.id;
      option.textContent = `${work.title} (${work.price})`;
      if (purchase.workId === work.id) option.selected = true;
      workSelect.appendChild(option);
    });
    workSelect.addEventListener("change", (event) => {
      const selectedWorkId = event.target.value;
      const selectedWork = findWorkById(selectedWorkId);
      purchase.workId = selectedWorkId;
      purchase.titleSnapshot = selectedWork ? selectedWork.title : "";
      purchase.cookieCost = selectedWork ? selectedWork.price : purchase.cookieCost;
      account.updatedAt = nowIso();
      updateAndRender();
    });
    workSelectCell.appendChild(workSelect);

    const titleCell = document.createElement("td");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "inline-input";
    titleInput.value = purchase.titleSnapshot;
    titleInput.placeholder = "작품명 보정";
    titleInput.addEventListener("input", (event) => {
      purchase.titleSnapshot = event.target.value;
      account.updatedAt = nowIso();
      persist();
      renderSummary();
      renderAccounts();
    });
    titleCell.appendChild(titleInput);

    const cookieCell = document.createElement("td");
    const cookieInput = document.createElement("input");
    cookieInput.type = "number";
    cookieInput.min = "0";
    cookieInput.step = "1";
    cookieInput.className = "inline-input small";
    cookieInput.value = String(purchase.cookieCost);
    cookieInput.addEventListener("input", (event) => {
      purchase.cookieCost = toSafeNumber(event.target.value);
      account.updatedAt = nowIso();
      persist();
      renderSummary();
      renderAccounts();
    });
    cookieCell.appendChild(cookieInput);

    const actionCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-small btn-danger";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", () => {
      account.purchases = account.purchases.filter((item) => item.id !== purchase.id);
      account.updatedAt = nowIso();
      updateAndRender();
    });
    actionCell.appendChild(deleteBtn);

    row.appendChild(workSelectCell);
    row.appendChild(titleCell);
    row.appendChild(cookieCell);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });
}

function renderWorks() {
  const tbody = elements.worksTableBody;
  tbody.innerHTML = "";

  const works = getFilteredWorks();
  if (works.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6" class="muted">등록된 작품이 없습니다.</td>';
    tbody.appendChild(row);
    return;
  }

  works.forEach((work) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(work.title)}</td>
      <td>${work.price}</td>
      <td>${work.isDiscounted ? '<span class="badge">할인</span>' : "-"}</td>
      <td>${work.isDiscounted ? escapeHtml(formatDateOnly(work.discountEndDate)) : "-"}</td>
      <td class="note-cell">${escapeHtml(work.note || "-")}</td>
      <td></td>
    `;

    const actionCell = row.lastElementChild;
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-small";
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => {
      setWorkForm(work);
      elements.workId.value = work.id;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-small btn-danger";
    deleteBtn.textContent = "삭제";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.addEventListener("click", () => {
      const linked = state.data.accounts.some((account) =>
        account.purchases.some((purchase) => purchase.workId === work.id)
      );
      const message = linked
        ? "이 작품은 일부 구매 계획과 연결되어 있습니다. 그래도 삭제할까요?"
        : "이 작품을 삭제할까요?";
      if (!window.confirm(message)) return;

      state.data.works = state.data.works.filter((item) => item.id !== work.id);
      state.data.accounts.forEach((account) => {
        account.purchases.forEach((purchase) => {
          if (purchase.workId === work.id) {
            purchase.workId = "";
          }
        });
        account.updatedAt = nowIso();
      });
      if (elements.workId.value === work.id) resetWorkForm();
      updateAndRender();
    });

    actionCell.appendChild(editBtn);
    actionCell.appendChild(deleteBtn);
    tbody.appendChild(row);
  });
}

function render() {
  renderSummary();
  renderAccounts();
  renderWorks();
}

function updateAccount(accountId, key, value) {
  const account = state.data.accounts.find((item) => item.id === accountId);
  if (!account) return;
  account[key] = value;
  account.updatedAt = nowIso();
  updateAndRender();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  anchor.href = url;
  anchor.download = `naver-series-manager-backup-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.data = {
      accounts: Array.isArray(parsed?.accounts) ? parsed.accounts.map(normalizeAccount) : [],
      works: Array.isArray(parsed?.works) ? parsed.works.map(normalizeWork) : [],
    };
    updateAndRender();
    window.alert("불러오기를 완료했습니다.");
  } catch {
    window.alert("JSON 파일을 불러오지 못했습니다.");
  }
}

function bindEvents() {
  elements.addAccountBtn.addEventListener("click", () => {
    state.data.accounts.push(createEmptyAccount());
    updateAndRender();
  });

  elements.exportBtn.addEventListener("click", exportData);

  elements.importBtn.addEventListener("click", () => {
    elements.importFileInput.click();
  });

  elements.importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importData(file);
    event.target.value = "";
  });

  elements.resetBtn.addEventListener("click", () => {
    if (!window.confirm("모든 계정과 작품 데이터를 삭제할까요?")) return;
    state.data = defaultStateData();
    resetWorkForm();
    updateAndRender();
  });

  elements.workForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = elements.workId.value.trim();
    const title = elements.workTitle.value.trim();
    const price = toSafeNumber(elements.workPrice.value);
    const isDiscounted = elements.workDiscounted.checked;
    const discountEndDate = elements.workDiscountEndDate.value;
    const note = elements.workNote.value.trim();

    if (!title) {
      window.alert("작품명은 필수입니다.");
      return;
    }

    if (id) {
      const target = state.data.works.find((work) => work.id === id);
      if (!target) return;

      target.title = title;
      target.price = price;
      target.isDiscounted = isDiscounted;
      target.discountEndDate = discountEndDate;
      target.note = note;
      target.updatedAt = nowIso();

      state.data.accounts.forEach((account) => {
        account.purchases.forEach((purchase) => {
          if (purchase.workId === target.id) {
            purchase.titleSnapshot = target.title;
          }
        });
        account.updatedAt = nowIso();
      });
    } else {
      state.data.works.push({
        id: createId(),
        title,
        price,
        isDiscounted,
        discountEndDate,
        note,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    resetWorkForm();
    updateAndRender();
  });

  elements.cancelWorkEditBtn.addEventListener("click", resetWorkForm);

  elements.workSearchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderWorks();
  });

  elements.sortByTitleBtn.addEventListener("click", () => {
    if (state.sort.key === "title") {
      state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
    } else {
      state.sort.key = "title";
      state.sort.direction = "asc";
    }
    renderWorks();
  });

  elements.sortByPriceBtn.addEventListener("click", () => {
    if (state.sort.key === "price") {
      state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
    } else {
      state.sort.key = "price";
      state.sort.direction = "asc";
    }
    renderWorks();
  });
}

function init() {
  bindEvents();
  resetWorkForm();
  render();
}

init();
