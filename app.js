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
const supabasePhotoBucket = "burger-review-photos";
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
  statsGrid: $("#statsGrid"),
  searchInput: $("#searchInput"),
  neighborhoodFilter: $("#neighborhoodFilter"),
  friendFilter: $("#friendFilter"),
  ratingFilter: $("#ratingFilter"),
  sortSelect: $("#sortSelect"),
  tabs: $$(".tab"),
  views: $$(".view"),
  reviewGrid: $("#reviewGrid"),
  burgerList: $("#burgerList"),
  hypeList: $("#hypeList"),
  resultCount: $("#resultCount"),
  mapPins: $("#mapPins"),
  mapList: $("#mapList"),
  calendarGrid: $("#calendarGrid"),
  dialog: $("#reviewDialog"),
  openComposer: $("#openComposer"),
  closeComposer: $("#closeComposer"),
  reviewForm: $("#reviewForm"),
  burgerSelect: $("#burgerSelect"),
  starInput: $("#starInput"),
  ratingInput: $("#ratingInput"),
  ratingOutput: $("#ratingOutput"),
  photoInput: $("#photoInput"),
  clearLocalData: $("#clearLocalData"),
  authButton: $("#authButton"),
  loginDialog: $("#loginDialog"),
  loginForm: $("#loginForm"),
  loginNameInput: $("#loginNameInput"),
  loginEmailInput: $("#loginEmailInput"),
  loginPasswordInput: $("#loginPasswordInput"),
  authStatus: $("#authStatus"),
  closeLogin: $("#closeLogin"),
  logoutButton: $("#logoutButton"),
  resetPasswordButton: $("#resetPasswordButton"),
  reviewerInput: $("#reviewerInput"),
  hiddenList: $("#hiddenList"),
  hiddenCount: $("#hiddenCount")
};

let events = {};
let currentEventId = "burger-week-2026";
let currentRating = 5;
let photoViewByReview = {};
let openReviewAfterLogin = false;
let pendingWantBurgerId = "";
let pendingHideBurgerId = "";
let supabaseClient = null;
let supabaseSession = null;
let supabaseProfile = null;
let passwordRecoveryMode = false;
let authStatusMessage = "";
let remoteReviewsByEvent = {};
let remoteWantsByEvent = {};
let remoteHiddenByEvent = {};
let filters = {
  search: "",
  neighborhood: "all",
  friend: "all",
  rating: 0,
  sort: "recent"
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
  if (!availability.length) return "Not listed for event days";
  return availability.map((entry) => `${entry.dayLabel} ${entry.hoursText}`).join("; ");
}

function hoursForDate(burger, date) {
  return burger.availability?.find((entry) => entry.date === date)?.hoursText || "";
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
  return {
    id: row.id,
    burgerId: row.food_item_id,
    reviewer: row.profiles?.display_name || "Burger friend",
    profileId: row.profile_id,
    rating: Number(row.rating),
    notes: row.notes || "",
    photo: await signedPhotoUrl(row.photo_path),
    photoPath: row.photo_path || "",
    createdAt: row.created_at
  };
}

