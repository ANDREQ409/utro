const cfg = SITE_CONFIG;

const grid = document.getElementById("servicesGrid");
const serviceSelect = document.querySelector('select[name="service"]');
const form = document.getElementById("bookingForm");
const successBlock = document.getElementById("formSuccess");
const failBlock = document.getElementById("formFail");
const submitBtn = form.querySelector(".form__submit");
const burgerBtn = document.getElementById("burgerBtn");
const nav = document.getElementById("siteNav");
const dateInput = form.querySelector('input[name="date"]');
const timeInput = form.querySelector('input[name="time"]');

function applyTheme() {
  const root = document.documentElement.style;
  root.setProperty("--color-primary", cfg.theme.primary);
  root.setProperty("--color-primary-dark", cfg.theme.primaryDark);
  root.setProperty("--color-accent", cfg.theme.accent);
  root.setProperty("--color-accent-hover", cfg.theme.accentHover);
}

function fillContacts() {
  const navPhone = document.getElementById("navPhone");
  navPhone.textContent = cfg.phoneDisplay;
  navPhone.href = cfg.phoneHref;

  document.getElementById("footerName").textContent = cfg.name;

  const mapLink = `https://yandex.ru/maps/?text=${encodeURIComponent(cfg.mapQuery)}`;
  document.getElementById("mapFrame").src =
    `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(cfg.mapQuery)}&z=17`;

  const items = [
    { label: "Адрес", value: cfg.address, href: mapLink, external: true },
    { label: "Телефон", value: cfg.phoneDisplay, href: cfg.phoneHref },
    { label: "Часы работы", value: cfg.hoursDisplay },
    { label: "Email", value: cfg.email, href: `mailto:${cfg.email}` }
  ];

  const list = document.getElementById("contactsList");
  list.innerHTML = items.map(item => {
    const inner = item.href
      ? `<a class="contacts__value" href="${item.href}"${item.external ? ' target="_blank" rel="noopener"' : ""}>${item.value}</a>`
      : `<span class="contacts__value">${item.value}</span>`;
    return `
      <li class="contacts__item">
        <span class="contacts__label">${item.label}</span>
        ${inner}
      </li>
    `;
  }).join("");
}

function fillBookingPoints() {
  const list = document.getElementById("bookingPoints");
  list.innerHTML = cfg.bookingPoints.map(point => `<li>${point}</li>`).join("");
}

function renderServices() {
  const buttonLabel = cfg.bookButtonLabel || "Записаться";
  grid.innerHTML = cfg.services.map(service => `
    <article class="service-card">
      <h3 class="service-card__title">${service.title}</h3>
      <p class="service-card__desc">${service.description}</p>
      <div class="service-card__footer">
        <span class="service-card__price">${service.price}</span>
        <button type="button" class="btn btn--primary service-card__book" data-service="${service.id}">${buttonLabel}</button>
      </div>
    </article>
  `).join("");
}

function fillServiceSelect() {
  cfg.services.forEach(service => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = `${service.title} (${service.price})`;
    serviceSelect.appendChild(option);
  });
}

function showFieldError(fieldName, message) {
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
  const inputElement = form.querySelector(`[name="${fieldName}"]`);
  if (errorElement) errorElement.textContent = message;
  if (inputElement) inputElement.classList.toggle("form__input--invalid", Boolean(message));
}

function validateForm(data) {
  let isValid = true;

  if (data.name.trim().length < 2) {
    showFieldError("name", "Введите имя (минимум 2 символа)");
    isValid = false;
  } else {
    showFieldError("name", "");
  }

  const phoneDigits = data.phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    showFieldError("phone", "Введите телефон полностью, например +7 (900) 123-45-67");
    isValid = false;
  } else {
    showFieldError("phone", "");
  }

  if (!data.service) {
    showFieldError("service", "Выберите позицию");
    isValid = false;
  } else {
    showFieldError("service", "");
  }

  if (data.date) {
    const day = new Date(`${data.date}T00:00:00`).getDay();
    if (!cfg.workDays.includes(day)) {
      showFieldError("date", "В эти дни не работаем — выберите рабочий день");
      isValid = false;
    } else {
      showFieldError("date", "");
    }
  } else {
    showFieldError("date", "");
  }

  if (data.time) {
    if (data.time < timeInput.min || data.time > timeInput.max) {
      showFieldError("time", `Принимаем заказы с ${cfg.timeMin} до ${cfg.timeMax}`);
      isValid = false;
    } else {
      showFieldError("time", "");
    }
  } else {
    showFieldError("time", "");
  }

  return isValid;
}

function saveBooking(booking) {
  const bookings = JSON.parse(localStorage.getItem("bookings") || "[]");
  bookings.push(booking);
  localStorage.setItem("bookings", JSON.stringify(bookings));
}

function onServiceBookClick(event) {
  const button = event.target.closest(".service-card__book");
  if (!button) return;
  serviceSelect.value = button.dataset.service;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function onFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const data = {
    name: formData.get("name") || "",
    phone: formData.get("phone") || "",
    service: formData.get("service") || "",
    date: formData.get("date") || "",
    time: formData.get("time") || "",
    comment: formData.get("comment") || ""
  };

  if (formData.get("_gotcha")) {
    form.reset();
    return;
  }

  if (!validateForm(data)) return;

  const serviceTitle = cfg.services.find(s => s.id === data.service)?.title || data.service;

  saveBooking({
    ...data,
    serviceTitle,
    createdAt: new Date().toISOString()
  });

  submitBtn.disabled = true;
  submitBtn.textContent = "Отправляем…";
  successBlock.hidden = true;
  failBlock.hidden = true;

  let sent = false;
  try {
    const response = await fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData
    });
    sent = response.ok;
  } catch {
    sent = false;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = cfg.bookButtonLabel || "Записаться";

  if (sent) {
    form.reset();
    successBlock.hidden = false;
    successBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => { successBlock.hidden = true; }, 6000);
  } else {
    failBlock.hidden = false;
    failBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function onBurgerClick() {
  const isOpen = nav.classList.toggle("nav--open");
  burgerBtn.classList.toggle("burger--open", isOpen);
  burgerBtn.setAttribute("aria-expanded", String(isOpen));
}

function onNavLinkClick() {
  nav.classList.remove("nav--open");
  burgerBtn.classList.remove("burger--open");
  burgerBtn.setAttribute("aria-expanded", "false");
}

function setTimeRange() {
  timeInput.min = cfg.timeMin;
  timeInput.max = cfg.timeMax;
}

function setMinDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

applyTheme();
fillContacts();
fillBookingPoints();
renderServices();
fillServiceSelect();
setTimeRange();
setMinDate();

grid.addEventListener("click", onServiceBookClick);
form.addEventListener("submit", onFormSubmit);
burgerBtn.addEventListener("click", onBurgerClick);
nav.querySelectorAll(".nav__link").forEach(link => link.addEventListener("click", onNavLinkClick));
