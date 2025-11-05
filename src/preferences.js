import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import inquirer from "inquirer";
import { getColumnNumber } from "./utils.js";

// Default suggestion values used to seed per-row suggestions in preferences
const DEFAULT_SUGGESTIONS = ["8", "PTO"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Required preference keys and defaults
const defaultPreferences = {
  userName: "",
  userRow: null,
  spreadsheetId: "",
  sheetName: "",
  // startColumn is the column letter that represents day 1 (e.g. "A" or "C")
  // Set to null so the loader will prompt the user when it's not present in preferences.json
  startColumn: null,
};

const PREFERENCES_PATH = () => join(__dirname, "..", "preferences.json");

const promptForMissingPreferences = async (prefs) => {
  const questions = [];

  if (!prefs.userName) {
    questions.push({
      type: "input",
      name: "userName",
      message: "Enter your name:",
      validate: (input) => input.trim() !== "" || "Name is required",
    });
  }

  if (!prefs.userRow || isNaN(parseInt(prefs.userRow))) {
    questions.push({
      type: "input",
      name: "userRow",
      message:
        "Enter your row number(s) in the sheet (comma-separated for multiple rows):",
      validate: (input) => {
        const raw = String(input).trim();
        if (raw === "") return "Enter at least one row number";
        const parts = raw
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length === 0) return "Enter at least one row number";
        for (const p of parts) {
          const n = parseInt(p, 10);
          if (isNaN(n) || n <= 0) return `Invalid row: ${p}`;
        }
        return true;
      },
      filter: (input) => {
        const parts = String(input)
          .trim()
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        // convert to array of integers; if only one entry, still return an array for consistency
        return parts.map((p) => parseInt(p, 10));
      },
    });
  }

  if (!prefs.spreadsheetId) {
    questions.push({
      type: "input",
      name: "spreadsheetId",
      message: "Enter your Google Spreadsheet ID (from the URL):",
      validate: (input) => input.trim() !== "" || "Spreadsheet ID is required",
    });
  }

  if (!prefs.sheetName) {
    questions.push({
      type: "input",
      name: "sheetName",
      message: "Enter the sheet/tab name to write into:",
      default: "Sheet1",
      validate: (input) => input.trim() !== "" || "Sheet name is required",
    });
  }

  if (!prefs.startColumn) {
    questions.push({
      type: "input",
      name: "startColumn",
      message: "Enter the start column letter for day 1 (e.g. A):",
      default: "A",
      validate: (input) => {
        const letters = String(input).trim().toUpperCase();
        if (!/^[A-Z]+$/.test(letters))
          return "Enter a valid column letter (A, B, ..., Z, AA, ...).";
        try {
          const num = getColumnNumber(letters);
          return num >= 1;
        } catch (e) {
          return "Enter a valid column letter (A, B, ..., Z, AA, ...).";
        }
      },
      filter: (input) => String(input).trim().toUpperCase(),
    });
  }

  if (questions.length === 0) return { updated: prefs, wasAsked: false };

  const answers = await inquirer.prompt(questions);
  return { updated: { ...prefs, ...answers }, wasAsked: true };
};

// Load preferences: create file if missing and prompt for required fields if absent
export const loadPreferences = async () => {
  const preferencesPath = PREFERENCES_PATH();
  let prefs = { ...defaultPreferences };
  let fileExists = false;
  let original = null;

  try {
    const data = await readFile(preferencesPath, "utf8");
    original = JSON.parse(data);
    prefs = { ...prefs, ...original };
    fileExists = true;
  } catch (err) {
    // File not found or unreadable — will create
    console.log("No preferences found, creating preferences...");
  }

  // Prompt for any missing required fields
  const { updated, wasAsked } = await promptForMissingPreferences(prefs);

  // Normalize suggestions shape: ensure an object mapping row->array<string>
  const normalizeSuggestions = (sugg) => {
    const out = {};
    if (!sugg || typeof sugg !== "object") return out;
    for (const [k, v] of Object.entries(sugg)) {
      if (Array.isArray(v)) {
        // flatten any nested arrays and keep only strings
        const flat = v
          .flat(Infinity)
          .filter((x) => typeof x === "string")
          .map((x) => x.trim())
          .filter(Boolean);
        // remove duplicates while preserving order
        out[k] = [...new Set(flat)];
      } else if (typeof v === "string") {
        out[k] = [v.trim()];
      } else {
        // ignore other types
        out[k] = [];
      }
    }
    return out;
  };

  // Ensure suggestions object exists and contains entries for each configured row.
  const ensureSuggestionsForRows = (prefsObj) => {
    if (!prefsObj.suggestions || typeof prefsObj.suggestions !== "object") {
      prefsObj.suggestions = {};
    } else {
      prefsObj.suggestions = normalizeSuggestions(prefsObj.suggestions);
    }
    const rows = Array.isArray(prefsObj.userRow)
      ? prefsObj.userRow
      : [prefsObj.userRow];
    for (const r of rows) {
      const key = String(r);
      if (
        !Array.isArray(prefsObj.suggestions[key]) ||
        prefsObj.suggestions[key].length === 0
      ) {
        prefsObj.suggestions[key] = DEFAULT_SUGGESTIONS.slice();
      }
    }
  };

  // Helper to determine if we seeded missing suggestions
  const weSeededMissingSuggestions = (updatedPrefs, originalPrefs) => {
    if (!updatedPrefs.suggestions || !originalPrefs || !originalPrefs.suggestions) {
      return false;
    }
    const updatedKeys = Object.keys(updatedPrefs.suggestions);
    const originalKeys = Object.keys(originalPrefs.suggestions);
    
    // Check if any keys were added or any arrays went from empty/non-array to populated
    for (const key of updatedKeys) {
      if (!originalKeys.includes(key)) {
        return true;
      }
      const wasEmptyOrInvalid = !Array.isArray(originalPrefs.suggestions[key]) || originalPrefs.suggestions[key].length === 0;
      const nowHasData = Array.isArray(updatedPrefs.suggestions[key]) && updatedPrefs.suggestions[key].length > 0;
      if (wasEmptyOrInvalid && nowHasData) {
        return true;
      }
    }
    return false;
  };

  ensureSuggestionsForRows(updated);

  // Track if we added any missing suggestions (needed for existing preference files)
  const hadSuggestions = original && original.suggestions;
  const weAddedSuggestions = !hadSuggestions || weSeededMissingSuggestions(updated, original);

  // Only save when the user actually provided missing values
  if (wasAsked) {
    await savePreferences(updated);
    return updated;
  }

  // If file didn't exist we should still save defaults (so there's a preferences.json)
  // Or if we added suggestions to an existing file, save those too
  if (!fileExists || weAddedSuggestions) {
    await savePreferences(updated);
  }

  return updated;
};

// Save preferences to file
export const savePreferences = async (preferences) => {
  try {
    const preferencesPath = PREFERENCES_PATH();
    await writeFile(
      preferencesPath,
      JSON.stringify(preferences, null, 2),
      "utf8"
    );
    console.log("Preferences saved successfully!");
  } catch (error) {
    console.error("Error saving preferences:", error.message);
    throw error;
  }
};

// Update preferences by merging and saving
export const updatePreferences = async (newPreferences) => {
  const current = await loadPreferences();
  const merged = { ...current, ...newPreferences };
  await savePreferences(merged);
  return merged;
};
