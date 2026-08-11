const officialEventUrl = "https://everout.com/portland/events/the-portland-mercurys-burger-week-2026/e222750/";
const eventDefinitions = [
  {
    id: "burger-week-2026",
    title: "Burger Week 2026",
    city: "Portland, OR",
    startsOn: "2026-08-10",
    endsOn: "2026-08-16",
    price: "$10",
    sourceUrl: officialEventUrl,
    targetCount: 124,
    dataFile: "data/burger-week-2026.csv"
  }
];
const reviewStoreKey = "burger-week-reviews-v2";
const accountStoreKey = "burger-week-account-v1";
const wantStoreKey = "burger-week-wants-v1";
const hiddenStoreKey = "burger-week-hidden-v1";
const waitReportStoreKey = "burger-week-wait-reports-v1";
const scheduleStoreKey = "burger-week-schedule-v1";
const feedbackStoreKey = "burger-week-feedback-v1";
const supabasePhotoBucket = "burger-review-photos";
const reviewPhotoMaxDimension = 1600;
const reviewPhotoJpegQuality = 0.82;
const waitTimeOptions = [
  ["immediate", "Immediate (0-5 minutes)"],
  ["standard", "Standard (5-15 minutes)"],
  ["long", "Long (15-30 minutes)"],
  ["very-long", "Very Long (30+ minutes)"]
];
const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});
const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  eventPicker: $("#eventPicker"),
  controlsBand: $("#controlsBand"),
  controlsToggle: $("#controlsToggle"),
  controlsContent: $("#controlsContent"),
  statsGrid: $("#statsGrid"),
  searchInput: $("#searchInput"),
  neighborhoodFilter: $("#neighborhoodFilter"),
  friendFilter: $("#friendFilter"),
  ratingFilter: $("#ratingFilter"),
  sortSelect: $("#sortSelect"),
  openNowFilter: $("#openNowFilter"),
  hideVisitedFilter: $("#hideVisitedFilter"),
  tabs: $$(".tab"),
  views: $$(".view"),
  reviewGrid: $("#reviewGrid"),
  burgerList: $("#burgerList"),
  hypeList: $("#hypeList"),
  resultCount: $("#resultCount"),
  mapPins: $("#mapPins"),
  mapList: $("#mapList"),
  scheduleForm: $("#scheduleForm"),
  scheduleBurgerSelect: $("#scheduleBurgerSelect"),
  scheduleDateInput: $("#scheduleDateInput"),
  scheduleTimeInput: $("#scheduleTimeInput"),
  scheduleStatusSelect: $("#scheduleStatusSelect"),
  scheduleNoteInput: $("#scheduleNoteInput"),
  scheduleList: $("#scheduleList"),
  backToSection: $("#backToSection"),
  dialog: $("#reviewDialog"),
  reviewDialogTitle: $("#reviewDialogTitle"),
  openComposer: $("#openComposer"),
  closeComposer: $("#closeComposer"),
  reviewForm: $("#reviewForm"),
  burgerSelect: $("#burgerSelect"),
  starInput: $("#starInput"),
  ratingInput: $("#ratingInput"),
  ratingOutput: $("#ratingOutput"),
  photoInput: $("#photoInput"),
  waitTimeInput: $("#waitTimeInput"),
  postReviewButton: $("#postReviewButton"),
  clearLocalData: $("#clearLocalData"),
  authButton: $("#authButton"),
  feedbackButton: $("#feedbackButton"),
  feedbackDialog: $("#feedbackDialog"),
  feedbackForm: $("#feedbackForm"),
  feedbackMessageInput: $("#feedbackMessageInput"),
  feedbackStatus: $("#feedbackStatus"),
  submitFeedbackButton: $("#submitFeedbackButton"),
  closeFeedbackDialog: $("#closeFeedbackDialog"),
  cancelFeedback: $("#cancelFeedback"),
  loginDialog: $("#loginDialog"),
  loginForm: $("#loginForm"),
  loginNameInput: $("#loginNameInput"),
  loginEmailInput: $("#loginEmailInput"),
  loginPasswordInput: $("#loginPasswordInput"),
  authStatus: $("#authStatus"),
  appStatus: $("#appStatus"),
  reviewStatus: $("#reviewStatus"),
  closeLogin: $("#closeLogin"),
  waitDialog: $("#waitDialog"),
  waitForm: $("#waitForm"),
  waitBurgerName: $("#waitBurgerName"),
  waitReportSelect: $("#waitReportSelect"),
  waitReportNoteInput: $("#waitReportNoteInput"),
  closeWaitDialog: $("#closeWaitDialog"),
  cancelWaitReport: $("#cancelWaitReport"),
  logoutButton: $("#logoutButton"),
  resetPasswordButton: $("#resetPasswordButton"),
  reviewerInput: $("#reviewerInput"),
  hiddenList: $("#hiddenList"),
  hiddenCount: $("#hiddenCount"),
  imageDialog: $("#imageDialog"),
  imageDialogPhoto: $("#imageDialogPhoto"),
  imageDialogCaption: $("#imageDialogCaption"),
  closeImageDialog: $("#closeImageDialog")
};

let events = {};
let currentEventId = "burger-week-2026";
let currentRating = 5;
let photoViewByReview = {};
let openReviewAfterLogin = false;
let pendingWantBurgerId = "";
let pendingHideBurgerId = "";
let pendingWaitBurgerId = "";
let activeWaitBurgerId = "";
let controlsCollapsed = false;
let hypeCollapsed = false;
let currentViewName = "feed";
let statsScope = "personal";
let wantedStatIndex = 0;
let reviewTextViewByReview = {};
let supabaseClient = null;
let supabaseSession = null;
let supabaseProfile = null;
let supabaseReviewWaitTimeSupported = true;
let passwordRecoveryMode = false;
let authStatusMessage = "";
let remoteReviewsByEvent = {};
let remoteWantsByEvent = {};
let remoteHiddenByEvent = {};
let appStatusTimer = 0;
let activeReviewEditId = "";
let reviewSubmitting = false;
let feedbackSubmitting = false;
let pendingReviewActions = new Set();
let filters = {
  search: "",
  neighborhood: "all",
  friend: "all",
  rating: 0,
  sort: "recent",
  openNow: false,
  hideVisited: false
};

function fallbackEvent() {
  const dates = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"];
  const neighborhoods = ["Downtown", "Glendoveer", "North Portland", "Northeast", "Northwest", "Southeast", "Southwest"];
  const burgers = [
    {
      id: "von-ebert-glendoveer",
      restaurant: "Von Ebert Brewing Glendoveer",
      burger: "Event burger TBD",
      description: "Replace with the official Burger Week description.",
      neighborhood: "Glendoveer",
      address: "Portland, OR",
      available: dates,
      hours: "Replace with event hours.",
      tags: ["beer"],
      restaurantPhoto: "data/photos/restaurant-placeholder.svg",
      photoAlt: "Restaurant-posted burger photo placeholder",
      mapsUrl: "https://maps.apple.com/?q=Von%20Ebert%20Brewing%20Glendoveer%20Portland%20OR",
      everoutUrl: officialEventUrl,
      map: { x: 74, y: 43 }
    },
    ...Array.from({ length: 123 }, (_, index) => {
      const number = index + 2;
      const neighborhood = neighborhoods[number % neighborhoods.length];
      return {
        id: `burger-${String(number).padStart(3, "0")}`,
        restaurant: `Burger Week Placeholder ${String(number).padStart(3, "0")}`,
        burger: "Burger details TBD",
        description: "Replace this row with a participating restaurant from EverOut.",
        neighborhood,
        address: "Portland, OR",
        available: dates,
        hours: "Replace with event hours.",
        tags: [],
        restaurantPhoto: "data/photos/restaurant-placeholder.svg",
        photoAlt: "Restaurant-posted burger photo placeholder",
        mapsUrl: `https://maps.apple.com/?q=${encodeURIComponent(`Burger Week Placeholder ${number} Portland OR`)}`,
        everoutUrl: officialEventUrl,
        map: { x: 18 + ((number * 11) % 68), y: 13 + ((number * 17) % 72) }
      };
    })
  ];

  return {
    "burger-week-2026": {
      title: "Burger Week 2026",
      city: "Portland, OR",
      price: "$10",
      dates,
      sourceUrl: officialEventUrl,
      burgers,
      reviews: []
    },
    "dumpling-week-template": {
      title: "Dumpling Week Template",
      city: "Portland, OR",
      price: "TBD",
      dates: [],
      sourceUrl: "",
      burgers: [],
      reviews: []
    }
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function loadingButtonContent(label) {
  return `
    <span class="button-spinner" aria-hidden="true"></span>
    <span class="button-label">${escapeHtml(label)}</span>
  `;
}

function buttonBusyAttributes(isBusy) {
  return isBusy ? `disabled aria-busy="true"` : "";
}

function setButtonLoading(button, isLoading, loadingLabel = "") {
  if (!button) return;

  const label = button.querySelector(".button-label");
  if (label && !button.dataset.defaultLabel) {
    button.dataset.defaultLabel = label.textContent.trim();
  }

  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.setAttribute("aria-busy", String(isLoading));

  if (label) {
    label.textContent = isLoading && loadingLabel ? loadingLabel : button.dataset.defaultLabel || label.textContent;
  }
}

function reviewActionKey(action, reviewId) {
  return `${action}:${reviewId}`;
}

function reviewActionBusy(action, reviewId) {
  return pendingReviewActions.has(reviewActionKey(action, reviewId));
}

function setReviewActionBusy(action, reviewId, isBusy) {
  if (!reviewId) return;
  const key = reviewActionKey(action, reviewId);
  if (isBusy) {
    pendingReviewActions.add(key);
  } else {
    pendingReviewActions.delete(key);
  }
  renderFeed();
}

function waitTimeLabel(value = "") {
  return waitTimeOptions.find(([key]) => key === value)?.[1] || "";
}

function waitTimeValueFromText(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("very long")) return "very-long";
  if (lower.includes("long (15")) return "long";
  if (lower.includes("standard")) return "standard";
  if (lower.includes("immediate")) return "immediate";
  return "";
}

function appendWaitTimeToNotes(notes, waitTime) {
  const label = waitTimeLabel(waitTime);
  if (!label) return notes;
  const trimmedNotes = notes.trim();
  return `${trimmedNotes}${trimmedNotes ? "\n\n" : ""}Wait time: ${label}`;
}

function stripWaitTimeFallback(notes = "") {
  return notes
    .replace(/\n{0,2}Wait time: (Immediate \(0-5 minutes\)|Standard \(5-15 minutes\)|Long \(15-30 minutes\)|Very Long \(30\+ minutes\))\s*$/i, "")
    .trim();
}

function notesWithWaitTimeFallback(notes, waitTime) {
  return appendWaitTimeToNotes(stripWaitTimeFallback(notes), waitTime);
}

function loadJsonStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveJsonStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function accountEventBucket(store, account) {
  if (!account) return null;
  store[currentEventId] ||= {};
  store[currentEventId][account.id] ||= {};
  return store[currentEventId][account.id];
}

function accountWaitReports() {
  const account = getAccount();
  if (!account) return {};
  return loadJsonStore(waitReportStoreKey)[currentEventId]?.[account.id] || {};
}

function latestWaitReport(burgerId) {
  return accountWaitReports()[burgerId] || null;
}

function saveWaitReport(burgerId, waitTime, note = "") {
  const account = getAccount();
  if (!account) return false;
  const store = loadJsonStore(waitReportStoreKey);
  const bucket = accountEventBucket(store, account);
  const burger = getBurger(burgerId);
  bucket[burgerId] = {
    burgerId,
    restaurant: burger.restaurant,
    burger: burger.burger,
    waitTime,
    note: note.trim(),
    reporter: account.displayName,
    profileId: account.id,
    reportedAt: new Date().toISOString()
  };
  saveJsonStore(waitReportStoreKey, store);
  return true;
}

function deleteWaitReport(burgerId) {
  const account = getAccount();
  if (!account) return false;
  const store = loadJsonStore(waitReportStoreKey);
  if (!store[currentEventId]?.[account.id]?.[burgerId]) return false;

  delete store[currentEventId][account.id][burgerId];
  if (!Object.keys(store[currentEventId][account.id]).length) {
    delete store[currentEventId][account.id];
  }
  saveJsonStore(waitReportStoreKey, store);
  return true;
}

function accountScheduleEntries() {
  const account = getAccount();
  if (!account) return [];
  return Object.values(loadJsonStore(scheduleStoreKey)[currentEventId]?.[account.id] || {});
}

function saveScheduleEntry(entry) {
  const account = getAccount();
  if (!account) return false;
  const store = loadJsonStore(scheduleStoreKey);
  const bucket = accountEventBucket(store, account);
  bucket[entry.id] = entry;
  saveJsonStore(scheduleStoreKey, store);
  return true;
}

function deleteScheduleEntry(entryId) {
  const account = getAccount();
  if (!account) return;
  const store = loadJsonStore(scheduleStoreKey);
  if (store[currentEventId]?.[account.id]?.[entryId]) {
    delete store[currentEventId][account.id][entryId];
    saveJsonStore(scheduleStoreKey, store);
  }
}

function saveLocalFeedbackReport(report) {
  const account = getAccount() || {
    id: "anonymous",
    displayName: "Anonymous",
    email: ""
  };
  const store = loadJsonStore(feedbackStoreKey);
  const bucket = accountEventBucket(store, account);
  bucket[report.id] = report;
  saveJsonStore(feedbackStoreKey, store);
}

function closeFeedbackDialog() {
  if (els.feedbackDialog?.open) els.feedbackDialog.close();
  els.feedbackForm?.reset();
  setFeedbackStatus("");
}

function openFeedbackDialog() {
  setFeedbackStatus("");
  els.feedbackForm?.reset();
  els.feedbackDialog?.showModal();
}

function dateTimePartsFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
      sortKey: ""
    };
  }

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
  const timePart = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0")
  ].join(":");

  return {
    date: datePart,
    time: timePart,
    sortKey: `${datePart}T${timePart}`
  };
}

