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

// Function to get data input for a row with suggestions.
// Suggestions are read from preferences.suggestions[row] (persisted) or DEFAULT_SUGGESTIONS as fallback.
const getRowData = async (row, preferences) => {
  const key = String(row);
  const suggestions = (preferences.suggestions && Array.isArray(preferences.suggestions[key]))
    ? preferences.suggestions[key]
    : DEFAULT_SUGGESTIONS;

  // Add a custom value option at the end
  const allChoices = [...suggestions, new inquirer.Separator(), "(type custom value)"];

  // First, let user select a suggestion
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: `Select a suggestion for row ${row}:`,
      choices: allChoices,
      loop: false,
    },
  ]);

  // Now prompt for the actual value (pre-filled with the selected suggestion)
  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message: `Edit and confirm value for row ${row}:`,
      default: choice === "(type custom value)" ? "" : choice,
      validate: (input) => input.trim() !== "" || "Value cannot be empty",
    },
  ]);

  const finalValue = value;

  // Only save the value if this row has no suggestions yet in preferences.json
  // Check if suggestions are empty or are exactly the defaults
  const isDefault = JSON.stringify(suggestions) === JSON.stringify(DEFAULT_SUGGESTIONS);

  if (isDefault) {
    try {
      const currentPrefs = await loadPreferences();
      const s = currentPrefs.suggestions && typeof currentPrefs.suggestions === "object" ? { ...currentPrefs.suggestions } : {};
      s[key] = [finalValue];
      await updatePreferences({ suggestions: s });
    } catch (e) {
      // If persisting fails, ignore silently
    }
  }

  return finalValue;
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
    const value = await getRowData(row, preferences);

    return {
      date: preferences.userRow,
      column,
      rowData: [value],
    };
  }

  // Multiple rows: get data for each row with suggestions
  const values = [];
  for (const row of prefRows) {
    const value = await getRowData(row, preferences);
    values.push(value);
  }

  return {
    date: preferences.userRow,
    column,
    rowData: values,
  };
};
