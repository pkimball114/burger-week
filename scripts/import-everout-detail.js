#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const defaultCsv = path.join("data", "burger-week-2026.csv");
const dayColumns = [
  ["monday", "hours_monday"],
  ["tuesday", "hours_tuesday"],
  ["wednesday", "hours_wednesday"],
  ["thursday", "hours_thursday"],
  ["friday", "hours_friday"],
  ["saturday", "hours_saturday"],
  ["sunday", "hours_sunday"]
];
const eventDates = {
  "August 10": "monday",
  "August 11": "tuesday",
  "August 12": "wednesday",
  "August 13": "thursday",
  "August 14": "friday",
  "August 15": "saturday",
  "August 16": "sunday"
};

function usage() {
  console.error("Usage: node scripts/import-everout-detail.js [--csv data/burger-week-2026.csv] detail.html [...]");
  process.exit(1);
}

function parseArgs(argv) {
  const args = [...argv];
  let csv = defaultCsv;
  const details = [];

  while (args.length) {
    const arg = args.shift();
    if (arg === "--csv") {
      csv = args.shift();
      if (!csv) usage();
    } else if (arg.startsWith("--")) {
      usage();
    } else {
      details.push(arg);
    }
  }

  if (!details.length) usage();
  return { csv, details };
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value = "") {
  return decodeEntities(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/\u2026/g, "...")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return buffer.toString("latin1");
  }
}

function stripTags(value = "") {
  return normalizeText(value.replace(/<[^>]*>/g, " "));
}

function firstMatch(html, pattern) {
  return html.match(pattern)?.[1] || "";
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some(Boolean)) rows.push(row);
  }

  return rows;
}

function csvCell(value = "") {
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function serializeCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function objectFromRow(header, row) {
  return Object.fromEntries(header.map((key, index) => [key, row[index] || ""]));
}

function rowFromObject(header, record) {
  return header.map((key) => record[key] || "");
}

function parseAnswers(html) {
  const answers = {};
  const answerPattern = /<div class="answer row[\s\S]*?<div class="question-text col-12 fw-bold">([\s\S]*?)<\/div>\s*<div class="answer-text col-12">([\s\S]*?)<\/div>/g;
  let match;

  while ((match = answerPattern.exec(html))) {
    answers[stripTags(match[1])] = stripTags(match[2]);
  }

  return answers;
}

function parseAddress(html) {
  const block = html.match(/<div class="location-info mt-0">([\s\S]*?)<\/div>\s*<div class="map">/)?.[1] || "";
  const withoutHeading = block
    .replace(/<span class="venue-website[\s\S]*/, " ")
    .replace(/<h2[\s\S]*?<\/h2>/, " ")
    .replace(/<h4[\s\S]*?<\/h4>/, " ");
  return stripTags(withoutHeading).replace(/\s+(Portland,)/, ", $1");
}

function parseHours(dateSummary) {
  const summary = normalizeText(dateSummary);
  const hours = summary.match(/,\s*([0-9][0-9:]*\s*(?:am|pm)\s*-\s*[0-9][0-9:]*\s*(?:am|pm))/i)?.[1] || "";
  const normalizedHours = hours.replace(/\s*-\s*/g, "-").toLowerCase();
  const activeDays = new Set();

  if (/every day/i.test(summary)) {
    dayColumns.forEach(([day]) => activeDays.add(day));
  }

  const range = summary.match(/August\s+(\d{1,2})\s*-\s*(?:August\s+)?(\d{1,2})/i);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    for (let day = start; day <= end; day += 1) {
      const key = eventDates[`August ${day}`];
      if (key) activeDays.add(key);
    }
  }

  Object.entries(eventDates).forEach(([label, day]) => {
    if (new RegExp(label, "i").test(summary)) activeDays.add(day);
  });

  return { hours: normalizedHours, activeDays };
}

function parseDetail(detailPath) {
  const html = fs.readFileSync(detailPath, "utf8");
  const locationBlock = html.match(/<div class="location mb-2">([\s\S]*?)<\/div>\s*<div class="my-3/s)?.[1] || "";
  const answers = parseAnswers(html);
  const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)"/);
  const dateSummary = stripTags(firstMatch(html, /<div class="date-summary mb-2">([\s\S]*?)<\/div>/));
  const parsedHours = parseHours(dateSummary);
  const address = parseAddress(html);

  return {
    source: detailPath,
    restaurant: stripTags(firstMatch(locationBlock, /<a[^>]*>([\s\S]*?)<\/a>/)),
    burger: stripTags(firstMatch(html, /<h1 class="mb-0">([\s\S]*?)<\/h1>/)),
    description: answers["What's On It..."] || "",
    neighborhood: stripTags(firstMatch(locationBlock, /<span class="text-muted">([\s\S]*?)<\/span>/)),
    address,
    hours: parsedHours.hours,
    activeDays: parsedHours.activeDays,
    restaurant_photo: firstMatch(html, /<div class="item-image[\s\S]*?<img class="img-fluid" src="([^"]+)"/),
    maps_url: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address).replace(/%20/g, "+")}` : "",
    everout_url: canonical
  };
}

function updateRecord(record, detail) {
  record.restaurant = detail.restaurant || record.restaurant;
  record.burger = detail.burger || record.burger;
  record.description = detail.description || record.description;
  record.neighborhood = detail.neighborhood || record.neighborhood;
  record.address = detail.address || record.address;
  record.tags = "";
  record.restaurant_photo = detail.restaurant_photo || record.restaurant_photo;
  record.maps_url = detail.maps_url || record.maps_url;
  record.everout_url = detail.everout_url || record.everout_url;

  if (detail.hours) {
    dayColumns.forEach(([day, column]) => {
      record[column] = detail.activeDays.has(day) ? detail.hours : "";
    });
  }
}

function main() {
  const { csv, details } = parseArgs(process.argv.slice(2));
  const rows = parseCsv(readText(csv));
  const header = rows[0];
  const records = rows.slice(1).map((row) => objectFromRow(header, row));
  const updates = [];

  details.forEach((detailPath) => {
    const detail = parseDetail(detailPath);
    const target = records.find((record) => record.everout_url === detail.everout_url)
      || records.find((record) => record.restaurant === detail.restaurant && record.burger === detail.burger);

    if (!target) {
      throw new Error(`No matching CSV row found for ${detail.burger} at ${detail.restaurant}`);
    }

    updateRecord(target, detail);
    updates.push({
      source: detail.source,
      id: target.id,
      restaurant: target.restaurant,
      burger: target.burger,
      everout_url: target.everout_url,
      neighborhood: target.neighborhood,
      hours: detail.hours,
      days: [...detail.activeDays]
    });
  });

  fs.writeFileSync(csv, serializeCsv([header, ...records.map((record) => rowFromObject(header, record))]), "utf8");
  console.log(JSON.stringify({ csv, updated: updates }, null, 2));
}

main();