function supabaseMissingColumnError(error, columnName) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return error?.code === "PGRST204" || message.includes(columnName.toLowerCase());
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [headers, ...dataRows] = rows;
  if (!headers) return [];
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] || "").trim()])));
}

function dateRange(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function weekdayKeyForDate(date) {
  return weekdayKeys[new Date(`${date}T12:00:00`).getDay()];
}

function parseClockTime(value, impliedPeriod = "") {
  const text = value.trim().toLowerCase().replaceAll(".", "");
  if (text === "noon") return 12 * 60;
  if (text === "midnight") return 0;

  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  const period = match[3] || impliedPeriod;
  if (!period) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (hour > 12 || minute > 59) return null;

  if (period === "am") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return hour * 60 + minute;
}

function parseHoursSegment(segment) {
  const text = segment.trim();
  const match = text.match(/^(.+?)\s*(?:-|\u2013|\u2014|\bto\b)\s*(.+)$/i);
  if (!match) return null;

  const [, startText, endText] = match;
  const startPeriod = startText.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase() || "";
  const endPeriod = endText.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase() || "";
  const impliedStartPeriod = startPeriod || endPeriod;
  const startHour = Number(startText.match(/\d{1,2}/)?.[0]);
  let startMinutes = parseClockTime(startText, impliedStartPeriod);
  let endMinutes = parseClockTime(endText, endPeriod || startPeriod);

  if (startMinutes === null || endMinutes === null) return null;

  if (endMinutes <= startMinutes) {
    if (!startPeriod && endPeriod === "pm" && Number.isFinite(startHour) && startHour < 12 && startMinutes >= 12 * 60) {
      startMinutes -= 12 * 60;
    } else {
      endMinutes += 24 * 60;
    }
  }

  return {
    raw: text,
    startMinutes,
    endMinutes,
    overnight: endMinutes >= 24 * 60
  };
}

function parseHoursText(hoursText) {
  if (!hoursText) return [];
  return hoursText
    .split(/\s*(?:;|,|&|\band\b)\s*/i)
    .map(parseHoursSegment)
    .filter(Boolean);
}

function availabilityFromDayHours(row, eventDates) {
  return eventDates
    .map((date) => {
      const dayKey = weekdayKeyForDate(date);
      const hoursText = row[`hours_${dayKey}`] || "";
      if (!hoursText) return null;

      return {
        date,
        dayKey,
        dayLabel: weekdayFormatter.format(new Date(`${date}T12:00:00`)),
        hoursText,
        parsedHours: parseHoursText(hoursText)
      };
    })
    .filter(Boolean);
}

function formatWeeklyHours(availability) {
  if (!availability.length) return "TBD";
  return availability.map((entry) => `${entry.dayLabel} ${entry.hoursText}`).join("; ");
}

function hoursForDate(burger, date) {
  return burger.availability?.find((entry) => entry.date === date)?.hoursText || "";
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function addDays(date, offset) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function burgerOpenAt(burger, date = new Date()) {
  const todayKey = localDateKey(date);
  const yesterdayKey = localDateKey(addDays(date, -1));
  const nowMinutes = minutesSinceMidnight(date);
  const today = burger.availability?.find((entry) => entry.date === todayKey);
  const yesterday = burger.availability?.find((entry) => entry.date === yesterdayKey);
  const openToday = today?.parsedHours?.some((span) => nowMinutes >= span.startMinutes && nowMinutes < Math.min(span.endMinutes, 24 * 60));
  const openFromYesterday = yesterday?.parsedHours?.some((span) => {
    if (span.endMinutes <= 24 * 60) return false;
    const overnightMinutes = nowMinutes + 24 * 60;
    return overnightMinutes >= span.startMinutes && overnightMinutes < span.endMinutes;
  });

  return Boolean(openToday || openFromYesterday);
}

function coordinateToMapPoint(latitude, longitude, fallbackIndex) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const x = Math.min(88, Math.max(12, ((lon + 122.74) / 0.36) * 76 + 12));
    const y = Math.min(88, Math.max(12, (1 - (lat - 45.42) / 0.22) * 76 + 12));
    return { x, y };
  }
  return { x: 15 + ((fallbackIndex * 13) % 72), y: 12 + ((fallbackIndex * 19) % 76) };
}

function padBurgerList(burgers, targetCount, dates, sourceUrl) {
  if (burgers.length >= targetCount) return burgers;
  const neighborhoods = ["Southeast", "Northeast", "North Portland", "Downtown", "Northwest", "Southwest", "Glendoveer"];
  const additions = Array.from({ length: targetCount - burgers.length }, (_, index) => {
    const number = burgers.length + index + 1;
    const padded = String(number).padStart(3, "0");
    const restaurant = `Burger Week Placeholder ${padded}`;
    return {
      id: `burger-${padded}`,
      restaurant,
      burger: "Burger details TBD",
      description: "Replace this generated placeholder by adding a row to the event CSV.",
      neighborhood: neighborhoods[number % neighborhoods.length],
      address: "Portland OR",
      available: dates,
      availability: dates.map((date) => ({
        date,
        dayKey: weekdayKeyForDate(date),
        dayLabel: weekdayFormatter.format(new Date(`${date}T12:00:00`)),
        hoursText: "Hours TBD",
        parsedHours: []
      })),
      hours: "Hours TBD",
      tags: [],
      restaurantPhoto: "data/photos/restaurant-placeholder.svg",
      photoAlt: "Restaurant posted burger photo placeholder",
      mapsUrl: `https://maps.apple.com/?q=${encodeURIComponent(`${restaurant} Portland OR`)}`,
      everoutUrl: sourceUrl,
      map: coordinateToMapPoint("", "", number)
    };
  });
  return [...burgers, ...additions];
}

async function loadEvents() {
  const fallback = fallbackEvent();
  try {
    const loadedEvents = {};

    await Promise.all(eventDefinitions.map(async (event) => {
      const response = await fetch(event.dataFile);
      if (!response.ok) throw new Error(`Could not load ${event.dataFile}`);

      const burgerRows = parseCsv(await response.text());
      const dates = dateRange(event.startsOn, event.endsOn);
      const sourceUrl = event.sourceUrl || officialEventUrl;
      const burgers = burgerRows
        .filter((row) => row.event_id === event.id)
        .map((row, index) => {
          const availability = availabilityFromDayHours(row, dates);
          return {
            id: row.id || `burger-${String(index + 1).padStart(3, "0")}`,
            restaurant: row.restaurant || `Burger Week Placeholder ${String(index + 1).padStart(3, "0")}`,
            burger: row.burger || "Burger details TBD",
            description: row.description || "Replace with official listed burger details.",
            neighborhood: row.neighborhood || "TBD",
            address: row.address || "Portland, OR",
            available: availability.map((entry) => entry.date),
            availability,
            hours: formatWeeklyHours(availability),
            tags: row.tags ? row.tags.split(";").filter(Boolean) : [],
            restaurantPhoto: row.restaurant_photo || "data/photos/restaurant-placeholder.svg",
            photoAlt: `${row.restaurant || "Restaurant"} burger photo`,
            mapsUrl: row.maps_url || `https://maps.apple.com/?q=${encodeURIComponent(`${row.restaurant || "Burger Week"} ${row.address || "Portland, OR"}`)}`,
            everoutUrl: row.everout_url || sourceUrl,
            map: coordinateToMapPoint(row.latitude, row.longitude, index)
          };
        });

      loadedEvents[event.id] = {
        title: event.title,
        city: event.city,
        price: event.price,
        dates,
        sourceUrl,
        burgers: padBurgerList(burgers, event.targetCount || burgers.length, dates, sourceUrl),
        reviews: []
      };
    }));

    return { ...fallback, ...loadedEvents };
  } catch {
    return fallback;
  }
}

function getEvent() {
  return events[currentEventId];
}

function supabaseConfig() {
  return window.BURGER_WEEK_CONFIG || {};
}

function hasUsableSupabaseConfig() {
  const config = supabaseConfig();
  return (
    config.authMode === "supabase" &&
    /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl || "") &&
    Boolean(config.supabaseAnonKey) &&
    !/YOUR_|PUBLIC_|ANON_KEY/.test(config.supabaseAnonKey) &&
    Boolean(window.supabase?.createClient)
  );
}

function isSupabaseReady() {
  return Boolean(supabaseClient && supabaseSession?.user);
}

function getAccount() {
  if (isSupabaseReady()) {
    const user = supabaseSession.user;
    const displayName =
      supabaseProfile?.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Burger friend";

    return {
      id: user.id,
      displayName,
      email: user.email || ""
    };
  }

  try {
    return JSON.parse(localStorage.getItem(accountStoreKey));
  } catch {
    return null;
  }
}

function setAccount(account) {
  if (account) {
    localStorage.setItem(accountStoreKey, JSON.stringify(account));
  } else {
    localStorage.removeItem(accountStoreKey);
  }
  renderAuth();
}

function setAuthStatus(message) {
  authStatusMessage = message;
  renderAuth();
}

function setReviewStatus(message = "") {
  if (!els.reviewStatus) return;
  els.reviewStatus.textContent = message;
  els.reviewStatus.hidden = !message;
}

function setFeedbackStatus(message = "", isError = false) {
  if (!els.feedbackStatus) return;
  els.feedbackStatus.textContent = message;
  els.feedbackStatus.hidden = !message;
  els.feedbackStatus.classList.toggle("is-error", isError);
}

