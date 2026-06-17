import { api } from './api.js';
import {
  ANGLES,
  CATEGORIES,
  CLIENTS_DB,
  EXISTING_RECORDS,
  MOCK_SUBMISSIONS,
  SECTOR_COPY,
  SECTORS,
} from './utils/constants.js';

const state = {
  step: 0,
  sector: null,
  client: null,
  category: null,
  mode: 'manual',
  fields: {},
  capturedAngles: [],
  approvedImages: [],
  pendingCategory: null,
  submissionId: null,
  backendClients: [],
  backendSubmissions: [],
  adminStats: { total: 0, pending: 0, approved: 0, rejected: 0, duplicates: 0 },
  isSubmitting: false,
  isLoggingIn: false,
  isAdminView: false,
  adminUser: api.token ? { role: 'admin' } : null,
  activeAdminFilters: { sector: '', clientId: '', category: '', status: '' },
};

let activeVideoStream = null;
let activeAngleIdx = -1;
let activeCameraFacingMode = 'user';

const el = (id) => document.getElementById(id);
const render = (html) => {
  const root = el('mainContent');
  if (root) root.innerHTML = html;
};

function getSectorMeta(sectorId = state.sector) {
  return SECTOR_COPY[sectorId] || SECTOR_COPY.school;
}

function getSectorName(sectorId = state.sector) {
  return SECTORS.find((item) => item.id === sectorId)?.name || 'Sector';
}

function getClientVisual(client) {
  return client?.logoUrl
    ? `<img src="${client.logoUrl}" alt="${client.name}" />`
    : `<span>${client?.logo || 'GX'}</span>`;
}

function getClientLabel(client) {
  return client?.shortLabel || `${getSectorMeta(client?.sector).entityLabel} ID`;
}

