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
const getRowData = async (row, preferences, lastValue = null) => {
  const key = String(row);
  const suggestions = (preferences.suggestions && Array.isArray(preferences.suggestions[key]))
    ? preferences.suggestions[key]
    : DEFAULT_SUGGESTIONS;

  // Check if multiple suggestions are allowed for this row (default: true)
  const allowMultiple = preferences.allowAddMultipleSuggestions?.[key] !== false;

  // Check if showing last inserted value is enabled for this row (default: false)
  const showLastValue = preferences.showLastInsertedValue?.[key] === true;

  let currentValue = "";

  // If there's a last inserted value AND the preference is enabled, ask if user wants to reuse it
  if (showLastValue && lastValue && lastValue.trim() !== "") {
    const { reuseLastValue } = await inquirer.prompt([
      {
        type: "confirm",
        name: "reuseLastValue",
        message: `Row ${row}: Use last value "${lastValue}"?`,
        default: true,
      },
    ]);

    if (reuseLastValue) {
      // Pre-fill with last value
      currentValue = lastValue;

      // Ask if user wants to edit it
      const { editValue } = await inquirer.prompt([
        {
          type: "confirm",
          name: "editValue",
          message: "Do you want to edit this value?",
          default: false,
        },
      ]);

      if (!editValue) {
        // User wants to keep the value as-is
        return currentValue;
      }
      // Otherwise, fall through to the normal flow with currentValue pre-filled
    }
  }

  // First value is required
  while (true) {
    // Add a custom value option and optionally a done option
    const allChoices = [
      ...suggestions,
      new inquirer.Separator(),
      "(type custom value)",
    ];

    // Add done option only if at least one value has been added
    if (currentValue.length > 0) {
      allChoices.push("(done - finish adding)");
    }

    // First, let user select a suggestion
    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: `Select a suggestion for row ${row}${currentValue ? ` [Current: ${currentValue}]` : ''}:`,
        choices: allChoices,
        loop: false,
      },
    ]);

    // Check if user wants to finish
    if (choice === "(done - finish adding)") {
      break;
    }

    // Determine the default value for the input prompt
    let defaultValue;
    if (choice === "(type custom value)") {
      defaultValue = currentValue;
    } else {
      // If there's already a value, append with comma
      defaultValue = currentValue ? `${currentValue}, ${choice}` : choice;
    }

    // Now prompt for the actual value (pre-filled with the accumulated value)
    const { value } = await inquirer.prompt([
      {
        type: "input",
        name: "value",
        message: `Edit and confirm value for row ${row}:`,
        default: defaultValue,
        validate: (input) => input.trim() !== "" || "Value cannot be empty",
      },
    ]);

    currentValue = value;

    // If multiple suggestions are not allowed for this row, break after first value
    if (!allowMultiple) {
      break;
    }

    // Ask if user wants to add more
    const { addMore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: "Add another value from suggestions?",
        default: false,
      },
    ]);

    if (!addMore) {
      break;
    }
  }

  const finalValue = currentValue;

  // Only save the value if this row has no suggestions yet in preferences.json
  // Check if suggestions are empty or are exactly the defaults
  const isDefault = JSON.stringify(suggestions) === JSON.stringify(DEFAULT_SUGGESTIONS);

  if (isDefault && finalValue) {
    try {
      const currentPrefs = await loadPreferences();
      const s = currentPrefs.suggestions && typeof currentPrefs.suggestions === "object" ? { ...currentPrefs.suggestions } : {};
      // Split the final value by comma to save as array of suggestions
      s[key] = finalValue.split(',').map(v => v.trim()).filter(v => v);
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
  const todayDate = new Date().getDate();
  const dateQuestion = [
    {
      type: "input",
      name: "date",
      message: `Enter date (1-31) [Today: ${todayDate}]:`,
      default: todayDate.toString(),
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

  // Get last inserted values if available
  const lastInsertedValues = preferences.lastInsertedValues || {};

  // If there is only one row, ask a single data prompt
  if (prefRows.length === 1) {
    const row = prefRows[0];
    const lastValue = lastInsertedValues[String(row)];
    const value = await getRowData(row, preferences, lastValue);

    return {
      date: preferences.userRow,
      column,
      rowData: [value],
    };
  }

  // Multiple rows: get data for each row with suggestions
  const values = [];
  for (const row of prefRows) {
    const lastValue = lastInsertedValues[String(row)];
    const value = await getRowData(row, preferences, lastValue);
    values.push(value);
  }

  return {
    date: preferences.userRow,
    column,
    rowData: values,
  };
};