function showAppStatus(message, isError = false) {
  if (!els.appStatus) return;
  window.clearTimeout(appStatusTimer);
  els.appStatus.textContent = message;
  els.appStatus.hidden = false;
  els.appStatus.classList.toggle("is-error", isError);
  appStatusTimer = window.setTimeout(() => {
    els.appStatus.hidden = true;
    els.appStatus.textContent = "";
    els.appStatus.classList.remove("is-error");
  }, isError ? 9000 : 4500);
}

function authErrorMessage(prefix, error) {
  const message = error?.message || "Unknown error";
  const lowerMessage = message.toLowerCase();
  const looksLikeEmailDeliveryLimit =
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("email rate") ||
    lowerMessage.includes("email address not authorized") ||
    lowerMessage.includes("over email send rate limit") ||
    lowerMessage.includes("smtp");

  if (!looksLikeEmailDeliveryLimit) return `${prefix}: ${message}`;

  return `${prefix}: ${message}. If Confirm Email is enabled, turn it off for the budget setup or configure custom SMTP in docs/SUPABASE.md.`;
}

async function resumePendingAuthAction() {
  if (openReviewAfterLogin) {
    openReviewAfterLogin = false;
    openReviewComposer();
  } else if (pendingWantBurgerId) {
    const burgerId = pendingWantBurgerId;
    pendingWantBurgerId = "";
    await toggleWant(burgerId);
  } else if (pendingHideBurgerId) {
    const burgerId = pendingHideBurgerId;
    pendingHideBurgerId = "";
    await hideBurger(burgerId);
  } else if (pendingWaitBurgerId) {
    const burgerId = pendingWaitBurgerId;
    pendingWaitBurgerId = "";
    openWaitReportDialog(burgerId);
  }
}

function defaultProfileName(user) {
  return user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Burger friend";
}

async function ensureSupabaseProfile(displayName = "") {
  if (!supabaseClient || !supabaseSession?.user) return null;

  const user = supabaseSession.user;
  const trimmedDisplayName = displayName.trim();

  if (!trimmedDisplayName) {
    const { data } = await supabaseClient.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).maybeSingle();
    if (data) {
      supabaseProfile = data;
      return data;
    }
  }

  const profile = {
    id: user.id,
    display_name: trimmedDisplayName || defaultProfileName(user)
  };

  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id, display_name, avatar_url")
    .single();

  if (error) {
    setAuthStatus(`Signed in, but profile sync failed: ${error.message}`);
    supabaseProfile = profile;
    return profile;
  }

  supabaseProfile = data;
  return data;
}

async function signedPhotoUrl(path) {
  if (!path || !supabaseClient) return "";

  const { data, error } = await supabaseClient.storage.from(supabasePhotoBucket).createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function mapSupabaseReview(row) {
  const waitTimeFromNotes = waitTimeValueFromText(row.notes || "");
  return {
    id: row.id,
    burgerId: row.food_item_id,
    reviewer: row.profiles?.display_name || "Burger friend",
    profileId: row.profile_id,
    rating: Number(row.rating),
    notes: row.notes || "",
    waitTime: row.wait_time || waitTimeFromNotes,
    photo: await signedPhotoUrl(row.photo_path),
    photoPath: row.photo_path || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadSupabaseReviews() {
  const reviewSelect = supabaseReviewWaitTimeSupported
    ? "id,event_id,food_item_id,profile_id,rating,notes,wait_time,photo_path,created_at,updated_at,profiles(display_name)"
    : "id,event_id,food_item_id,profile_id,rating,notes,photo_path,created_at,updated_at,profiles(display_name)";
  const { data, error } = await supabaseClient
    .from("reviews")
    .select(reviewSelect)
    .eq("event_id", currentEventId)
    .order("created_at", { ascending: false });

  if (error) {
    if (supabaseReviewWaitTimeSupported && supabaseMissingColumnError(error, "wait_time")) {
      supabaseReviewWaitTimeSupported = false;
      await loadSupabaseReviews();
      return;
    }
    throw error;
  }

  const mapped = await Promise.all((data || []).map(mapSupabaseReview));
  remoteReviewsByEvent[currentEventId] = mapped;
}

async function loadSupabaseWants() {
  const { data, error } = await supabaseClient
    .from("wants")
    .select("event_id,food_item_id,profile_id,created_at,profiles(display_name)")
    .eq("event_id", currentEventId);

  if (error) throw error;

  remoteWantsByEvent[currentEventId] = {};
  (data || []).forEach((want) => {
    remoteWantsByEvent[currentEventId][want.food_item_id] ||= {};
    remoteWantsByEvent[currentEventId][want.food_item_id][want.profile_id] = {
      displayName: want.profiles?.display_name || "Burger friend",
      createdAt: want.created_at
    };
  });
}

async function loadSupabaseHidden() {
  const { data, error } = await supabaseClient
    .from("hidden_food_items")
    .select("event_id,food_item_id,created_at")
    .eq("event_id", currentEventId);

  if (error) throw error;

  remoteHiddenByEvent[currentEventId] = {};
  (data || []).forEach((entry) => {
    const burger = getBurger(entry.food_item_id);
    remoteHiddenByEvent[currentEventId][entry.food_item_id] = {
      burgerId: entry.food_item_id,
      restaurant: burger.restaurant,
      burger: burger.burger,
      hiddenAt: entry.created_at
    };
  });
}

async function refreshSupabaseData() {
  if (!isSupabaseReady()) return;

  try {
    await Promise.all([loadSupabaseReviews(), loadSupabaseWants(), loadSupabaseHidden()]);
    setAuthStatus("Shared Supabase mode is active.");
  } catch (error) {
    setAuthStatus(`Supabase sync failed: ${error.message}`);
  }
}

function renderBurgerBoardState() {
  renderStats();
  renderHiddenProfileList();
  renderHypeList();
  renderBurgerList();
}

async function initializeSupabase() {
  if (!hasUsableSupabaseConfig()) {
    if (supabaseConfig().authMode === "supabase") {
      setAuthStatus("Supabase config is incomplete or the CDN client did not load. Local fallback is active.");
    }
    return;
  }

  const config = supabaseConfig();
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthStatus(`Supabase session check failed: ${error.message}`);
    return;
  }

  supabaseSession = data.session;
  if (supabaseSession) {
    await ensureSupabaseProfile();
    await refreshSupabaseData();
  } else {
    setAuthStatus("Supabase is configured. Log in with email and password, or create an account if this is your first Burger Week visit.");
  }

  supabaseClient.auth.onAuthStateChange(async (authEvent, session) => {
    supabaseSession = session;
    supabaseProfile = null;
    passwordRecoveryMode = authEvent === "PASSWORD_RECOVERY";
    if (session) {
      await ensureSupabaseProfile();
      await refreshSupabaseData();
      if (passwordRecoveryMode) {
        setAuthStatus("Password reset confirmed. Enter a new password below, then tap Log In to save it.");
        els.loginPasswordInput.value = "";
        if (!els.loginDialog.open) els.loginDialog.showModal();
      }
    } else {
      passwordRecoveryMode = false;
      remoteReviewsByEvent = {};
      remoteWantsByEvent = {};
      remoteHiddenByEvent = {};
      setAuthStatus("Signed out. Log in with email and password when you are ready.");
    }
    renderAll();
  });
}

function loadHidden() {
  try {
    return JSON.parse(localStorage.getItem(hiddenStoreKey)) || {};
  } catch {
    return {};
  }
}

function saveHidden(hidden) {
  localStorage.setItem(hiddenStoreKey, JSON.stringify(hidden));
}

function accountHiddenEntries() {
  const account = getAccount();
  if (!account) return [];
  if (isSupabaseReady()) return Object.values(remoteHiddenByEvent[currentEventId] || {});
  return Object.values(loadHidden()[currentEventId]?.[account.id] || {});
}

function accountHiddenIds() {
  const account = getAccount();
  if (!account) return new Set();
  if (isSupabaseReady()) return new Set(Object.keys(remoteHiddenByEvent[currentEventId] || {}));
  return new Set(Object.keys(loadHidden()[currentEventId]?.[account.id] || {}));
}

function setRemoteHiddenEntry(eventId, burgerId, entry) {
  remoteHiddenByEvent[eventId] ||= {};
  if (entry) {
    remoteHiddenByEvent[eventId][burgerId] = entry;
  } else {
    delete remoteHiddenByEvent[eventId][burgerId];
  }
}

async function hideBurger(burgerId) {
  const account = getAccount();
  if (!account) {
    pendingHideBurgerId = burgerId;
    els.loginDialog.showModal();
    return;
  }

  const burger = getBurger(burgerId);
  if (isSupabaseReady()) {
    const eventId = currentEventId;
    const previousEntry = remoteHiddenByEvent[eventId]?.[burgerId] || null;
    setRemoteHiddenEntry(eventId, burgerId, {
      burgerId,
      restaurant: burger.restaurant,
      burger: burger.burger,
      hiddenAt: new Date().toISOString()
    });
    renderBurgerBoardState();

    const { error } = await supabaseClient.from("hidden_food_items").insert({
      event_id: eventId,
      food_item_id: burgerId,
      profile_id: account.id
    });

    if (error && error.code !== "23505") {
      setRemoteHiddenEntry(eventId, burgerId, previousEntry);
      renderBurgerBoardState();
      setAuthStatus(`Could not hide burger: ${error.message}`);
      showAppStatus(`Could not hide burger: ${error.message}`, true);
      return;
    }

    await refreshSupabaseData();
    renderBurgerBoardState();
    return;
  }

  const hidden = loadHidden();
  hidden[currentEventId] ||= {};
  hidden[currentEventId][account.id] ||= {};
  hidden[currentEventId][account.id][burgerId] = {
    burgerId,
    restaurant: burger.restaurant,
    burger: burger.burger,
    hiddenAt: new Date().toISOString()
  };

  saveHidden(hidden);
  renderBurgerBoardState();
}

async function unhideBurger(burgerId) {
  const account = getAccount();
  if (!account) return;

  if (isSupabaseReady()) {
    const eventId = currentEventId;
    const previousEntry = remoteHiddenByEvent[eventId]?.[burgerId] || null;
    setRemoteHiddenEntry(eventId, burgerId, null);
    renderBurgerBoardState();

    const { error } = await supabaseClient
      .from("hidden_food_items")
      .delete()
      .eq("event_id", eventId)
      .eq("food_item_id", burgerId)
      .eq("profile_id", account.id);

    if (error) {
      setRemoteHiddenEntry(eventId, burgerId, previousEntry);
      renderBurgerBoardState();
      setAuthStatus(`Could not unhide burger: ${error.message}`);
      showAppStatus(`Could not unhide burger: ${error.message}`, true);
      return;
    }

    await refreshSupabaseData();
    renderBurgerBoardState();
    return;
  }

  const hidden = loadHidden();
  if (hidden[currentEventId]?.[account.id]?.[burgerId]) {
    delete hidden[currentEventId][account.id][burgerId];
  }

  if (hidden[currentEventId]?.[account.id] && !Object.keys(hidden[currentEventId][account.id]).length) {
    delete hidden[currentEventId][account.id];
  }

  saveHidden(hidden);
  renderBurgerBoardState();
}

function loadWants() {
  try {
    return JSON.parse(localStorage.getItem(wantStoreKey)) || {};
  } catch {
    return {};
  }
}

function saveWants(wants) {
  localStorage.setItem(wantStoreKey, JSON.stringify(wants));
}

function eventWants() {
  if (isSupabaseReady()) return remoteWantsByEvent[currentEventId] || {};
  return loadWants()[currentEventId] || {};
}

function burgerWantEntries(burgerId) {
  return Object.values(eventWants()[burgerId] || {});
}

function accountWantsBurger(burgerId) {
  const account = getAccount();
  if (!account) return false;
  return Boolean(eventWants()[burgerId]?.[account.id]);
}

function setRemoteWantEntry(eventId, burgerId, account, entry) {
  remoteWantsByEvent[eventId] ||= {};
  remoteWantsByEvent[eventId][burgerId] ||= {};
  if (entry) {
    remoteWantsByEvent[eventId][burgerId][account.id] = entry;
    return;
  }

  delete remoteWantsByEvent[eventId][burgerId][account.id];
  if (!Object.keys(remoteWantsByEvent[eventId][burgerId]).length) {
    delete remoteWantsByEvent[eventId][burgerId];
  }
}

async function toggleWant(burgerId) {
  const account = getAccount();
  if (!account) {
    pendingWantBurgerId = burgerId;
    els.loginDialog.showModal();
    return;
  }

  if (isSupabaseReady()) {
    const eventId = currentEventId;
    const wanted = accountWantsBurger(burgerId);
    const previousEntry = remoteWantsByEvent[eventId]?.[burgerId]?.[account.id] || null;
    setRemoteWantEntry(eventId, burgerId, account, wanted ? null : {
      displayName: account.displayName,
      createdAt: new Date().toISOString()
    });
    renderBurgerBoardState();

    const { error } = wanted
      ? await supabaseClient
          .from("wants")
          .delete()
          .eq("event_id", eventId)
          .eq("food_item_id", burgerId)
          .eq("profile_id", account.id)
      : await supabaseClient.from("wants").insert({
          event_id: eventId,
          food_item_id: burgerId,
          profile_id: account.id
        });

    if (error && error.code !== "23505") {
      setRemoteWantEntry(eventId, burgerId, account, previousEntry);
      renderBurgerBoardState();
      setAuthStatus(`Could not update want: ${error.message}`);
      showAppStatus(`Could not update want: ${error.message}`, true);
      return;
    }

    await refreshSupabaseData();
    renderBurgerBoardState();
    return;
  }

  const wants = loadWants();
  wants[currentEventId] ||= {};
  wants[currentEventId][burgerId] ||= {};

  if (wants[currentEventId][burgerId][account.id]) {
    delete wants[currentEventId][burgerId][account.id];
  } else {
    wants[currentEventId][burgerId][account.id] = {
      displayName: account.displayName,
      email: account.email,
      createdAt: new Date().toISOString()
    };
  }

  if (!Object.keys(wants[currentEventId][burgerId]).length) {
    delete wants[currentEventId][burgerId];
  }

  saveWants(wants);
  renderBurgerBoardState();
}

function renderAuth() {
  const account = getAccount();
  els.authButton.textContent = account ? account.displayName : "Log In";
  els.authButton.classList.toggle("is-logged-in", Boolean(account));
  els.reviewerInput.value = account?.displayName || "";
  if (els.authStatus) {
    const fallbackStatus = hasUsableSupabaseConfig()
      ? "Use email and password to log in. New here? Choose Create Account."
      : "Local fallback is active until config/supabase.js has your Supabase URL and publishable key. Passwords are not saved in local fallback mode.";
    els.authStatus.textContent = authStatusMessage || fallbackStatus;
  }
  renderHiddenProfileList();
}

function loadLocalReviews() {
  try {
    return JSON.parse(localStorage.getItem(reviewStoreKey)) || {};
  } catch {
    return {};
  }
}

function saveLocalReviews(allReviews) {
  localStorage.setItem(reviewStoreKey, JSON.stringify(allReviews));
}

function getBurger(id) {
  return getEvent().burgers.find((burger) => burger.id === id) || {
    id,
    restaurant: "Unknown spot",
    burger: "Unknown burger",
    neighborhood: "Unknown",
    tags: [],
    available: [],
    mapsUrl: "https://maps.apple.com/?q=Portland%20OR",
    everoutUrl: officialEventUrl
  };
}

function getReviews() {
  const storedReviews = isSupabaseReady() ? remoteReviewsByEvent[currentEventId] || [] : loadLocalReviews()[currentEventId] || [];
  return [...getEvent().reviews, ...storedReviews].map((review) => ({
    ...review,
    burger: getBurger(review.burgerId)
  }));
}

function reviewBelongsToAccount(review, account) {
  return Boolean(
    account &&
    (review.profileId === account.id || (!review.profileId && review.reviewer === account.displayName))
  );
}

function personalVisitedBurgerIds() {
  const account = getAccount();
  if (!account) return new Set();
  return new Set(getReviews().filter((review) => reviewBelongsToAccount(review, account)).map((review) => review.burgerId));
}

function burgerSearchText(burger) {
  return [
    burger.restaurant,
    burger.burger,
    burger.description,
    burger.neighborhood,
    burger.tags.join(" ")
  ].join(" ").toLowerCase();
}

function burgerMatchesActiveFilters(burger, visitedIds = personalVisitedBurgerIds()) {
  const search = filters.search.toLowerCase();
  return (
    (!search || burgerSearchText(burger).includes(search)) &&
    (filters.neighborhood === "all" || burger.neighborhood === filters.neighborhood) &&
    (!filters.openNow || burgerOpenAt(burger)) &&
    (!filters.hideVisited || !visitedIds.has(burger.id))
  );
}

function summarizeReviews(reviews) {
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return {
    reviewCount: reviews.length,
    spotCount: new Set(reviews.map((review) => review.burgerId)).size,
    avg
  };
}

function formatRating(value) {
  return Number(value).toFixed(2);
}

function accountIdFromEmail(email) {
  return `local-${email.toLowerCase()}`;
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    return `<span class="${rating >= value ? "filled" : ""}" aria-hidden="true">★</span>`;
  }).join("");
}