function setBusy(buttonId, busy, label) {
  const button = el(buttonId);
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

function showToast(message, type = 'info') {
  const container = el('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${type.toUpperCase()}</strong><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function resetFlowState() {
  state.step = 1;
  state.sector = null;
  state.client = null;
  state.category = null;
  state.mode = 'manual';
  state.fields = {};
  state.capturedAngles = [];
  state.approvedImages = [];
  state.pendingCategory = null;
  state.submissionId = null;
  activeAngleIdx = -1;
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-counter-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      const target = Number(node.dataset.counterTarget);
      const suffix = node.dataset.counterSuffix || '';
      const duration = 1200;
      const start = performance.now();

      const tick = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
        node.textContent = `${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      observer.unobserve(node);
    });
  }, { threshold: 0.35 });

  counters.forEach((node) => observer.observe(node));
}

function getProgressHTML(currentStep) {
  const entityLabel = state.sector ? getSectorMeta().entityLabel : 'Institution';
  const steps = ['Sector', entityLabel, 'Category', 'Details', 'Image Capture', 'Review'];
  return `
    <div class="progress-wrap">
      <div class="progress-steps">
        ${steps.map((name, index) => {
          const stepNumber = index + 1;
          const className = stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'active' : '';
          return `
            <div class="progress-step ${className}">
              <div class="step-dot">${stepNumber < currentStep ? 'OK' : stepNumber}</div>
              <div class="step-label">${name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderHome() {
  state.isAdminView = false;
  render(`
    <section class="home-hero">
      <div class="brand-badge-wrapper">
        <img src="assets/gatex-logo.png" alt="GateX logo" class="hero-brand-logo" />
        <span class="hero-brand-name">GateX Portal</span>
      </div>
      <h1 class="hero-title">Institutional trust, verified at the gate.</h1>
      <p class="hero-subtitle">Unified registration, secure identity capture, and operational evidence management across your entire organization.</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-large btn-glow" onclick="startFlow()">Start Registration</button>
        <button class="btn btn-secondary btn-large" onclick="showAdminDashboard()">Admin Console</button>
      </div>
    </section>

    <section class="home-stats-strip">
      <div class="stat-item">
        <span class="stat-num" data-counter-target="6">0</span>
        <span class="stat-label">Sectors Managed</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num" data-counter-target="5">0</span>
        <span class="stat-label">Capture Angles</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num" data-counter-target="100" data-counter-suffix="%">0%</span>
        <span class="stat-label">Data Protected</span>
      </div>
    </section>
  `);
  animateCounters();
}

function renderStep() {
  switch (state.step) {
    case 0:
      renderHome();
      break;
    case 1:
      renderSectorStep();
      break;
    case 2:
      renderClientStep();
      break;
    case 3:
      renderCategoryStep();
      break;
    case 4:
      renderDetailsStep();
      break;
    case 5:
      renderSamplesStep();
      break;
    case 6:
      renderReviewStep();
      break;
    default:
      renderHome();
  }
}

window.showHome = () => {
  stopCamera();
  state.step = 0;
  renderHome();
};

window.startFlow = () => {
  stopCamera();
  resetFlowState();
  renderSectorStep();
};

window.goBack = () => {
  stopCamera();
  if (state.step > 1) {
    state.step -= 1;
    renderStep();
  } else {
    window.showHome();
  }
};

window.goNext = () => {
  if (state.step === 1 && !state.sector) return;
  if (state.step === 2 && !state.client) return;
  if (state.step === 3 && !state.category) return;
  if (state.step === 5 && state.category !== 'Object' && state.capturedAngles.length < ANGLES.length) {
    showToast('Capture all required face angles before continuing.', 'error');
    return;
  }
  if (state.step === 5 && state.category === 'Object' && !state.approvedImages.length) {
    showToast('Upload at least one object sample before continuing.', 'error');
    return;
  }

  stopCamera();
  state.step += 1;
  renderStep();
};

function renderSectorStep() {
  render(`
    ${getProgressHTML(1)}
    <section class="card">
      <h2 class="card-title">Choose Operating Sector</h2>
      <p class="card-sub">Start by choosing which of the six GateX deployment environments this record belongs to.</p>
      <div class="sector-grid">
        ${SECTORS.map((sector) => `
          <button class="sector-card ${state.sector === sector.id ? 'selected' : ''}" onclick="selectSector('${sector.id}')" ondblclick="selectSectorAndContinue('${sector.id}')">
            <span class="icon">${sector.icon}</span>
            <span class="name">${sector.name}</span>
            <span class="desc">${sector.desc}</span>
            <span class="card-hint">${state.sector === sector.id ? 'Selected' : 'Double-click to continue'}</span>
          </button>
        `).join('')}
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="showHome()">Back</button>
        <button class="btn btn-primary" onclick="goNext()" ${!state.sector ? 'disabled' : ''}>Continue</button>
      </div>
    </section>
  `);
}

window.selectSector = (sectorId) => {
  if (state.sector === sectorId) return;
  state.sector = sectorId;
  state.client = null;
  state.category = null;
  state.mode = 'manual';
  state.fields = {};
  state.capturedAngles = [];
  state.approvedImages = [];
  renderSectorStep();
};

window.selectSectorAndContinue = (sectorId) => {
  window.selectSector(sectorId);
  if (state.sector) {
    state.step = 2;
    renderClientStep();
  }
};

async function renderClientStep() {
  const meta = getSectorMeta();
  render(`
    ${getProgressHTML(2)}
    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">${meta.selectHeading}</h2>
          <p class="card-sub">${meta.selectSubheading}</p>
        </div>
        <span class="context-chip">${getSectorName()}</span>
      </div>

      <div class="search-box">
        <span class="search-icon">Search</span>
        <input id="clientSearchInput" type="text" placeholder="${meta.searchPlaceholder}" />
      </div>

      <div id="selectedClientBranding"></div>
      <div class="client-list school-friendly" id="clientListContainer">
        <div class="empty-state">Loading ${meta.entityPlural}...</div>
      </div>

      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="goBack()">Back</button>
        <button class="btn btn-primary" id="clientStepNextBtn" onclick="goNext()" ${!state.client ? 'disabled' : ''}>Continue</button>
      </div>
    </section>
  `);

  el('clientSearchInput').addEventListener('input', (event) => filterClients(event.target.value));

  try {
    const clients = await api.getClients(state.sector);
    state.backendClients = clients.length ? clients : CLIENTS_DB.filter((item) => item.sector === state.sector);
  } catch (error) {
    state.backendClients = CLIENTS_DB.filter((item) => item.sector === state.sector);
  }

  renderSelectedClientBanner();
  renderClientsList(state.backendClients);
}

function renderSelectedClientBanner() {
  const container = el('selectedClientBranding');
  if (!container) return;

  if (!state.client) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="client-brand-banner">
      <div class="logo-circle ${state.client.color || ''}">${getClientVisual(state.client)}</div>
      <div class="meta-info">
        <h3>${state.client.name}</h3>
        <p>${getClientLabel(state.client)}: ${state.client.gateId} · ${getSectorName(state.client.sector)}</p>
      </div>
      <button class="icon-link" onclick="clearSelectedClient()">Change</button>
    </div>
  `;
}

window.clearSelectedClient = () => {
  state.client = null;
  renderSelectedClientBanner();
  renderClientsList(state.backendClients);
};

function renderClientsList(list) {
  const container = el('clientListContainer');
  if (!container) return;

  container.innerHTML = list.length ? list.map((client) => `
    <button class="client-card ${state.client?.id === client.id ? 'selected' : ''}"
      ondblclick="selectClientAndContinue('${client.id}')"
      onclick="selectClient('${client.id}')">
      <div class="client-badge-logo ${client.color || ''}" style="${client.logoColor ? `background:${client.logoColor};` : ''}">
        ${getClientVisual(client)}
      </div>
      <div class="client-details">
        <div class="name">${client.name}</div>
        <div class="gate-id">${getClientLabel(client)}: ${client.gateId}</div>
      </div>
      <span class="inline-hint">${state.client?.id === client.id ? 'Selected' : 'Double-click to continue'}</span>
    </button>
  `).join('') : `<div class="empty-state">No ${getSectorMeta().entityPlural} match this search.</div>`;
}

window.selectClient = (clientId) => {
  state.client = state.backendClients.find((item) => item.id === clientId) || null;
  renderSelectedClientBanner();
  renderClientsList(state.backendClients);
  const nextButton = el('clientStepNextBtn');
  if (nextButton) nextButton.disabled = !state.client;
};

window.selectClientAndContinue = (clientId) => {
  window.selectClient(clientId);
  if (state.client) {
    state.step = 3;
    renderCategoryStep();
  }
};

function filterClients(query) {
  const q = query.trim().toLowerCase();
  const filtered = state.backendClients.filter((client) =>
    client.name.toLowerCase().includes(q) || client.gateId.toLowerCase().includes(q)
  );
  renderClientsList(filtered);
}

function renderCategoryStep() {
  const categories = CATEGORIES[state.sector] || [];
  const meta = getSectorMeta();
  render(`
    ${getProgressHTML(3)}
    <div class="client-brand-banner compact">
      <div class="logo-circle ${state.client.color || ''}">${getClientVisual(state.client)}</div>
      <div class="meta-info">
        <h3>${state.client.name}</h3>
        <p>${getClientLabel(state.client)}: ${state.client.gateId}</p>
      </div>
    </div>
    <section class="card">
      <h2 class="card-title">Select Category</h2>
      <p class="card-sub">Choose the ${meta.entityLabel.toLowerCase()}-specific category for this registration.</p>
      <div class="category-list">
        ${categories.map((category) => `
          <button class="category-item ${state.category === category ? 'selected' : ''}" onclick="selectCategory('${category}')" ondblclick="selectCategoryAndContinue('${category}')">
            <span class="category-main"><span class="category-icon">${getCategoryIcon(category)}</span><span>${category}</span></span>
            ${category === 'Others' ? '<span class="badge badge-lock">Protected</span>' : ''}
            ${category === 'Object' ? '<span class="badge badge-global">Asset samples</span>' : ''}
          </button>
        `).join('')}
      </div>
      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="goBack()">Back</button>
        <button class="btn btn-primary" onclick="goNext()" ${!state.category ? 'disabled' : ''}>Continue</button>
      </div>
    </section>
  `);
}

function getCategoryIcon(category) {
  const icons = {
    Student: '🎓',
    Teacher: '🧑‍🏫',
    Management: '🧭',
    'Non-teaching': '🧰',
    Parent: '👪',
    'Parent / Guardian': '👪',
    Professor: '🎓',
    Employee: '💼',
    Visitor: '🪪',
    HR: '📋',
    'IT Support': '🖥️',
    Reception: '🛎️',
    Security: '🛡️',
    'Sales Associate': '🏷️',
    Cashier: '💳',
    'Floor Manager': '📍',
    'Service Advisor': '🛠️',
    Patient: '🩺',
    Doctor: '⚕️',
    'Patient Guardian': '👨‍👩‍👧',
    Worker: '🏭',
    Object: '📦',
    Others: '🔐',
  };
  return icons[category] || '👤';
}

window.selectCategory = (categoryName) => {
  if (categoryName === 'Others') {
    state.pendingCategory = categoryName;
    openPasswordModal();
    return;
  }
  state.category = categoryName;
  renderCategoryStep();
};

window.selectCategoryAndContinue = (categoryName) => {
  if (categoryName === 'Others') {
    window.selectCategory(categoryName);
    return;
  }
  state.category = categoryName;
  state.step = 4;
  renderDetailsStep();
};

function openPasswordModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'passwordModalOverlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>Protected Category</h3>
      <p>This category requires an admin PIN before it can be used.</p>
      <div class="form-group">
        <label>Admin PIN</label>
        <input type="password" id="adminPinInput" placeholder="Enter protected access PIN" />
        <small id="pinErrorMessage" class="field-error hidden">Incorrect PIN.</small>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closePasswordModal()">Cancel</button>
        <button class="btn btn-primary" onclick="verifyPin()">Unlock</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  el('adminPinInput').focus();
}

window.closePasswordModal = () => {
  const overlay = el('passwordModalOverlay');
  if (overlay) overlay.remove();
  state.pendingCategory = null;
};

window.verifyPin = async () => {
  const pin = el('adminPinInput').value;
  const errorMessage = el('pinErrorMessage');

  try {
    await api.verifyOthersPin(pin);
    state.category = state.pendingCategory;
    closePasswordModal();
    renderCategoryStep();
    showToast('Protected category unlocked.', 'success');
  } catch (error) {
    if (errorMessage) errorMessage.classList.remove('hidden');
  }
};

function renderDetailsStep() {
  const meta = getSectorMeta();
  render(`
    ${getProgressHTML(4)}
    <div class="client-brand-banner compact">
      <div class="logo-circle ${state.client.color || ''}">${getClientVisual(state.client)}</div>
      <div class="meta-info">
        <h3>${state.client.name}</h3>
        <p>${state.category}</p>
      </div>
    </div>
    <section class="card">
      <h2 class="card-title">${meta.detailsHeading}</h2>
      <p class="card-sub">${state.category === 'Object' ? 'Capture structured asset metadata before uploading object evidence samples.' : meta.detailsSubheading}</p>

      ${state.category !== 'Object' ? `
        <div class="tab-header">
          <button class="tab-btn ${state.mode === 'manual' ? 'active' : ''}" onclick="toggleMode('manual')">Manual Entry</button>
          <button class="tab-btn ${state.mode === 'existing' ? 'active' : ''}" onclick="toggleMode('existing')">Search Existing</button>
        </div>
      ` : ''}

      <div id="duplicateCheckWarningContainer"></div>
      <div id="formFieldsContainer"></div>

      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="goBack()">Back</button>
        <button class="btn btn-primary" onclick="validateAndGoStep5()">Continue</button>
      </div>
    </section>
  `);

  renderFormBody();
}

window.toggleMode = (newMode) => {
  state.mode = newMode;
  renderDetailsStep();
};

function getFilteredExistingRecords(query = '') {
  const q = query.trim().toLowerCase();
  return EXISTING_RECORDS.filter((record) => {
    // 1. Sector check
    if (record.sector && record.sector !== state.sector) return false;
    // 2. Category check
    if (record.category && record.category !== state.category) return false;
    // 3. Search query check
    if (q) {
      const name = String(record.name || '').toLowerCase();
      const roll = String(record.roll || '').toLowerCase();
      const mobile = String(record.mobile || '').toLowerCase();
      const classVal = String(record.class || '').toLowerCase();
      const role = String(record.role || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || mobile.includes(q) || classVal.includes(q) || role.includes(q);
    }
    return true;
  });
}

function renderFormBody() {
  const container = el('formFieldsContainer');
  if (!container) return;

  if (state.mode === 'existing' && state.category !== 'Object') {
    container.innerHTML = `
      <div class="search-box">
        <span class="search-icon">Search</span>
        <input type="text" id="existingSearchInput" placeholder="Search by name, roll number, mobile, or class" />
      </div>
      <div class="client-list" id="existingRecordsList"></div>
    `;

    el('existingSearchInput').addEventListener('input', (event) => filterExistingRecords(event.target.value));
    renderExistingRecordsList(getFilteredExistingRecords());
    return;
  }

  container.innerHTML = getFormFieldsTemplate();

  // Programmatically bind all inputs/selects to avoid global scope ReferenceErrors
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach((input) => {
    if (!input.id || !input.id.startsWith('field_')) return;
    const key = input.id.replace('field_', '');

    const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventType, (event) => {
      state.fields[key] = event.target.value;
      if (key === 'name') {
        checkDuplicateRealtime();
      }
    });
  });
}

function getFormFieldsTemplate() {
  const f = state.fields;

  if (state.category === 'Object') {
    return `
      <div class="form-grid single">
        <div class="form-group">
          <label>Object Type *</label>
          <select id="field_objectType">
            <option value="">Select object type</option>
            <option ${f.objectType === 'Uniform' ? 'selected' : ''}>Uniform</option>
            <option ${f.objectType === 'Accessories' ? 'selected' : ''}>Accessories</option>
            <option ${f.objectType === 'Asset Condition' ? 'selected' : ''}>Asset Condition</option>
            <option ${f.objectType === 'Other Object' ? 'selected' : ''}>Other Object</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subcategory *</label>
          <input type="text" id="field_subcat" placeholder="Example: ID Card, Tie, Belt, Device Tag" value="${f.subcat || ''}" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input type="text" id="field_notes" placeholder="Optional operational notes" value="${f.notes || ''}" />
        </div>
      </div>
    `;
  }

  if (state.category === 'Student') {
    return `
      <div class="form-grid">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="field_name" placeholder="Student full name" value="${f.name || ''}" />
        </div>
        <div class="form-group">
          <label>Class *</label>
          <input type="text" id="field_class" placeholder="Example: 8" value="${f.class || ''}" />
        </div>
        <div class="form-group">
          <label>Section *</label>
          <input type="text" id="field_section" placeholder="Example: B" value="${f.section || ''}" />
        </div>
        <div class="form-group">
          <label>Roll Number *</label>
          <input type="text" id="field_roll" placeholder="Student roll number" value="${f.roll || ''}" />
        </div>
        <div class="form-group">
          <label>Father or Guardian Name *</label>
          <input type="text" id="field_father" placeholder="Guardian full name" value="${f.father || ''}" />
        </div>
        <div class="form-group">
          <label>Mobile Number *</label>
          <input type="tel" id="field_mobile" placeholder="10 digit mobile number" value="${f.mobile || ''}" />
        </div>
      </div>
    `;
  }

  if (['Parent', 'Parent / Guardian', 'Patient Guardian'].includes(state.category)) {
    return `
      <div class="form-grid">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="field_name" placeholder="Parent or guardian name" value="${f.name || ''}" />
        </div>
        <div class="form-group">
          <label>Relation *</label>
          <input type="text" id="field_relation" placeholder="Father, Mother, Brother, Guardian" value="${f.relation || ''}" />
        </div>
        <div class="form-group">
          <label>Linked Student / Patient Name</label>
          <input type="text" id="field_linkedStudent" placeholder="Linked person name" value="${f.linkedStudent || ''}" />
        </div>
        <div class="form-group">
          <label>Mobile Number *</label>
          <input type="tel" id="field_mobile" placeholder="10 digit mobile number" value="${f.mobile || ''}" />
        </div>
      </div>
    `;
  }

  if (state.category === 'Patient') {
    return `
      <div class="form-grid">
        <div class="form-group">
          <label>Patient Name *</label>
          <input type="text" id="field_name" placeholder="Patient full name" value="${f.name || ''}" />
        </div>
        <div class="form-group">
          <label>Mobile Number *</label>
          <input type="tel" id="field_mobile" placeholder="Patient mobile number" value="${f.mobile || ''}" />
        </div>
        <div class="form-group">
          <label>Guardian Name</label>
          <input type="text" id="field_guardian" placeholder="Guardian if applicable" value="${f.guardian || ''}" />
        </div>
      </div>
    `;
  }

  return `
    <div class="form-grid">
      <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="field_name" placeholder="Enter full name" value="${f.name || ''}" />
      </div>
      <div class="form-group">
        <label>Mobile Number *</label>
        <input type="tel" id="field_mobile" placeholder="10 digit mobile number" value="${f.mobile || ''}" />
      </div>
      <div class="form-group">
        <label>Role / Designation</label>
        <input type="text" id="field_role" placeholder="Example: Manager, Employee, Visitor" value="${f.role || ''}" />
      </div>
      <div class="form-group">
        <label>ID / Reference</label>
        <input type="text" id="field_referenceId" placeholder="Internal ID or reference number" value="${f.referenceId || ''}" />
      </div>
    </div>
  `;
}

function checkDuplicateRealtime() {
  const container = el('duplicateCheckWarningContainer');
  if (!container || !state.fields.name) {
    if (container) container.innerHTML = '';
    return;
  }

  const filtered = getFilteredExistingRecords();
  const found = filtered.find((item) => item.name.toLowerCase() === state.fields.name.toLowerCase().trim());
  if (!found) {
    container.innerHTML = '';
    return;
  }

  const matchingKeys = Object.keys(found).filter((key) => state.fields[key] && state.fields[key] === found[key]);
  const score = Math.round((matchingKeys.length / Object.keys(found).length) * 100);

  if (score >= 50) {
    container.innerHTML = `
      <div class="duplicate-banner">
        <div>
          <h4>Possible duplicate detected</h4>
          <p>${found.name} already exists in sample records. Review before submitting another entry.</p>
        </div>
        <strong>${score}% match</strong>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

function renderExistingRecordsList(records) {
  const container = el('existingRecordsList');
  if (!container) return;

  container.innerHTML = records.length ? records.map((record) => `
    <button class="client-card" onclick="prefillRecord('${record.name}')" ondblclick="prefillRecordAndContinue('${record.name}')">
      <div class="client-badge-logo brand-sky"><span>${record.name.split(' ').map((part) => part[0]).join('')}</span></div>
      <div class="client-details">
        <div class="name">${record.name}</div>
        <div class="gate-id">${record.class ? `Class ${record.class} · Section ${record.section} · Roll ${record.roll}` : record.role || record.mobile}</div>
      </div>
      <span class="inline-hint">Double-click to continue</span>
    </button>
  `).join('') : '<div class="empty-state">No existing records match this search.</div>';
}

function filterExistingRecords(value) {
  const filtered = getFilteredExistingRecords(value);
  renderExistingRecordsList(filtered);
}

window.prefillRecord = (name) => {
  const filtered = getFilteredExistingRecords();
  const record = filtered.find((item) => item.name === name);
  if (!record) return;
  state.fields = { ...record };
  delete state.fields.sector;
  delete state.fields.category;
  state.mode = 'manual';
  renderDetailsStep();
  showToast('Record prefilled into manual mode.', 'success');
};

window.prefillRecordAndContinue = (name) => {
  window.prefillRecord(name);
  state.step = 5;
  renderSamplesStep();
};

window.validateAndGoStep5 = () => {
  const f = state.fields;
  if (state.category === 'Object') {
    if (!f.objectType || !f.subcat) {
      showToast('Fill the required object fields first.', 'error');
      return;
    }
  } else if (!f.name || !f.mobile) {
    showToast('Name and mobile number are required.', 'error');
    return;
  }

  state.step = 5;
  renderSamplesStep();
};

function renderSamplesStep() {
  const isObject = state.category === 'Object';

  // Auto-select the first uncaptured angle and start webcam on initial load
  if (!isObject && activeAngleIdx === -1 && state.capturedAngles.length < ANGLES.length) {
    const firstUncapturedIdx = ANGLES.findIndex((_, index) => !state.capturedAngles.includes(index));
    if (firstUncapturedIdx !== -1) {
      activeAngleIdx = firstUncapturedIdx;
      setTimeout(() => {
        startWebcam();
      }, 50);
    }
  }

  render(`
    ${getProgressHTML(5)}
    <section class="card">
      <h2 class="card-title">${isObject ? 'Upload Object Samples' : 'Capture Identity Samples'}</h2>
      <p class="card-sub">${isObject ? 'Upload clear evidence samples for the selected object or asset type.' : 'Capture all guided face angles. Approved images are prepared for upload after submission.'}</p>

      ${isObject ? `
        <label class="dropzone" for="objectUploadInput">
          <input id="objectUploadInput" type="file" accept=".png,.jpg,.jpeg,.webp" multiple hidden />
          <div class="icon">Upload</div>
          <h3>Click to upload object images</h3>
          <p>CSV and backend work separately. This step is only for image evidence.</p>
        </label>
        <div class="obj-previews" id="objectPreviewsContainer"></div>
      ` : `
        <div class="camera-container">
          <div>
            <div class="camera-preview-box" id="cameraPreviewBox">
              <div class="camera-placeholder">
                <div class="icon">Camera</div>
                <p>Select an angle from the right to start the camera.</p>
              </div>
            </div>
            <div class="camera-controls-row">
              <button class="btn btn-secondary" onclick="toggleCameraDevice()">Switch Camera</button>
              <button class="btn btn-primary" id="captureSnapshotBtn" onclick="captureSnapshot()" disabled>Capture</button>
            </div>
          </div>
          <div class="angle-grid">
            ${ANGLES.map((angle, index) => `
              <button class="angle-card ${state.capturedAngles.includes(index) ? 'captured' : ''} ${activeAngleIdx === index ? 'active' : ''}" onclick="selectCaptureAngle(${index})">
                <div class="circle">${state.capturedAngles.includes(index) ? 'OK' : index + 1}</div>
                <div class="details">
                  <div class="title">${angle.name}</div>
                  <div class="desc">${angle.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `}

      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="goBack()">Back</button>
        <button class="btn btn-primary" onclick="goNext()">Review Submission</button>
      </div>
    </section>
  `);

  if (isObject) {
    const input = el('objectUploadInput');
    input.addEventListener('change', handleObjectUpload);
    renderObjectPreviews();
  }
}

async function startWebcam() {
  stopCamera(false);
  const box = el('cameraPreviewBox');
  const captureButton = el('captureSnapshotBtn');
  if (!box || !captureButton) return;

  box.innerHTML = `
    <video id="webcamStreamVideo" autoplay playsinline muted></video>
    <div class="face-oval-guide active"></div>
    <div class="camera-status-overlay">Live camera</div>
  `;

  const videoEl = el('webcamStreamVideo');
  const constraintsList = [
    { video: { facingMode: activeCameraFacingMode, width: { ideal: 640 }, height: { ideal: 480 } } },
    { video: { facingMode: activeCameraFacingMode } },
    { video: true }
  ];

  let stream = null;
  for (const constraints of constraintsList) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) break;
    } catch (err) {
      console.warn("Camera constraint failed:", constraints, err);
    }
  }

  if (stream) {
    activeVideoStream = stream;
    videoEl.srcObject = stream;
    videoEl.play().catch((err) => {
      console.error("Autoplay/play blocked:", err);
    });
    captureButton.disabled = false;
  } else {
    box.innerHTML = `
      <div class="camera-placeholder">
        <div class="icon">Simulated</div>
        <p>No usable camera was found. Snapshot simulation is enabled.</p>
      </div>
      <div class="face-oval-guide active"></div>
      <div class="camera-status-overlay warning">Simulation mode</div>
    `;
    captureButton.disabled = false;
    showToast('Camera unavailable. Simulation mode enabled.', 'info');
  }
}

function stopCamera(resetAngle = true) {
  if (activeVideoStream) {
    activeVideoStream.getTracks().forEach((track) => track.stop());
    activeVideoStream = null;
  }
  if (resetAngle) activeAngleIdx = -1;
}

window.selectCaptureAngle = (index) => {
  if (state.capturedAngles.includes(index)) return;
  activeAngleIdx = index;
  renderSamplesStep();
  startWebcam();
};

window.toggleCameraDevice = () => {
  activeCameraFacingMode = activeCameraFacingMode === 'user' ? 'environment' : 'user';
  startWebcam();
};

window.captureSnapshot = () => {
  if (activeAngleIdx === -1) {
    showToast('Select an angle before capturing.', 'error');
    return;
  }

  const angle = ANGLES[activeAngleIdx];
  const canvas = document.createElement('canvas');
  const video = el('webcamStreamVideo');

  if (video && activeVideoStream) {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    
    // Mirror canvas if front-facing user camera is active
    if (activeCameraFacingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  } else {
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext('2d');
    context.fillStyle = '#090e1a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#60a5fa';
    context.font = '16px sans-serif';
    context.fillText(angle.name, 24, 120);
  }

  state.capturedAngles.push(activeAngleIdx);
  state.approvedImages.push({
    angleIndex: activeAngleIdx,
    angleName: angle.name,
    dataUrl: canvas.toDataURL('image/png'),
  });

  showToast(`${angle.name} captured successfully.`, 'success');

  const nextAngle = ANGLES.findIndex((_, index) => !state.capturedAngles.includes(index));
  if (nextAngle === -1) {
    stopCamera();
    renderSamplesStep();
    return;
  }

  activeAngleIdx = nextAngle;
  renderSamplesStep();
  startWebcam();
};

function handleObjectUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      state.approvedImages.push({
        angleIndex: null,
        angleName: 'object',
        dataUrl: reader.result,
        file,
        name: file.name,
      });
      renderObjectPreviews();
    };
    reader.readAsDataURL(file);
    if (index === files.length - 1) {
      showToast(`${files.length} object sample(s) ready for upload.`, 'success');
    }
  });
}

