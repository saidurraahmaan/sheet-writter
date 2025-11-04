import inquirer from "inquirer";
import { loadPreferences, updatePreferences } from "./preferences.js";

// Common suggestions for status
const DEFAULT_SUGGESTIONS = [
  "present",
  "absent",
  "leave",
  "sick",
  "working from home",
  "on vacation",
];

// Keep track of recent values per row (in memory during the session)
const recentValues = new Map();

// Helper to update recent values after a new entry
const updateRecentValues = (row, value) => {
  if (!value || value.trim() === "" || DEFAULT_SUGGESTIONS.includes(value))
    return;

  const current = recentValues.get(row) || [];
  const updated = [value, ...current.filter((v) => v !== value)].slice(0, 5);
  recentValues.set(row, updated);
};

// Function to get data input for a row with suggestions
const getRowData = async (row) => {
  const recents = recentValues.get(row) || [];
  const suggestions = [...new Set([...recents, ...DEFAULT_SUGGESTIONS])];

  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message: `Enter data for row ${row} (use ↑↓ to see suggestions):`,
      validate: (input) => input.trim() !== "" || "Value cannot be empty",
      suggestOnly: true,
      choices: suggestions,
    },
  ]);

  updateRecentValues(row, value);
  return value;
};

// Function to setup preferences
export const setupPreferences = async () => {
  const questions = [
    {
      type: "input",
      name: "userName",
      message: "Enter your name:",
      validate: (input) => input.trim() !== "",
    },
    {
      type: "input",
      name: "userRow",
      message: "Enter your row number in the sheet:",
      validate: (input) => !isNaN(parseInt(input)) && parseInt(input) > 0,
    },
  ];

  const preferences = await inquirer.prompt(questions);
  await updatePreferences(preferences);
  return preferences;
};

// Function to get user input based on preferences
export const getUserInput = async () => {
  const preferences = await loadPreferences();

  // First ask for the date only
  const dateQuestion = [
    {
      type: "input",
      name: "date",
      message: "Enter date (1-31):",
      default: new Date().getDate().toString(),
      validate: (input) => {
        const num = parseInt(input);
        return num >= 1 && num <= 31;
      },
    },
  ];

  const dateAnswer = await inquirer.prompt(dateQuestion);
  const column = parseInt(dateAnswer.date, 10);

  // Determine user's row(s) from preferences
  const prefRows = Array.isArray(preferences.userRow)
    ? preferences.userRow.map((r) => parseInt(r, 10))
    : [parseInt(preferences.userRow, 10)];

  // If there is only one row, ask a single data prompt
  if (prefRows.length === 1) {
    const row = prefRows[0];
    const value = await getRowData(row);

    return {
      date: preferences.userRow,
      column,
      rowData: [value],
    };
  }

  // Multiple rows: get data for each row with suggestions
  const values = [];
  for (const row of prefRows) {
    const value = await getRowData(row);
    values.push(value);
  }

  return {
    date: preferences.userRow,
    column,
    rowData: values,
  };
};