function hydrateFilters() {
  const event = getEvent();
  const reviews = getReviews();
  const currentArea = filters.neighborhood;
  const currentFriend = filters.friend;
  const areas = ["all", ...new Set(event.burgers.map((burger) => burger.neighborhood).filter(Boolean))].sort();
  const friends = ["all", ...new Set(reviews.map((review) => review.reviewer).filter(Boolean))].sort();

  els.neighborhoodFilter.innerHTML = areas
    .map((area) => `<option value="${escapeAttr(area)}">${area === "all" ? "All areas" : escapeHtml(area)}</option>`)
    .join("");
  els.friendFilter.innerHTML = friends
    .map((friend) => `<option value="${escapeAttr(friend)}">${friend === "all" ? "Everyone" : escapeHtml(friend)}</option>`)
    .join("");
  els.burgerSelect.innerHTML = event.burgers
    .map((burger) => `<option value="${escapeAttr(burger.id)}">${escapeHtml(burger.restaurant)} - ${escapeHtml(burger.burger)}</option>`)
    .join("");
  if (els.scheduleBurgerSelect) {
    const currentScheduleBurger = els.scheduleBurgerSelect.value;
    els.scheduleBurgerSelect.innerHTML = event.burgers
      .map((burger) => `<option value="${escapeAttr(burger.id)}">${escapeHtml(burger.restaurant)} - ${escapeHtml(burger.burger)}</option>`)
      .join("");
    if (event.burgers.some((burger) => burger.id === currentScheduleBurger)) {
      els.scheduleBurgerSelect.value = currentScheduleBurger;
    }
  }
  if (els.scheduleDateInput && !els.scheduleDateInput.value) {
    els.scheduleDateInput.value = event.dates[0] || "";
  }
  if (els.scheduleDateInput) {
    els.scheduleDateInput.min = event.dates[0] || "";
    els.scheduleDateInput.max = event.dates[event.dates.length - 1] || "";
    if (!event.dates.includes(els.scheduleDateInput.value)) {
      els.scheduleDateInput.value = event.dates[0] || "";
    }
  }

  els.neighborhoodFilter.value = areas.includes(currentArea) ? currentArea : "all";
  els.friendFilter.value = friends.includes(currentFriend) ? currentFriend : "all";
  filters.neighborhood = els.neighborhoodFilter.value;
  filters.friend = els.friendFilter.value;
}