async function loadSupabaseReviews() {
  const { data, error } = await supabaseClient
    .from("reviews")
    .select("id,event_id,food_item_id,profile_id,rating,notes,photo_path,created_at,updated_at,profiles(display_name)")
    .eq("event_id", currentEventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

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

async function hideBurger(burgerId) {
  const account = getAccount();
  if (!account) {
    pendingHideBurgerId = burgerId;
    els.loginDialog.showModal();
    return;
  }

  const burger = getBurger(burgerId);
  if (isSupabaseReady()) {
    const { error } = await supabaseClient.from("hidden_food_items").insert({
      event_id: currentEventId,
      food_item_id: burgerId,
      profile_id: account.id
    });

    if (error && error.code !== "23505") {
      setAuthStatus(`Could not hide burger: ${error.message}`);
      return;
    }

    await refreshSupabaseData();
    renderStats();
    renderHiddenProfileList();
    renderBurgerList();
    renderHypeList();
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
  renderStats();
  renderHiddenProfileList();
  renderBurgerList();
}

async function unhideBurger(burgerId) {
  const account = getAccount();
  if (!account) return;

  if (isSupabaseReady()) {
    const { error } = await supabaseClient
      .from("hidden_food_items")
      .delete()
      .eq("event_id", currentEventId)
      .eq("food_item_id", burgerId)
      .eq("profile_id", account.id);

    if (error) {
      setAuthStatus(`Could not unhide burger: ${error.message}`);
      return;
    }

    await refreshSupabaseData();
    renderStats();
    renderHiddenProfileList();
    renderBurgerList();
    renderHypeList();
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
  renderStats();
  renderHiddenProfileList();
  renderBurgerList();
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

async function toggleWant(burgerId) {
  const account = getAccount();
  if (!account) {
    pendingWantBurgerId = burgerId;
    els.loginDialog.showModal();
    return;
  }

  if (isSupabaseReady()) {
    const wanted = accountWantsBurger(burgerId);
    const { error } = wanted
      ? await supabaseClient
          .from("wants")
          .delete()
          .eq("event_id", currentEventId)
          .eq("food_item_id", burgerId)
          .eq("profile_id", account.id)
      : await supabaseClient.from("wants").insert({
          event_id: currentEventId,
          food_item_id: burgerId,
          profile_id: account.id
        });

    if (error && error.code !== "23505") {
      setAuthStatus(`Could not update want: ${error.message}`);
      return;
    }

    await refreshSupabaseData();
    renderStats();
    renderHypeList();
    renderBurgerList();
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
  renderStats();
  renderHypeList();
  renderBurgerList();
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

  els.neighborhoodFilter.value = areas.includes(currentArea) ? currentArea : "all";
  els.friendFilter.value = friends.includes(currentFriend) ? currentFriend : "all";
  filters.neighborhood = els.neighborhoodFilter.value;
  filters.friend = els.friendFilter.value;
}

function getFilteredReviews() {
  const search = filters.search.toLowerCase();
  return getReviews()
    .filter((review) => {
      const haystack = [
        review.reviewer,
        review.notes,
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
  const event = getEvent();
  const reviews = getReviews();
  const hiddenCount = accountHiddenIds().size;
  const visibleCount = Math.max(0, event.burgers.length - hiddenCount);
  const uniqueSpots = new Set(reviews.map((review) => review.burgerId)).size;
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const topReview = [...reviews].sort((a, b) => b.rating - a.rating)[0];
  const topSpot = topReview ? getBurger(topReview.burgerId).restaurant : "No reviews";
  const topWanted = mostWantedBurgers(1)[0];

  const stats = [
    ["Reviews", reviews.length],
    ["Spots Tried", uniqueSpots],
    ["Visible Burgers", visibleCount],
    ["Hidden", hiddenCount],
    ["Avg Rating", avg ? formatRating(avg) : "0.00"],
    ["Top Right Now", topSpot],
    ["Most Wanted", topWanted ? topWanted.burger.restaurant : "No hype yet"]
  ];

  els.statsGrid.innerHTML = stats
    .map(([label, value]) => `
      <article class="stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `)
    .join("");
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
      return `
        <article class="review-card">
          <div class="photo-frame ${image ? "" : "placeholder-photo"} ${placeholderArt ? "placeholder-art" : ""}">
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
                <p class="burger-name">${escapeHtml(review.burger.burger)}</p>
              </div>
              <div class="quick-links" aria-label="Review links">
                <a href="${escapeAttr(review.burger.mapsUrl)}" target="_blank" rel="noreferrer" aria-label="Open restaurant location in maps">⌖</a>
                <a href="${escapeAttr(review.burger.everoutUrl)}" target="_blank" rel="noreferrer" aria-label="Open burger listing on EverOut">↗</a>
              </div>
            </div>
            <div class="rating-row" aria-label="${formatRating(review.rating)} out of 5 stars">
              ${renderStars(review.rating)}
              <b>${formatRating(review.rating)}</b>
            </div>
            <p>${escapeHtml(review.notes || "No notes.")}</p>
            <div class="tag-row">
              <span>${escapeHtml(review.burger.neighborhood)}</span>
              ${displayTags(review.burger).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
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
  if (!hype.length) {
    els.hypeList.innerHTML = `
      <article class="hype-empty">
        <strong>Hype List</strong>
        <span>No wishes yet. Tap a Want button on the Burger Board to start the chase.</span>
      </article>
    `;
    return;
  }

  els.hypeList.innerHTML = `
    <div class="hype-heading">
      <h3>Hype List</h3>
      <span>Most wished-for burgers</span>
    </div>
    <div class="hype-grid">
      ${hype.map((item, index) => `
        <article class="hype-card">
          <span class="hype-rank">#${index + 1}</span>
          <div>
            <strong>${escapeHtml(item.burger.restaurant)}</strong>
            <p>${escapeHtml(item.burger.burger)}</p>
            <small>${escapeHtml(item.names.join(", "))}</small>
          </div>
          <b>${item.count}</b>
        </article>
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
  const visibleBurgers = event.burgers.filter((burger) => !hiddenIds.has(burger.id));

  if (!visibleBurgers.length) {
    els.burgerList.innerHTML = `
      <div class="empty-state">
        <h3>No visible burgers left.</h3>
        <p>Open your profile from the top bar to unhide burgers.</p>
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
      const availability = burger.availability?.length
        ? burger.availability.map((entry) => `<span><b>${escapeHtml(entry.dayLabel)}</b> ${escapeHtml(entry.hoursText)}</span>`).join("")
        : `<span>${escapeHtml(burger.hours || "Hours TBD")}</span>`;
      return `
        <article class="burger-row">
          <div class="burger-photo photo-frame ${placeholderArt ? "placeholder-art" : ""}">
            <img src="${escapeAttr(burger.restaurantPhoto)}" alt="${escapeAttr(burger.photoAlt || `${burger.restaurant} burger photo`)}">
          </div>
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
            <section class="availability-block" aria-label="Available times">
              <h4>Available</h4>
              <div class="availability-list">
                ${availability}
              </div>
            </section>
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

function renderCalendar() {
  const event = getEvent();
  els.calendarGrid.innerHTML = event.dates
    .map((date) => {
      const available = event.burgers.filter((burger) => burger.available.includes(date));
      const day = dayFormatter.format(new Date(`${date}T12:00:00`));
      return `
        <article class="day-card">
          <h3>${escapeHtml(day)}</h3>
          <span>${available.length} burgers</span>
          <ul>
            ${available.slice(0, 8).map((burger) => `
              <li>
                <strong>${escapeHtml(burger.restaurant)}</strong>
                <small>${escapeHtml(hoursForDate(burger, date))}</small>
              </li>
            `).join("")}
          </ul>
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
  renderStats();
  renderFeed();
  renderHypeList();
  renderBurgerList();
  renderMap();
  renderCalendar();
  renderStarInput();
}

function showView(viewName) {
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.view === viewName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === `${viewName}View`));
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

function safeFileName(fileName = "burger-photo") {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "burger-photo";
}

async function uploadSupabaseReviewPhoto(file, reviewId) {
  if (!file || !isSupabaseReady()) return "";

  const extension = safeFileName(file.name).split(".").pop() || "jpg";
  const path = `${supabaseSession.user.id}/${currentEventId}/${reviewId}.${extension}`;
  const { error } = await supabaseClient.storage.from(supabasePhotoBucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (error) throw error;
  return path;
}

function openReviewComposer() {
  const account = getAccount();
  if (!account) {
    openReviewAfterLogin = true;
    els.loginDialog.showModal();
    return;
  }
  els.reviewerInput.value = account.displayName;
  els.dialog.showModal();
}

function resetFilters() {
  filters = { search: "", neighborhood: "all", friend: "all", rating: 0, sort: "recent" };
  els.searchInput.value = "";
  els.ratingFilter.value = "0";
  els.sortSelect.value = "recent";
}

els.searchInput.addEventListener("input", (event) => {
  filters.search = event.target.value;
  renderFeed();
});

els.neighborhoodFilter.addEventListener("change", (event) => {
  filters.neighborhood = event.target.value;
  renderFeed();
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

els.tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));

els.eventPicker.addEventListener("change", async (event) => {
  currentEventId = event.target.value;
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
        setAuthStatus(`Could not create account: ${error.message}`);
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
    setAuthStatus(`Password reset failed: ${error.message}`);
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
  }
});

els.burgerList.addEventListener("click", (event) => {
  const wantButton = event.target.closest("[data-want-burger]");
  const hideButton = event.target.closest("[data-hide-burger]");
  if (wantButton) {
    toggleWant(wantButton.dataset.wantBurger);
  }
  if (hideButton) {
    hideBurger(hideButton.dataset.hideBurger);
  }
});

els.hiddenList.addEventListener("click", (event) => {
  const unhideButton = event.target.closest("[data-unhide-burger]");
  if (!unhideButton) return;
  unhideBurger(unhideButton.dataset.unhideBurger);
});

els.reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = getAccount();
  if (!account) {
    els.dialog.close();
    els.loginDialog.showModal();
    return;
  }

  const form = new FormData(els.reviewForm);
  const reviewId = crypto.randomUUID();

  if (isSupabaseReady()) {
    try {
      const photoPath = await uploadSupabaseReviewPhoto(els.photoInput.files[0], reviewId);
      const { error } = await supabaseClient.from("reviews").insert({
        id: reviewId,
        event_id: currentEventId,
        food_item_id: form.get("burgerId"),
        profile_id: account.id,
        rating: Number(form.get("rating")),
        notes: form.get("notes").trim(),
        photo_path: photoPath || null
      });

      if (error) throw error;

      els.reviewForm.reset();
      currentRating = 5;
      renderStarInput();
      els.dialog.close();
      await refreshSupabaseData();
      renderAll();
    } catch (error) {
      setAuthStatus(`Could not post review: ${error.message}`);
    }
    return;
  }

  const photo = await readPhoto(els.photoInput.files[0]);
  const review = {
    id: reviewId,
    burgerId: form.get("burgerId"),
    reviewer: account.displayName,
    profileId: account.id,
    rating: Number(form.get("rating")),
    notes: form.get("notes").trim(),
    photo,
    createdAt: new Date().toISOString()
  };

  const allReviews = loadLocalReviews();
  allReviews[currentEventId] = [...(allReviews[currentEventId] || []), review];
  saveLocalReviews(allReviews);
  els.reviewForm.reset();
  currentRating = 5;
  renderStarInput();
  els.dialog.close();
  renderAll();
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