function renderObjectPreviews() {
  const container = el('objectPreviewsContainer');
  if (!container) return;
  container.innerHTML = state.approvedImages.length ? state.approvedImages.map((image) => `
    <div class="obj-thumb">
      <img src="${image.dataUrl}" alt="${image.name || 'Object sample'}" />
      <div class="status-tag">${image.name || 'Approved sample'}</div>
    </div>
  `).join('') : '<div class="empty-state">No object samples uploaded yet.</div>';
}

function renderReviewStep() {
  const isObject = state.category === 'Object';
  render(`
    ${getProgressHTML(6)}
    <section class="card">
      <h2 class="card-title">Review Submission</h2>
      <p class="card-sub">Confirm the selected sector, ${getSectorMeta().entityLabel.toLowerCase()}, category, and evidence before final submission.</p>

      <div class="review-section">
        <h4>Context</h4>
        <div class="review-row"><span class="label">Sector</span><span class="val">${getSectorName()}</span></div>
        <div class="review-row"><span class="label">${getSectorMeta().entityLabel}</span><span class="val">${state.client.name}</span></div>
        <div class="review-row"><span class="label">${getClientLabel(state.client)}</span><span class="val">${state.client.gateId}</span></div>
        <div class="review-row"><span class="label">Category</span><span class="val">${state.category}</span></div>
        <div class="review-row"><span class="label">Mode</span><span class="val">${state.mode === 'existing' ? 'Existing record selected' : 'Manual entry'}</span></div>
      </div>

      <div class="review-section">
        <h4>Entered Data</h4>
        ${Object.entries(state.fields).filter(([, value]) => value).map(([key, value]) => `
          <div class="review-row"><span class="label">${key.replace(/([A-Z])/g, ' $1')}</span><span class="val">${value}</span></div>
        `).join('') || '<div class="empty-state">No field data captured.</div>'}
      </div>

      <div class="review-section">
        <h4>Samples (${state.approvedImages.length})</h4>
        ${isObject ? `
          <div class="obj-previews">
            ${state.approvedImages.map((image) => `<div class="obj-thumb"><img src="${image.dataUrl}" alt="Object preview" /></div>`).join('')}
          </div>
        ` : `
          <div class="review-image-grid">
            ${ANGLES.map((angle, index) => `
              <div class="review-image-card ${state.capturedAngles.includes(index) ? 'filled' : ''}">
                <span>${state.capturedAngles.includes(index) ? 'Captured' : 'Pending'}</span>
                <div class="angle-lbl">${angle.name}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="wizard-footer">
        <button class="btn btn-secondary" onclick="goBack()">Back</button>
        <button class="btn btn-primary btn-success" id="submitRegistrationBtn" onclick="submitRegistration()">Submit Registration</button>
      </div>
    </section>
  `);
}

function dataUrlToBlob(dataUrl) {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

window.submitRegistration = async () => {
  if (state.isSubmitting) {
    showToast('Submission is already in progress.', 'info');
    return;
  }

  state.isSubmitting = true;
  setBusy('submitRegistrationBtn', true, 'Submitting...');

  try {
    const response = await api.createRegistration({
      clientId: state.client.id,
      sector: state.sector,
      category: state.category,
      fields: state.fields,
      mode: state.mode,
    });

    state.submissionId = response.submissionId;

    if (response.registrationId && state.approvedImages.length) {
      const formData = new FormData();
      state.approvedImages.forEach((image, index) => {
        const file = image.file || new File([dataUrlToBlob(image.dataUrl)], `sample-${index + 1}.png`, { type: 'image/png' });
        formData.append('images', file);
      });

      if (state.category !== 'Object') {
        formData.append('angles', JSON.stringify(state.approvedImages.map((image) => ({
          angleIndex: image.angleIndex,
          angleName: image.angleName,
        }))));
      }

      try {
        await api.uploadImages(response.registrationId, formData);
      } catch (error) {
        showToast('Registration saved, but image upload fell back to demo mode.', 'info');
      }
    }

    renderSuccessScreen();
  } catch (error) {
    state.submissionId = `GATEX-REG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    renderSuccessScreen();
    showToast('Backend unavailable. Demo submission created.', 'info');
  } finally {
    state.isSubmitting = false;
    setBusy('submitRegistrationBtn', false);
  }
};

function renderSuccessScreen() {
  render(`
    <section class="card success-card">
      <img src="assets/gatex-logo.png" alt="GateX logo" class="success-logo" />
      <h2 class="card-title">Registration Submitted</h2>
      <p class="card-sub">Your record is now staged for admin review and downstream processing.</p>
      <div class="id-display-container">
        <span id="submissionIdLabel">${state.submissionId}</span>
        <button class="copy-btn" onclick="copySubmissionId()">Copy</button>
      </div>
      <div class="home-cta">
        <button class="btn btn-secondary btn-large" onclick="resetFlow()">Register Another</button>
        <button class="btn btn-primary btn-large" onclick="showAdminDashboard()">Open Admin Console</button>
      </div>
    </section>
  `);
}

window.copySubmissionId = async () => {
  await navigator.clipboard.writeText(el('submissionIdLabel').textContent);
  showToast('Submission ID copied.', 'success');
};

window.resetFlow = () => {
  stopCamera();
  resetFlowState();
  renderSectorStep();
};

function openAdminLoginModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'adminLoginOverlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>Admin Sign In</h3>
      <p>Use the configured admin email and password to access operational controls.</p>
      <div class="form-group">
        <label>Admin Email</label>
        <input type="email" id="adminEmailInput" placeholder="admin@gatex.local" value="admin@gatex.demo" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="adminPasswordInput" placeholder="Enter admin password" />
        <small id="adminLoginError" class="field-error hidden">Invalid credentials.</small>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeAdminLoginModal()">Cancel</button>
        <button class="btn btn-primary" id="adminLoginSubmitBtn" onclick="submitAdminLogin()">Sign In</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  el('adminEmailInput').value = api.isDemoMode ? 'admin@gatex.demo' : 'admin@gatex.local';
}

window.closeAdminLoginModal = () => {
  const overlay = el('adminLoginOverlay');
  if (overlay) overlay.remove();
};

window.submitAdminLogin = async () => {
  if (state.isLoggingIn) return;
  state.isLoggingIn = true;
  setBusy('adminLoginSubmitBtn', true, 'Signing in...');

  const email = el('adminEmailInput').value;
  const password = el('adminPasswordInput').value;
  const errorNode = el('adminLoginError');

  try {
    const response = await api.loginAdmin(email, password);
    state.adminUser = { email: response.email || email, role: response.role || 'admin' };
    closeAdminLoginModal();
    renderAdminPage();
  } catch (error) {
    if (errorNode) errorNode.classList.remove('hidden');
  } finally {
    state.isLoggingIn = false;
    setBusy('adminLoginSubmitBtn', false);
  }
};

window.showAdminDashboard = () => {
  stopCamera();
  if (!api.token) {
    openAdminLoginModal();
    return;
  }
  renderAdminPage();
};

window.logoutAdmin = () => {
  api.clearAuth();
  state.adminUser = null;
  showToast('Admin session cleared.', 'success');
  window.showHome();
};

async function renderAdminPage() {
  state.isAdminView = true;
  render(`
    <section class="admin-shell">
      <div class="admin-header">
        <div>
          <span class="eyebrow">Role-based access</span>
          <h2 class="card-title">GateX Admin Console</h2>
          <p class="card-sub">Filter data by sector, then by school or client, then review the operational records for that unit.</p>
        </div>
        <div class="admin-actions">
          <button class="btn btn-secondary" onclick="showHome()">Home</button>
          <button class="btn btn-ghost" onclick="logoutAdmin()">Logout</button>
        </div>
      </div>

      <div class="admin-stats-grid" id="adminStatsGrid">
        <div class="admin-stat-card shimmer-card"></div>
        <div class="admin-stat-card shimmer-card"></div>
        <div class="admin-stat-card shimmer-card"></div>
        <div class="admin-stat-card shimmer-card"></div>
      </div>

      <section class="card">
        <h3 class="section-title">Systematic Filters</h3>
        <div class="form-grid admin-filter-grid">
          <div class="form-group">
            <label>1. Select Sector</label>
            <select id="filterSectorSelect"></select>
          </div>
          <div class="form-group">
            <label id="filterClientLabel">2. Select Client</label>
            <select id="filterClientSelect"></select>
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="filterCategorySelect">
              <option value="">All categories</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="filterStatusSelect">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </section>

      <section class="card import-card">
        <div>
          <h3 class="section-title">Bulk Import via CSV or Excel</h3>
          <p class="card-sub">Upload a CSV, XLS, or XLSX file for the currently selected sector and client. Minimum required column: <code>name</code>.</p>
        </div>
        <div class="import-actions">
          <input id="bulkImportInput" type="file" accept=".csv,.xls,.xlsx" hidden />
          <button class="btn btn-primary" onclick="triggerBulkImport()">Choose File</button>
          <span id="bulkImportHint" class="inline-hint">Pick sector and client first</span>
        </div>
      </section>

      <section class="admin-table-container">
        <table class="submissions-table">
          <thead>
            <tr>
              <th>Submission ID</th>
              <th>Sector</th>
              <th>School / Client</th>
              <th>Category</th>
              <th>Name</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="adminSubmissionsTableBody"></tbody>
        </table>
      </section>

      <section class="card">
        <h3 class="section-title">Protected Category PIN</h3>
        <div class="pin-row">
          <input type="password" id="newGlobalCategoryPin" placeholder="Set or rotate Others category PIN" />
          <button class="btn btn-secondary" onclick="updateGlobalPin()">Update PIN</button>
        </div>
      </section>
    </section>
  `);

  populateSectorFilter();
  await syncAdminClientOptions();
  bindAdminListeners();
  await loadAdminData();
}

function populateSectorFilter() {
  const sectorSelect = el('filterSectorSelect');
  sectorSelect.innerHTML = [
    '<option value="">All sectors</option>',
    ...SECTORS.map((sector) => `<option value="${sector.id}" ${state.activeAdminFilters.sector === sector.id ? 'selected' : ''}>${sector.name}</option>`),
  ].join('');
}

async function syncAdminClientOptions() {
  const clientSelect = el('filterClientSelect');
  const categorySelect = el('filterCategorySelect');
  const clientLabel = el('filterClientLabel');
  const sector = state.activeAdminFilters.sector;

  let clients = CLIENTS_DB;
  if (sector) {
    try {
      clients = await api.getClients(sector);
    } catch (error) {
      clients = CLIENTS_DB.filter((item) => item.sector === sector);
    }
  }

  state.backendClients = clients;
  if (clientLabel) {
    clientLabel.textContent = `2. Select ${sector === 'school' ? 'School' : 'Client'}`;
  }

  clientSelect.innerHTML = [
    `<option value="">All ${sector === 'school' ? 'schools' : 'clients'}</option>`,
    ...clients.map((client) => `<option value="${client.id}" ${state.activeAdminFilters.clientId === client.id ? 'selected' : ''}>${client.name} (${client.gateId})</option>`),
  ].join('');

  const categories = sector ? CATEGORIES[sector] || [] : [...new Set(Object.values(CATEGORIES).flat())];
  categorySelect.innerHTML = [
    '<option value="">All categories</option>',
    ...categories.map((category) => `<option value="${category}" ${state.activeAdminFilters.category === category ? 'selected' : ''}>${category}</option>`),
  ].join('');

  el('filterStatusSelect').value = state.activeAdminFilters.status;
}

function bindAdminListeners() {
  el('filterSectorSelect').addEventListener('change', async (event) => {
    state.activeAdminFilters.sector = event.target.value;
    state.activeAdminFilters.clientId = '';
    state.activeAdminFilters.category = '';
    await syncAdminClientOptions();
    await loadAdminData();
  });

  el('filterClientSelect').addEventListener('change', async (event) => {
    state.activeAdminFilters.clientId = event.target.value;
    await loadAdminData();
  });

  el('filterCategorySelect').addEventListener('change', async (event) => {
    state.activeAdminFilters.category = event.target.value;
    await loadAdminData();
  });

  el('filterStatusSelect').addEventListener('change', async (event) => {
    state.activeAdminFilters.status = event.target.value;
    await loadAdminData();
  });

  el('bulkImportInput').addEventListener('change', submitBulkImport);
}

async function loadAdminData() {
  try {
    state.adminStats = await api.getAdminStats();
  } catch (error) {
    state.adminStats = {
      total: MOCK_SUBMISSIONS.length,
      pending: MOCK_SUBMISSIONS.filter((item) => item.status === 'pending').length,
      approved: MOCK_SUBMISSIONS.filter((item) => item.status === 'approved').length,
      rejected: MOCK_SUBMISSIONS.filter((item) => item.status === 'rejected').length,
      duplicates: MOCK_SUBMISSIONS.filter((item) => item.dup).length,
    };
  }

  try {
    const submissions = await api.getSubmissions(state.activeAdminFilters);
    state.backendSubmissions = submissions.data || submissions;
  } catch (error) {
    state.backendSubmissions = MOCK_SUBMISSIONS.filter((item) =>
      (!state.activeAdminFilters.sector || item.sector === state.activeAdminFilters.sector) &&
      (!state.activeAdminFilters.clientId || item.clientId === state.activeAdminFilters.clientId) &&
      (!state.activeAdminFilters.category || (item.category || item.cat) === state.activeAdminFilters.category) &&
      (!state.activeAdminFilters.status || item.status === state.activeAdminFilters.status)
    );
  }

  renderAdminStats();
  renderAdminTable();
}

function renderAdminStats() {
  const container = el('adminStatsGrid');
  if (!container) return;
  const stats = state.adminStats;
  container.innerHTML = `
    <article class="admin-stat-card"><div class="num">${stats.total}</div><div class="lbl">Total records</div></article>
    <article class="admin-stat-card"><div class="num">${stats.pending}</div><div class="lbl">Pending review</div></article>
    <article class="admin-stat-card"><div class="num">${stats.approved}</div><div class="lbl">Approved</div></article>
    <article class="admin-stat-card"><div class="num">${stats.duplicates}</div><div class="lbl">Duplicate warnings</div></article>
  `;
}

function renderAdminTable() {
  const tbody = el('adminSubmissionsTableBody');
  if (!tbody) return;

  if (!state.backendSubmissions.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No records match the selected sector, client, category, and status.</td></tr>';
    return;
  }

  tbody.innerHTML = state.backendSubmissions.map((item) => {
    const submissionId = item.submissionId || item.id;
    const sector = item.sector || item.client?.sector || '';
    const clientName = item.client?.name || item.client;
    const category = item.category || item.cat;
    const recordName = item.fields?.name || item.name || 'N/A';

    return `
      <tr>
        <td>${submissionId}</td>
        <td>${getSectorName(sector)}</td>
        <td>${clientName}</td>
        <td>${category}</td>
        <td>${recordName}</td>
        <td><span class="status-badge ${item.status}">${item.status}</span></td>
        <td>
          <div class="action-buttons">
            ${item.status !== 'approved' ? `<button class="action-btn approve" onclick="changeSubmissionStatus('${submissionId}', 'approved')">Approve</button>` : ''}
            ${item.status !== 'rejected' ? `<button class="action-btn reject" onclick="changeSubmissionStatus('${submissionId}', 'rejected')">Reject</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.changeSubmissionStatus = async (id, status) => {
  try {
    await api.updateSubmissionStatus(id, status);
  } catch (error) {
    showToast('Backend update failed, applying local fallback.', 'info');
  }

  const match = state.backendSubmissions.find((item) => (item.id || item.submissionId) === id);
  if (match) match.status = status;
  renderAdminTable();
  showToast(`Submission updated to ${status}.`, 'success');
};

window.triggerBulkImport = () => {
  if (!state.activeAdminFilters.sector || !state.activeAdminFilters.clientId) {
    showToast('Select a sector and client before bulk import.', 'error');
    return;
  }
  el('bulkImportInput').click();
};

async function submitBulkImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sector', state.activeAdminFilters.sector);
  formData.append('clientId', state.activeAdminFilters.clientId);
  formData.append('category', state.activeAdminFilters.category || CATEGORIES[state.activeAdminFilters.sector]?.[0] || 'Student');

  try {
    const response = await api.uploadImport(formData);
    showToast(`Imported ${response.imported} records from ${file.name}.`, 'success');
    await loadAdminData();
  } catch (error) {
    showToast(error.message || 'Bulk import failed.', 'error');
  } finally {
    event.target.value = '';
  }
}

window.updateGlobalPin = async () => {
  const value = el('newGlobalCategoryPin').value;
  if (!value || value.length < 6) {
    showToast('PIN must be at least 6 characters.', 'error');
    return;
  }
  await api.updateOthersPin(value);
  el('newGlobalCategoryPin').value = '';
  showToast('Protected category PIN updated.', 'success');
};

window.addEventListener('DOMContentLoaded', () => {
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
  window.showHome();
});