function getFilteredReviews() {
  const search = filters.search.toLowerCase();
  const visitedIds = personalVisitedBurgerIds();
  return getReviews()
    .filter((review) => {
      const haystack = [
        review.reviewer,
        review.notes,
        waitTimeLabel(review.waitTime),
        review.burger.restaurant,
        review.burger.burger,
        review.burger.description,
        review.burger.neighborhood,
        review.burger.tags.join(" ")
      ].join(" ").toLowerCase();

      return (
        (!search || haystack.includes(search)) &&
        (filters.neighborhood === "all" || review.burger.neighborhood === filters.neighborhood) &&
        (filters.friend === "all" || review.reviewer === filters.friend) &&
        (!filters.openNow || burgerOpenAt(review.burger)) &&
        (!filters.hideVisited || !visitedIds.has(review.burgerId)) &&
        review.rating >= filters.rating
      );
    })
    .sort((a, b) => {
      if (filters.sort === "rating") return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt);
      if (filters.sort === "restaurant") return a.burger.restaurant.localeCompare(b.burger.restaurant);
      if (filters.sort === "available") return (a.burger.available[0] || "").localeCompare(b.burger.available[0] || "");
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

function renderStats() {
  const reviews = getReviews();
  const account = getAccount();
  const canShowPersonalStats = Boolean(account);
  const activeStatsScope = canShowPersonalStats ? statsScope : "group";
  const personalReviews = canShowPersonalStats ? reviews.filter((review) => reviewBelongsToAccount(review, account)) : [];
  const scopedSummary = summarizeReviews(activeStatsScope === "personal" ? personalReviews : reviews);
  const topReview = [...reviews].sort((a, b) => b.rating - a.rating)[0];
  const topSpot = topReview ? getBurger(topReview.burgerId).restaurant : "No reviews";
  const topWantedList = mostWantedBurgers(5);
  const wantedIndex = topWantedList.length ? wantedStatIndex % topWantedList.length : 0;
  const topWanted = topWantedList[wantedIndex];
  const scopeLabel = activeStatsScope === "personal" ? "Personal" : "Group";
  const scopeButtonAttributes = canShowPersonalStats
    ? `type="button" data-toggle-stats-scope aria-label="Show ${activeStatsScope === "personal" ? "group" : "personal"} stats"`
    : "";

  const stats = [
    {
      label: activeStatsScope === "personal" ? "My Reviews" : "Group Reviews",
      value: scopedSummary.reviewCount,
      detail: scopeLabel,
      interactive: canShowPersonalStats,
      attributes: scopeButtonAttributes
    },
    {
      label: activeStatsScope === "personal" ? "My Spots Tried" : "Group Spots Tried",
      value: scopedSummary.spotCount,
      detail: scopeLabel,
      interactive: canShowPersonalStats,
      attributes: scopeButtonAttributes
    },
    {
      label: activeStatsScope === "personal" ? "My Avg Rating" : "Group Avg Rating",
      value: scopedSummary.avg ? formatRating(scopedSummary.avg) : "0.00",
      detail: scopeLabel,
      interactive: canShowPersonalStats,
      attributes: scopeButtonAttributes
    },
    {
      label: "Top Right Now",
      value: topSpot
    },
    {
      label: "Most Wanted",
      value: topWanted ? topWanted.burger.restaurant : "No hype yet",
      detail: topWanted ? `#${wantedIndex + 1} of ${topWantedList.length} · ${topWanted.count} want${topWanted.count === 1 ? "" : "s"}` : "",
      interactive: topWantedList.length > 1,
      attributes: topWantedList.length > 1
        ? `type="button" data-cycle-most-wanted data-wanted-count="${topWantedList.length}" aria-label="Show next most wanted burger"`
        : ""
    }
  ];

  els.statsGrid.innerHTML = stats
    .map((stat) => `
      <${stat.interactive ? "button" : "article"} class="stat-card ${stat.interactive ? "stat-button" : ""}" ${stat.attributes || ""}>
        <span>${escapeHtml(stat.label)}</span>
        <strong>${escapeHtml(stat.value)}</strong>
        ${stat.detail ? `<small>${escapeHtml(stat.detail)}</small>` : ""}
      </${stat.interactive ? "button" : "article"}>
    `)
    .join("");
}

function renderControlsPanel() {
  if (!els.controlsBand || !els.controlsToggle || !els.controlsContent) return;
  els.controlsBand.classList.toggle("is-collapsed", controlsCollapsed);
  els.controlsContent.hidden = controlsCollapsed;
  els.controlsToggle.setAttribute("aria-expanded", String(!controlsCollapsed));
  els.controlsToggle.setAttribute("aria-label", controlsCollapsed ? "Expand stats and filters" : "Collapse stats and filters");
  els.controlsToggle.querySelector("span").textContent = controlsCollapsed ? "+" : "-";
}

function reviewImage(review) {
  const official = review.burger.restaurantPhoto;
  const showOfficial = photoViewByReview[review.id] === "official";
  if (showOfficial && official) {
    return { src: official, alt: review.burger.photoAlt || `${review.burger.restaurant} official burger photo`, source: "Restaurant photo" };
  }
  if (review.photo) {
    return { src: review.photo, alt: `Burger reviewed by ${review.reviewer}`, source: "Friend photo" };
  }
  if (official) {
    return { src: official, alt: review.burger.photoAlt || `${review.burger.restaurant} official burger photo`, source: "Restaurant photo" };
  }
  return null;
}

function canCurrentUserEditReview(review) {
  const account = getAccount();
  return Boolean(account && review.profileId === account.id);
}

function displayTags(burger) {
  return (burger.tags || []).filter((tag) => !["source-backed", "placeholder"].includes(tag.toLowerCase()));
}

function renderFeed() {
  const reviews = getFilteredReviews();
  els.resultCount.textContent = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

  if (!reviews.length) {
    els.reviewGrid.innerHTML = $("#emptyTemplate").innerHTML;
    return;
  }

  els.reviewGrid.innerHTML = reviews
    .map((review) => {
      const image = reviewImage(review);
      const hasToggle = Boolean(review.photo && review.burger.restaurantPhoto);
      const placeholderArt = image?.src?.includes("restaurant-placeholder.svg");
      const deleteBusy = reviewActionBusy("delete", review.id);
      const editBusy = reviewActionBusy("edit", review.id);
      const showingDescription = reviewTextViewByReview[review.id] === "description";
      const reviewCopy = showingDescription ? review.burger.description || "No restaurant description." : review.notes || "";
      const imageCaption = image ? `${review.burger.restaurant} - ${review.burger.burger} (${image.source})` : "";
      return `
        <article class="review-card">
          <div class="photo-frame ${image ? "review-photo-button" : "placeholder-photo"} ${placeholderArt ? "placeholder-art" : ""}" ${image ? `role="button" tabindex="0" data-preview-review-photo="${escapeAttr(image.src)}" data-preview-alt="${escapeAttr(image.alt)}" data-preview-caption="${escapeAttr(imageCaption)}" aria-label="Open photo preview for ${escapeAttr(review.burger.restaurant)}"` : ""}>
            ${image ? `<img src="${escapeAttr(image.src)}" alt="${escapeAttr(image.alt)}">` : `<span>${escapeHtml(review.burger.restaurant.slice(0, 2).toUpperCase())}</span>`}
            ${hasToggle ? `<button class="photo-toggle" type="button" data-photo-toggle="${escapeAttr(review.id)}" aria-label="Toggle restaurant photo">▣</button>` : ""}
            ${image ? `<span class="photo-source">${escapeHtml(image.source)}</span>` : ""}
          </div>
          <div class="review-body">
            <div class="review-meta">
              <button class="reviewer-filter" type="button" data-friend-filter="${escapeAttr(review.reviewer)}">${escapeHtml(review.reviewer)}</button>
              <time datetime="${escapeAttr(review.createdAt)}">${escapeHtml(timestampFormatter.format(new Date(review.createdAt)))}</time>
            </div>
            <div class="review-card-title">
              <div>
                <h3>${escapeHtml(review.burger.restaurant)}</h3>
                <button class="burger-name burger-name-link" type="button" data-jump-burger="${escapeAttr(review.burgerId)}">
                  ${escapeHtml(review.burger.burger)}
                </button>
              </div>
              <div class="quick-links" aria-label="Review links">
                <a href="${escapeAttr(review.burger.mapsUrl)}" target="_blank" rel="noreferrer" aria-label="Open restaurant location in maps">⌖</a>
                <a href="${escapeAttr(review.burger.everoutUrl)}" target="_blank" rel="noreferrer" aria-label="Open burger listing on EverOut">↗</a>
              </div>
            </div>
            <div class="rating-row" aria-label="${formatRating(review.rating)} out of 5 stars">
              ${renderStars(review.rating)}
              <b>${formatRating(review.rating)}</b>
              ${review.waitTime ? `<span class="wait-pill">${escapeHtml(waitTimeLabel(review.waitTime))}</span>` : ""}
            </div>
            <div class="review-copy-tools">
              <button class="text-toggle ${!showingDescription ? "is-active" : ""}" type="button" data-review-copy-toggle="${escapeAttr(review.id)}" data-copy-view="notes">Review</button>
              <button class="text-toggle ${showingDescription ? "is-active" : ""}" type="button" data-review-copy-toggle="${escapeAttr(review.id)}" data-copy-view="description">Burger</button>
            </div>
            <p class="review-copy">${escapeHtml(reviewCopy)}</p>
            <div class="tag-row">
              <span>${escapeHtml(review.burger.neighborhood)}</span>
              ${displayTags(review.burger).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            ${canCurrentUserEditReview(review) ? `
              <div class="review-actions">
                <button class="delete-review-button ${deleteBusy ? "is-loading" : ""}" type="button" data-delete-review="${escapeAttr(review.id)}" aria-label="Delete your review for ${escapeAttr(review.burger.restaurant)}" ${buttonBusyAttributes(deleteBusy)}>
                  ${loadingButtonContent(deleteBusy ? "Deleting..." : "Delete Post")}
                </button>
                <button class="ghost-button compact-button ${editBusy ? "is-loading" : ""}" type="button" data-edit-review="${escapeAttr(review.id)}" ${buttonBusyAttributes(editBusy)}>
                  ${loadingButtonContent(editBusy ? "Opening..." : "Update Review")}
                </button>
              </div>
            ` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function burgerReviewStats(burgerId) {
  const reviews = getReviews().filter((review) => review.burgerId === burgerId);
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return { count: reviews.length, avg };
}

function mostWantedBurgers(limit = 5) {
  const hiddenIds = accountHiddenIds();
  return getEvent().burgers
    .filter((burger) => !hiddenIds.has(burger.id))
    .map((burger) => {
      const wants = burgerWantEntries(burger.id);
      return {
        burger,
        count: wants.length,
        names: wants.map((want) => want.displayName).filter(Boolean)
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.burger.restaurant.localeCompare(b.burger.restaurant))
    .slice(0, limit);
}

function renderHypeList() {
  const hype = mostWantedBurgers(5);
  els.hypeList.classList.toggle("is-collapsed", hypeCollapsed);

  const heading = `
    <div class="hype-heading">
      <div>
        <h3>Hype List</h3>
        <span>${hype.length ? "Most wished-for burgers" : "No wishes yet"}</span>
      </div>
      <button class="hype-toggle" type="button" data-toggle-hype aria-expanded="${String(!hypeCollapsed)}" aria-label="${hypeCollapsed ? "Expand Hype List" : "Collapse Hype List"}">
        <span aria-hidden="true">${hypeCollapsed ? "+" : "-"}</span>
      </button>
    </div>
  `;

  if (hypeCollapsed) {
    els.hypeList.innerHTML = heading;
    return;
  }

  if (!hype.length) {
    els.hypeList.innerHTML = `
      ${heading}
      <article class="hype-empty">
        <span>No hype yet. Tap a Want button on the Burger Board to start a list.</span>
      </article>
    `;
    return;
  }

  els.hypeList.innerHTML = `
    ${heading}
    <div class="hype-grid">
      ${hype.map((item, index) => `
        <button class="hype-card" type="button" data-jump-burger="${escapeAttr(item.burger.id)}">
          <span class="hype-rank">#${index + 1}</span>
          <div>
            <strong>${escapeHtml(item.burger.restaurant)}</strong>
            <p>${escapeHtml(item.burger.burger)}</p>
            <small>${escapeHtml(item.names.join(", "))}</small>
          </div>
          <b>${item.count}</b>
        </button>
      `).join("")}
    </div>
  `;
}

function renderHiddenProfileList() {
  if (!els.hiddenList || !els.hiddenCount || !events[currentEventId]) return;

  const account = getAccount();
  if (!account) {
    els.hiddenCount.textContent = "Log in";
    els.hiddenList.innerHTML = `<p class="profile-empty">Log in to see your hidden burgers.</p>`;
    return;
  }

  const hidden = accountHiddenEntries().sort((a, b) => a.restaurant.localeCompare(b.restaurant));
  els.hiddenCount.textContent = `${hidden.length} hidden`;
  if (!hidden.length) {
    els.hiddenList.innerHTML = `<p class="profile-empty">Nothing hidden yet.</p>`;
    return;
  }

  els.hiddenList.innerHTML = hidden
    .map((entry) => `
      <article class="hidden-item">
        <div>
          <strong>${escapeHtml(entry.restaurant)}</strong>
          <span>${escapeHtml(entry.burger)}</span>
        </div>
        <button class="ghost-button compact-button" type="button" data-unhide-burger="${escapeAttr(entry.burgerId)}">Unhide</button>
      </article>
    `)
    .join("");
}

function renderBurgerList() {
  const event = getEvent();
  const hiddenIds = accountHiddenIds();
  const visibleUnhiddenBurgers = event.burgers.filter((burger) => !hiddenIds.has(burger.id));
  const visitedIds = personalVisitedBurgerIds();
  const visibleBurgers = visibleUnhiddenBurgers.filter((burger) => burgerMatchesActiveFilters(burger, visitedIds));

  if (!visibleUnhiddenBurgers.length) {
    els.burgerList.innerHTML = `
      <div class="empty-state">
        <h3>No visible burgers left.</h3>
        <p>Open your profile from the top bar to unhide burgers.</p>
      </div>
    `;
    return;
  }

  if (!visibleBurgers.length) {
    els.burgerList.innerHTML = `
      <div class="empty-state">
        <h3>No burgers match the current filters.</h3>
        <p>Try clearing Open now, Hide visited, search, or area filters.</p>
      </div>
    `;
    return;
  }

  els.burgerList.innerHTML = visibleBurgers
    .map((burger) => {
      const stats = burgerReviewStats(burger.id);
      const wantCount = burgerWantEntries(burger.id).length;
      const wanted = accountWantsBurger(burger.id);
      const visibleTags = displayTags(burger);
      const placeholderArt = burger.restaurantPhoto?.includes("restaurant-placeholder.svg");
      const waitReport = latestWaitReport(burger.id);
      const availability = burger.availability?.length
        ? burger.availability.map((entry) => `<span><b>${escapeHtml(entry.dayLabel)}</b> ${escapeHtml(entry.hoursText)}</span>`).join("")
        : `<span>${escapeHtml(burger.hours || "Hours TBD")}</span>`;
      return `
        <article class="burger-row" id="burger-row-${escapeAttr(burger.id)}" data-burger-row="${escapeAttr(burger.id)}" tabindex="-1">
          <button class="burger-photo photo-frame ${placeholderArt ? "placeholder-art" : ""}" type="button" data-preview-photo="${escapeAttr(burger.restaurantPhoto)}" data-preview-alt="${escapeAttr(burger.photoAlt || `${burger.restaurant} burger photo`)}" data-preview-caption="${escapeAttr(`${burger.restaurant} - ${burger.burger}`)}" aria-label="Open photo preview for ${escapeAttr(burger.restaurant)}">
            <img src="${escapeAttr(burger.restaurantPhoto)}" alt="${escapeAttr(burger.photoAlt || `${burger.restaurant} burger photo`)}">
          </button>
          <div class="burger-main">
            <div class="burger-title-row">
              <div>
                <h3>${escapeHtml(burger.restaurant)}</h3>
                <p>${escapeHtml(burger.burger)}</p>
              </div>
              <div class="quick-links" aria-label="Burger links">
                <a href="${escapeAttr(burger.mapsUrl)}" target="_blank" rel="noreferrer" aria-label="Open restaurant location in maps">⌖</a>
                <a href="${escapeAttr(burger.everoutUrl)}" target="_blank" rel="noreferrer" aria-label="Open burger listing on EverOut">↗</a>
              </div>
            </div>
            <p class="burger-description">${escapeHtml(burger.description || "")}</p>
            <div class="availability-block availability-button" role="button" tabindex="0" data-report-wait="${escapeAttr(burger.id)}" aria-label="Report wait time for ${escapeAttr(burger.restaurant)}">
              <h4>Available</h4>
              <div class="availability-list">
                ${availability}
              </div>
              ${waitReport ? `
                <div class="wait-report">
                  <span class="wait-report-copy">
                    <b>${escapeHtml(waitReport.reporter)} reported ${escapeHtml(waitTimeLabel(waitReport.waitTime))}</b>
                    ${waitReport.note ? `<span>${escapeHtml(waitReport.note)}</span>` : ""}
                  </span>
                  <button class="delete-wait-report" type="button" data-delete-wait-report="${escapeAttr(burger.id)}">Delete Time</button>
                </div>
              ` : ""}
            </div>
            <div class="tag-row">
              <span>${escapeHtml(burger.neighborhood)}</span>
              ${visibleTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="burger-actions">
            <button class="want-button ${wanted ? "is-wanted" : ""}" type="button" data-want-burger="${escapeAttr(burger.id)}" aria-pressed="${wanted}" aria-label="${wanted ? "Remove want for" : "Want"} ${escapeAttr(burger.restaurant)}">
              <span aria-hidden="true">${wanted ? "♥" : "♡"}</span>
              <b>${wanted ? "Wanted" : "Want"}</b>
              <small>${wantCount} want${wantCount === 1 ? "" : "s"}</small>
            </button>
            <button class="hide-button" type="button" data-hide-burger="${escapeAttr(burger.id)}" aria-label="Hide ${escapeAttr(burger.restaurant)}">
              <span aria-hidden="true">⊘</span>
              <b>Hide</b>
              <small>Skip list</small>
            </button>
            <div class="score-pill" aria-label="${formatRating(stats.avg)} average from ${stats.count} reviews">
              <span>${stats.count ? formatRating(stats.avg) : "-"}</span>
              <small>${stats.count} review${stats.count === 1 ? "" : "s"}</small>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMap() {
  const event = getEvent();
  els.mapPins.innerHTML = `
    <span class="river" aria-hidden="true"></span>
    ${event.burgers.map((burger) => `
      <a class="pin" style="left:${burger.map.x}%;top:${burger.map.y}%;" href="${escapeAttr(burger.mapsUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeAttr(burger.restaurant)} map link">
        ${escapeHtml(burger.restaurant.charAt(0))}
      </a>
    `).join("")}
  `;
  els.mapList.innerHTML = event.burgers
    .slice(0, 24)
    .map((burger) => `
      <article>
        <strong>${escapeHtml(burger.restaurant)}</strong>
        <span>${escapeHtml(burger.neighborhood)}</span>
      </article>
    `)
    .join("");
}

function renderSchedule() {
  if (!els.scheduleList) return;
  const account = getAccount();
  if (!account) {
    els.scheduleList.innerHTML = `
      <div class="empty-state">
        <h3>Log in to build your schedule.</h3>
        <p>Planned and visited stops stay tied to your account on this device.</p>
      </div>
    `;
    return;
  }

  const reviewEntries = getReviews()
    .filter((review) => reviewBelongsToAccount(review, account))
    .map((review) => {
      const timestamp = dateTimePartsFromTimestamp(review.createdAt);
      const reviewNote = stripWaitTimeFallback(review.notes || "");
      return {
        id: `review-${review.id}`,
        eventId: currentEventId,
        burgerId: review.burgerId,
        profileId: account.id,
        displayName: account.displayName,
        date: timestamp.date,
        time: timestamp.time,
        sortKey: timestamp.sortKey || review.createdAt || "",
        status: "reviewed",
        source: "review",
        rating: review.rating,
        waitTime: review.waitTime,
        note: reviewNote ? `Review posted: ${reviewNote}` : "",
        burger: review.burger
      };
    })
    .filter((entry) => entry.date && entry.time);

  const reviewedKeys = new Set(reviewEntries.map((entry) => `${entry.burgerId}:${entry.date}`));
  const manualEntries = accountScheduleEntries()
    .filter((entry) => !(entry.status === "visited" && reviewedKeys.has(`${entry.burgerId}:${entry.date}`)))
    .map((entry) => ({
      ...entry,
      sortKey: `${entry.date}T${entry.time}`,
      source: "manual",
      burger: getBurger(entry.burgerId)
    }));
  const entries = [...reviewEntries, ...manualEntries]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  if (!entries.length) {
    els.scheduleList.innerHTML = `
      <div class="empty-state">
        <h3>No stops scheduled yet.</h3>
        <p>Add a place you want to reach later, or post a review to log a visit automatically.</p>
      </div>
    `;
    return;
  }

  els.scheduleList.innerHTML = entries
    .map((entry) => {
      const statusLabel = entry.source === "review"
        ? "Reviewed"
        : entry.status === "visited" ? "Visited" : "Planned";
      const statusClass = entry.source === "review" || entry.status === "visited" ? "is-visited" : "";
      const reviewDetail = entry.source === "review"
        ? [
            `Rated ${formatRating(entry.rating)}`,
            waitTimeLabel(entry.waitTime)
          ].filter(Boolean).join(" · ")
        : "";
      return `
        <article class="schedule-item">
          <time datetime="${escapeAttr(`${entry.date}T${entry.time}`)}">
            ${escapeHtml(dayFormatter.format(new Date(`${entry.date}T12:00:00`)))} · ${escapeHtml(entry.time)}
          </time>
          <div>
            <strong>${escapeHtml(entry.burger.restaurant)}</strong>
            <span>${escapeHtml(entry.burger.burger)}</span>
            ${reviewDetail ? `<small>${escapeHtml(reviewDetail)}</small>` : ""}
            ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
          </div>
          <span class="schedule-status ${statusClass}">${statusLabel}</span>
          ${entry.source === "manual"
            ? `<button class="ghost-button compact-button" type="button" data-delete-schedule="${escapeAttr(entry.id)}">Remove</button>`
            : `<span class="schedule-source">From review</span>`}
        </article>
      `;
    })
    .join("");
}

function renderStarInput() {
  const values = Array.from({ length: 21 }, (_, index) => index * 0.25);
  els.ratingOutput.value = formatRating(currentRating);
  els.ratingInput.value = String(currentRating);
  els.starInput.innerHTML = values
    .map((value) => `
      <button type="button" class="${value === currentRating ? "selected" : ""}" data-rating="${value}" aria-label="${formatRating(value)} out of 5">
        ${formatRating(value)}
      </button>
    `)
    .join("");
}

function renderAll() {
  hydrateFilters();
  renderAuth();
  renderControlsPanel();
  renderStats();
  renderFeed();
  renderHypeList();
  renderBurgerList();
  renderMap();
  renderSchedule();
  renderStarInput();
  updateBackToSectionButton();
}

function showView(viewName) {
  currentViewName = viewName;
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.view === viewName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === `${viewName}View`));
  updateBackToSectionButton();
}

function currentBackToSectionTarget() {
  if (currentViewName === "feed") return $("#feedTitle");
  if (currentViewName === "burgers") return $("#burgersTitle");
  return null;
}

function updateBackToSectionButton() {
  if (!els.backToSection) return;

  const target = currentBackToSectionTarget();
  const shouldShow = Boolean(target && target.getBoundingClientRect().top < -80);
  els.backToSection.hidden = !shouldShow;
  els.backToSection.classList.toggle("is-visible", shouldShow);

  if (target) {
    els.backToSection.setAttribute("aria-label", `Back to ${target.textContent.trim()} heading`);
  }
}

function scrollToCurrentSectionHeading() {
  const target = currentBackToSectionTarget();
  if (!target) return;

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    target.focus({ preventScroll: true });
    updateBackToSectionButton();
  }, 350);
}

function jumpToBurger(burgerId) {
  showView("burgers");
  requestAnimationFrame(() => {
    const row = document.getElementById(`burger-row-${burgerId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "start" });
    row.focus({ preventScroll: true });
  });
}

function openImageDialog({ src, alt, caption }) {
  if (!src || !els.imageDialog || !els.imageDialogPhoto || !els.imageDialogCaption) return;
  els.imageDialogPhoto.src = src;
  els.imageDialogPhoto.alt = alt || caption || "Burger photo";
  els.imageDialogCaption.textContent = caption || "";
  els.imageDialog.showModal();
}

function openWaitReportDialog(burgerId) {
  const account = getAccount();
  if (!account) {
    pendingWaitBurgerId = burgerId;
    els.loginDialog.showModal();
    return;
  }

  const burger = getBurger(burgerId);
  const report = latestWaitReport(burgerId);
  activeWaitBurgerId = burgerId;
  els.waitBurgerName.textContent = `${burger.restaurant} - ${burger.burger}`;
  els.waitReportSelect.value = report?.waitTime || "standard";
  els.waitReportNoteInput.value = report?.note || "";
  els.waitDialog.showModal();
}

function closeWaitReportDialog() {
  activeWaitBurgerId = "";
  if (els.waitDialog?.open) els.waitDialog.close();
  els.waitForm.reset();
}

function closeImageDialog() {
  if (!els.imageDialog?.open) return;
  els.imageDialog.close();
  els.imageDialogPhoto.removeAttribute("src");
  els.imageDialogPhoto.alt = "";
  els.imageDialogCaption.textContent = "";
}

function readPhoto(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not prepare photo for upload."));
      }
    }, type, quality);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image format could not be read by the browser."));
    };
    image.src = url;
  });
}

async function bitmapFromFile(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      return loadImageFromFile(file);
    }
  }
  return loadImageFromFile(file);
}

async function prepareReviewPhotoFile(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for your review photo.");
  }

  const bitmap = await bitmapFromFile(file);
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  if (!width || !height) throw new Error("Could not read the selected image.");

  const scale = Math.min(1, reviewPhotoMaxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (typeof bitmap.close === "function") bitmap.close();

  const blob = await canvasToBlob(canvas, "image/jpeg", reviewPhotoJpegQuality);
  return new File([blob], "burger-review-photo.jpg", {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

function safeFileName(fileName = "burger-photo") {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "burger-photo";
}

async function uploadSupabaseReviewPhoto(file, reviewId, shouldReplace = false) {
  if (!file || !isSupabaseReady()) return "";

  const preparedFile = await prepareReviewPhotoFile(file);
  const extension = safeFileName(preparedFile.name).split(".").pop() || "jpg";
  const path = `${supabaseSession.user.id}/${currentEventId}/${reviewId}.${extension}`;
  const uploadBody = await preparedFile.arrayBuffer();
  const uploadOptions = {
    cacheControl: "3600",
    contentType: "image/jpeg"
  };
  if (shouldReplace) uploadOptions.upsert = true;

  const { error } = await supabaseClient.storage.from(supabasePhotoBucket).upload(path, uploadBody, uploadOptions);

  if (error) throw error;
  return path;
}

async function deleteReview(reviewId) {
  if (reviewActionBusy("delete", reviewId)) return;

  const account = getAccount();
  if (!account) return;

  const review = getReviews().find((entry) => entry.id === reviewId);
  if (!review || !canCurrentUserEditReview(review)) {
    showAppStatus("You can only delete reviews you posted.", true);
    return;
  }

  if (!window.confirm(`Delete your review for ${review.burger.restaurant}?`)) return;

  setReviewActionBusy("delete", reviewId, true);

  try {
    if (isSupabaseReady()) {
      const { error } = await supabaseClient
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("profile_id", account.id);

      if (error) throw error;

      if (review.photoPath) {
        await supabaseClient.storage.from(supabasePhotoBucket).remove([review.photoPath]);
      }

      await refreshSupabaseData();
      renderAll();
      showAppStatus("Review deleted.");
      return;
    }

    const allReviews = loadLocalReviews();
    allReviews[currentEventId] = (allReviews[currentEventId] || []).filter((entry) => !(entry.id === reviewId && entry.profileId === account.id));
    saveLocalReviews(allReviews);
    renderAll();
    showAppStatus("Review deleted.");
  } catch (error) {
    setAuthStatus(`Could not delete review: ${error.message}`);
    showAppStatus(`Could not delete review: ${error.message}`, true);
  } finally {
    setReviewActionBusy("delete", reviewId, false);
  }
}

async function attachSupabaseReviewPhoto(reviewId, file, previousPhotoPath = "") {
  const photoPath = await uploadSupabaseReviewPhoto(file, reviewId, Boolean(previousPhotoPath));
  if (!photoPath) return "";

  const { error } = await supabaseClient
    .from("reviews")
    .update({ photo_path: photoPath, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("profile_id", supabaseSession.user.id);

  if (error) throw error;
  if (previousPhotoPath && previousPhotoPath !== photoPath) {
    await supabaseClient.storage.from(supabasePhotoBucket).remove([previousPhotoPath]);
  }
  return photoPath;
}

function setReviewFormMode(review = null) {
  const isEditing = Boolean(review);
  activeReviewEditId = review?.id || "";
  els.reviewDialogTitle.textContent = isEditing ? "Update Review" : "Add a Review";
  els.postReviewButton.dataset.loadingLabel = isEditing ? "Updating..." : "Posting...";
  delete els.postReviewButton.dataset.defaultLabel;
  const buttonLabel = els.postReviewButton.querySelector(".button-label");
  if (buttonLabel) buttonLabel.textContent = isEditing ? "Update Review" : "Post Review";

  if (isEditing) {
    currentRating = Number(review.rating) || 0;
    els.burgerSelect.value = review.burgerId;
    els.ratingInput.value = String(currentRating);
    els.waitTimeInput.value = review.waitTime || "";
    els.reviewForm.elements.notes.value = stripWaitTimeFallback(review.notes || "");
    els.photoInput.value = "";
    renderStarInput();
    setReviewStatus("");
    return;
  }

  els.reviewForm.reset();
  currentRating = 5;
  els.waitTimeInput.value = "";
  renderStarInput();
  setReviewStatus("");
}

function openReviewComposer() {
  const account = getAccount();
  if (!account) {
    openReviewAfterLogin = true;
    els.loginDialog.showModal();
    return;
  }
  setReviewFormMode();
  els.reviewerInput.value = account.displayName;
  els.dialog.showModal();
}

function openReviewEditor(reviewId) {
  const account = getAccount();
  if (!account) {
    openReviewAfterLogin = true;
    els.loginDialog.showModal();
    return;
  }

  const review = getReviews().find((entry) => entry.id === reviewId);
  if (!review || !canCurrentUserEditReview(review)) {
    showAppStatus("You can only update reviews you posted.", true);
    return;
  }

  setReviewFormMode(review);
  els.reviewerInput.value = account.displayName;
  els.dialog.showModal();
}

function resetFilters() {
  filters = { search: "", neighborhood: "all", friend: "all", rating: 0, sort: "recent", openNow: false, hideVisited: false };
  els.searchInput.value = "";
  els.ratingFilter.value = "0";
  els.sortSelect.value = "recent";
  if (els.openNowFilter) els.openNowFilter.checked = false;
  if (els.hideVisitedFilter) els.hideVisitedFilter.checked = false;
}

function renderFilteredViews() {
  renderFeed();
  renderBurgerList();
}

els.searchInput.addEventListener("input", (event) => {
  filters.search = event.target.value;
  renderFilteredViews();
});

els.neighborhoodFilter.addEventListener("change", (event) => {
  filters.neighborhood = event.target.value;
  renderFilteredViews();
});

els.friendFilter.addEventListener("change", (event) => {
  filters.friend = event.target.value;
  renderFeed();
});

els.ratingFilter.addEventListener("change", (event) => {
  filters.rating = Number(event.target.value);
  renderFeed();
});

els.sortSelect.addEventListener("change", (event) => {
  filters.sort = event.target.value;
  renderFeed();
});

els.openNowFilter?.addEventListener("change", (event) => {
  filters.openNow = event.target.checked;
  renderFilteredViews();
});

els.hideVisitedFilter?.addEventListener("change", (event) => {
  filters.hideVisited = event.target.checked;
  renderFilteredViews();
});

els.tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
window.addEventListener("scroll", updateBackToSectionButton, { passive: true });
window.addEventListener("resize", updateBackToSectionButton);
els.backToSection?.addEventListener("click", scrollToCurrentSectionHeading);

els.controlsToggle.addEventListener("click", () => {
  controlsCollapsed = !controlsCollapsed;
  renderControlsPanel();
});

els.statsGrid.addEventListener("click", (event) => {
  const scopeButton = event.target.closest("[data-toggle-stats-scope]");
  const wantedButton = event.target.closest("[data-cycle-most-wanted]");

  if (scopeButton) {
    statsScope = statsScope === "personal" ? "group" : "personal";
    renderStats();
    return;
  }

  if (wantedButton) {
    const wantedCount = Number(wantedButton.dataset.wantedCount || 0);
    if (wantedCount > 1) {
      wantedStatIndex = (wantedStatIndex + 1) % wantedCount;
      renderStats();
    }
  }
});

els.eventPicker.addEventListener("change", async (event) => {
  currentEventId = event.target.value;
  wantedStatIndex = 0;
  resetFilters();
  await refreshSupabaseData();
  renderAll();
});

els.openComposer.addEventListener("click", openReviewComposer);
els.closeComposer.addEventListener("click", () => els.dialog.close());
els.authButton.addEventListener("click", () => {
  const account = getAccount();
  els.loginNameInput.value = account?.displayName || "";
  els.loginEmailInput.value = account?.email || "";
  els.loginPasswordInput.value = "";
  els.loginDialog.showModal();
});
els.closeLogin.addEventListener("click", () => els.loginDialog.close());

els.feedbackButton?.addEventListener("click", openFeedbackDialog);
els.closeFeedbackDialog?.addEventListener("click", closeFeedbackDialog);
els.cancelFeedback?.addEventListener("click", closeFeedbackDialog);
els.feedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (feedbackSubmitting) return;

  const account = getAccount();
  const form = new FormData(els.feedbackForm);
  const message = form.get("message").trim();
  const feedbackType = form.get("feedbackType") || "bug";

  if (!message) {
    setFeedbackStatus("Add a short note before sending feedback.", true);
    return;
  }

  if (supabaseClient && !isSupabaseReady()) {
    setFeedbackStatus("Log in first so feedback can be sent.", true);
    return;
  }

  const feedbackId = crypto.randomUUID();
  const report = {
    id: feedbackId,
    eventId: currentEventId,
    profileId: account?.id || null,
    displayName: account?.displayName || "Anonymous",
    email: account?.email || "",
    feedbackType,
    message,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    createdAt: new Date().toISOString()
  };

  feedbackSubmitting = true;
  setButtonLoading(els.submitFeedbackButton, true, els.submitFeedbackButton?.dataset.loadingLabel || "Sending...");
  setFeedbackStatus("");

  try {
    if (isSupabaseReady()) {
      const { error } = await supabaseClient.from("feedback_reports").insert({
        id: report.id,
        event_id: report.eventId,
        profile_id: report.profileId,
        display_name: report.displayName,
        email: report.email,
        feedback_type: report.feedbackType,
        message: report.message,
        page_url: report.pageUrl,
        user_agent: report.userAgent,
        created_at: report.createdAt
      });

      if (error) throw error;
      closeFeedbackDialog();
      showAppStatus("Feedback sent. Thank you.");
      return;
    }

    saveLocalFeedbackReport(report);
    closeFeedbackDialog();
    showAppStatus("Feedback saved locally. Supabase is not connected, so it was not sent.");
  } catch (error) {
    const help = " Apply docs/supabase-feedback-reports-migration.sql, then make sure feedback_reports is exposed to the Data API.";
    setFeedbackStatus(`Could not send feedback: ${error.message}.${help}`, true);
    showAppStatus(`Could not send feedback: ${error.message}`, true);
  } finally {
    feedbackSubmitting = false;
    setButtonLoading(els.submitFeedbackButton, false);
  }
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.loginForm);
  const email = form.get("email").trim().toLowerCase();
  const displayName = form.get("displayName").trim();
  const password = form.get("password") || "";
  const intent = event.submitter?.value || "login";

  if (supabaseClient) {
    if (isSupabaseReady()) {
      if (passwordRecoveryMode) {
        if (!password || password.length < 6) {
          setAuthStatus("Enter a new password with at least 6 characters, then tap Log In to save it.");
          return;
        }

        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) {
          setAuthStatus(`Could not update password: ${error.message}`);
          return;
        }

        passwordRecoveryMode = false;
        await ensureSupabaseProfile(displayName);
        await refreshSupabaseData();
        setAuthStatus("Password updated. You are signed in.");
        els.loginDialog.close();
        els.loginForm.reset();
        renderAll();
        await resumePendingAuthAction();
        return;
      }

      await ensureSupabaseProfile(displayName);
      await refreshSupabaseData();
      setAuthStatus(displayName ? `Display name updated to ${displayName}.` : "You are already signed in.");
      els.loginDialog.close();
      renderAll();
      return;
    }

    if (!password || password.length < 6) {
      setAuthStatus("Enter the password for this Burger Week account. Passwords must be at least 6 characters.");
      return;
    }

    if (intent === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0]
          },
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`
        }
      });

      if (error) {
        setAuthStatus(authErrorMessage("Could not create account", error));
        return;
      }

      if (!data.session) {
        setAuthStatus(`Account created for ${email}. Check your email to confirm it, then return here and log in with your password.`);
        return;
      }

      supabaseSession = data.session;
      await ensureSupabaseProfile(displayName);
      await refreshSupabaseData();
      setAuthStatus(`Account created. You are signed in as ${getAccount()?.displayName || email}.`);
      els.loginDialog.close();
      els.loginForm.reset();
      renderAll();
      await resumePendingAuthAction();
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthStatus(`Login failed: ${error.message}`);
      return;
    }

    supabaseSession = data.session;
    await ensureSupabaseProfile(displayName);
    await refreshSupabaseData();
    setAuthStatus(`Signed in as ${getAccount()?.displayName || email}.`);
    els.loginDialog.close();
    els.loginPasswordInput.value = "";
    renderAll();
    await resumePendingAuthAction();
    return;
  }

  setAccount({
    id: accountIdFromEmail(email),
    displayName: displayName || email.split("@")[0],
    email
  });
  els.loginDialog.close();
  renderAll();
  await resumePendingAuthAction();
});

els.resetPasswordButton.addEventListener("click", async () => {
  const email = els.loginEmailInput.value.trim().toLowerCase();
  if (!email) {
    setAuthStatus("Enter your email first, then tap Forgot password again.");
    return;
  }

  if (!supabaseClient) {
    setAuthStatus("Password reset is available once Supabase is configured. Local fallback does not store passwords.");
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`
  });

  if (error) {
    setAuthStatus(authErrorMessage("Password reset failed", error));
    return;
  }

  setAuthStatus(`Password reset email sent to ${email}. Check your inbox, update your password, then return here to log in.`);
});

els.logoutButton.addEventListener("click", async () => {
  if (supabaseClient && supabaseSession) {
    await supabaseClient.auth.signOut();
    supabaseSession = null;
    supabaseProfile = null;
    passwordRecoveryMode = false;
    remoteReviewsByEvent = {};
    remoteWantsByEvent = {};
    remoteHiddenByEvent = {};
    setAuthStatus("Signed out. Log in with email and password when you are ready.");
    els.loginDialog.close();
    renderAll();
    return;
  }

  setAccount(null);
  els.loginDialog.close();
  renderAll();
});

els.starInput.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  currentRating = Number(button.dataset.rating);
  renderStarInput();
});

els.reviewGrid.addEventListener("click", (event) => {
  const friendButton = event.target.closest("[data-friend-filter]");
  const photoButton = event.target.closest("[data-photo-toggle]");
  const previewPhotoButton = event.target.closest("[data-preview-review-photo]");
  const editReviewButton = event.target.closest("[data-edit-review]");
  const deleteReviewButton = event.target.closest("[data-delete-review]");
  const copyToggleButton = event.target.closest("[data-review-copy-toggle]");
  const jumpBurgerButton = event.target.closest("[data-jump-burger]");

  if (friendButton) {
    filters.friend = friendButton.dataset.friendFilter;
    els.friendFilter.value = filters.friend;
    showView("feed");
    renderFeed();
  }

  if (photoButton) {
    const reviewId = photoButton.dataset.photoToggle;
    photoViewByReview[reviewId] = photoViewByReview[reviewId] === "official" ? "friend" : "official";
    renderFeed();
    return;
  }

  if (previewPhotoButton) {
    openImageDialog({
      src: previewPhotoButton.dataset.previewReviewPhoto,
      alt: previewPhotoButton.dataset.previewAlt,
      caption: previewPhotoButton.dataset.previewCaption
    });
    return;
  }

  if (copyToggleButton) {
    reviewTextViewByReview[copyToggleButton.dataset.reviewCopyToggle] = copyToggleButton.dataset.copyView;
    renderFeed();
  }

  if (jumpBurgerButton) {
    jumpToBurger(jumpBurgerButton.dataset.jumpBurger);
  }

  if (editReviewButton) {
    if (editReviewButton.disabled) return;
    openReviewEditor(editReviewButton.dataset.editReview);
  }

  if (deleteReviewButton) {
    if (deleteReviewButton.disabled) return;
    deleteReview(deleteReviewButton.dataset.deleteReview);
  }
});

els.reviewGrid.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const previewPhotoButton = event.target.closest("[data-preview-review-photo]");
  if (!previewPhotoButton || event.target.closest("button, a")) return;
  event.preventDefault();
  openImageDialog({
    src: previewPhotoButton.dataset.previewReviewPhoto,
    alt: previewPhotoButton.dataset.previewAlt,
    caption: previewPhotoButton.dataset.previewCaption
  });
});

els.burgerList.addEventListener("click", (event) => {
  const wantButton = event.target.closest("[data-want-burger]");
  const hideButton = event.target.closest("[data-hide-burger]");
  const previewButton = event.target.closest("[data-preview-photo]");
  const waitButton = event.target.closest("[data-report-wait]");
  const deleteWaitButton = event.target.closest("[data-delete-wait-report]");
  if (previewButton) {
    openImageDialog({
      src: previewButton.dataset.previewPhoto,
      alt: previewButton.dataset.previewAlt,
      caption: previewButton.dataset.previewCaption
    });
    return;
  }
  if (deleteWaitButton) {
    deleteWaitReport(deleteWaitButton.dataset.deleteWaitReport);
    renderBurgerBoardState();
    showAppStatus("Wait time report deleted.");
    return;
  }
  if (waitButton) {
    openWaitReportDialog(waitButton.dataset.reportWait);
    return;
  }
  if (wantButton) {
    toggleWant(wantButton.dataset.wantBurger);
  }
  if (hideButton) {
    hideBurger(hideButton.dataset.hideBurger);
  }
});

els.burgerList.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const waitButton = event.target.closest("[data-report-wait]");
  if (!waitButton || event.target.closest("button, a")) return;
  event.preventDefault();
  openWaitReportDialog(waitButton.dataset.reportWait);
});

els.hypeList.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-hype]");
  const hypeCard = event.target.closest("[data-jump-burger]");
  if (toggleButton) {
    hypeCollapsed = !hypeCollapsed;
    renderHypeList();
    return;
  }
  if (hypeCard) {
    jumpToBurger(hypeCard.dataset.jumpBurger);
  }
});

els.hiddenList.addEventListener("click", (event) => {
  const unhideButton = event.target.closest("[data-unhide-burger]");
  if (!unhideButton) return;
  unhideBurger(unhideButton.dataset.unhideBurger);
});

els.scheduleForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const account = getAccount();
  if (!account) {
    els.loginDialog.showModal();
    return;
  }

  const form = new FormData(els.scheduleForm);
  const burger = getBurger(form.get("burgerId"));
  const entry = {
    id: crypto.randomUUID(),
    eventId: currentEventId,
    burgerId: burger.id,
    profileId: account.id,
    displayName: account.displayName,
    date: form.get("date"),
    time: form.get("time"),
    status: form.get("status"),
    note: form.get("note").trim(),
    createdAt: new Date().toISOString()
  };

  saveScheduleEntry(entry);
  els.scheduleNoteInput.value = "";
  renderSchedule();
});

els.scheduleList?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-schedule]");
  if (!deleteButton) return;
  deleteScheduleEntry(deleteButton.dataset.deleteSchedule);
  renderSchedule();
});

els.closeWaitDialog?.addEventListener("click", closeWaitReportDialog);
els.cancelWaitReport?.addEventListener("click", closeWaitReportDialog);
els.waitForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!activeWaitBurgerId) return;
  saveWaitReport(activeWaitBurgerId, els.waitReportSelect.value, els.waitReportNoteInput.value);
  closeWaitReportDialog();
  renderBurgerBoardState();
});

els.closeImageDialog.addEventListener("click", closeImageDialog);
els.imageDialog.addEventListener("click", (event) => {
  if (event.target === els.imageDialog || event.target === els.imageDialogPhoto) {
    closeImageDialog();
  }
});

els.reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = getAccount();
  if (!account) {
    els.dialog.close();
    els.loginDialog.showModal();
    return;
  }

  if (reviewSubmitting) return;
  reviewSubmitting = true;
  setButtonLoading(els.postReviewButton, true, els.postReviewButton?.dataset.loadingLabel || "Posting...");

  const form = new FormData(els.reviewForm);
  const isEditing = Boolean(activeReviewEditId);
  const reviewId = activeReviewEditId || crypto.randomUUID();
  const existingReview = isEditing ? getReviews().find((entry) => entry.id === reviewId) : null;
  const reviewWaitTime = form.get("waitTime");
  const reviewNotes = form.get("notes").trim();
  const selectedPhotoFile = els.photoInput.files[0];

  try {
    if (isEditing) {
      if (!existingReview || !canCurrentUserEditReview(existingReview)) {
        throw new Error("You can only update reviews you posted.");
      }
      setReviewActionBusy("edit", reviewId, true);
    }

    if (isSupabaseReady()) {
      let reviewPayload = isEditing
        ? {
            food_item_id: form.get("burgerId"),
            rating: Number(form.get("rating")),
            notes: reviewNotes,
            updated_at: new Date().toISOString()
          }
        : {
            id: reviewId,
            event_id: currentEventId,
            food_item_id: form.get("burgerId"),
            profile_id: account.id,
            rating: Number(form.get("rating")),
            notes: reviewNotes,
            photo_path: null
          };
      if (supabaseReviewWaitTimeSupported) {
        reviewPayload.wait_time = reviewWaitTime || null;
      } else if (reviewWaitTime) {
        reviewPayload.notes = notesWithWaitTimeFallback(reviewNotes, reviewWaitTime);
      }

      let { error } = isEditing
        ? await supabaseClient
            .from("reviews")
            .update(reviewPayload)
            .eq("id", reviewId)
            .eq("profile_id", account.id)
        : await supabaseClient.from("reviews").insert(reviewPayload);

      if (error && supabaseReviewWaitTimeSupported && supabaseMissingColumnError(error, "wait_time")) {
        supabaseReviewWaitTimeSupported = false;
        reviewPayload = { ...reviewPayload };
        delete reviewPayload.wait_time;
        reviewPayload.notes = reviewWaitTime ? notesWithWaitTimeFallback(reviewNotes, reviewWaitTime) : stripWaitTimeFallback(reviewNotes);
        ({ error } = isEditing
          ? await supabaseClient
              .from("reviews")
              .update(reviewPayload)
              .eq("id", reviewId)
              .eq("profile_id", account.id)
          : await supabaseClient.from("reviews").insert(reviewPayload));
      }

      if (error) throw error;

      let photoMessage = "";
      if (selectedPhotoFile) {
        try {
          showAppStatus("Preparing review photo...");
          await attachSupabaseReviewPhoto(reviewId, selectedPhotoFile, existingReview?.photoPath || "");
        } catch (photoError) {
          photoMessage = `Review ${isEditing ? "updated" : "saved"}, but the photo did not upload: ${photoError.message}`;
        }
      }

      els.reviewForm.reset();
      currentRating = 5;
      activeReviewEditId = "";
      renderStarInput();
      els.dialog.close();
      await refreshSupabaseData();
      renderAll();
      if (photoMessage) {
        setAuthStatus(photoMessage);
        showAppStatus(photoMessage, true);
      } else {
        showAppStatus(isEditing ? "Review updated." : "Review posted.");
      }
      return;
    }

    const allReviews = loadLocalReviews();
    if (isEditing) {
      const review = (allReviews[currentEventId] || []).find((entry) => entry.id === reviewId && entry.profileId === account.id);
      if (!review) throw new Error("Could not find a local review to update.");
      review.burgerId = form.get("burgerId");
      review.rating = Number(form.get("rating"));
      review.notes = reviewNotes;
      review.waitTime = reviewWaitTime;
      review.updatedAt = new Date().toISOString();
      if (selectedPhotoFile) {
        review.photo = await readPhoto(selectedPhotoFile);
      }
    } else {
      const photo = await readPhoto(selectedPhotoFile);
      const review = {
        id: reviewId,
        burgerId: form.get("burgerId"),
        reviewer: account.displayName,
        profileId: account.id,
        rating: Number(form.get("rating")),
        notes: reviewNotes,
        waitTime: reviewWaitTime,
        photo,
        createdAt: new Date().toISOString()
      };
      allReviews[currentEventId] = [...(allReviews[currentEventId] || []), review];
    }
    saveLocalReviews(allReviews);
    els.reviewForm.reset();
    currentRating = 5;
    activeReviewEditId = "";
    renderStarInput();
    els.dialog.close();
    renderAll();
    showAppStatus(isEditing ? "Review updated." : "Review posted.");
  } catch (error) {
    const action = activeReviewEditId ? "update" : "post";
    setReviewStatus(`Could not ${action} review: ${error.message}`);
    setAuthStatus(`Could not ${action} review: ${error.message}`);
    showAppStatus(`Could not ${action} review: ${error.message}`, true);
  } finally {
    if (isEditing) {
      setReviewActionBusy("edit", reviewId, false);
    }
    reviewSubmitting = false;
    setButtonLoading(els.postReviewButton, false);
  }
});

els.clearLocalData.addEventListener("click", () => {
  const allReviews = loadLocalReviews();
  allReviews[currentEventId] = [];
  saveLocalReviews(allReviews);
  renderAll();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

loadEvents().then(async (loadedEvents) => {
  events = loadedEvents;
  await initializeSupabase();
  renderAll();
});
