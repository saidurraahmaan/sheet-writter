import { google } from "googleapis";
import { getColumnLetter, getColumnNumber } from "./utils.js";
import { loadPreferences } from './preferences.js';

// Function to insert data into specific cell based on date and column
export const appendToSheet = async (auth, data) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    // load spreadsheet id and sheet name from preferences
    const prefs = await loadPreferences();
    const spreadsheetId = prefs.spreadsheetId;
    const targetSheetName = prefs.sheetName.replace(/^'|'$/g, "");

    // First, get the sheet ID
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheet = response.data.sheets.find((s) => s.properties.title === targetSheetName);
    if (!sheet) {
      throw new Error(`Sheet "${targetSheetName}" not found`);
    }

  // Determine the base column from preferences (startColumn represents day 1)
  const startColumnLetter = prefs.startColumn || 'A';
  const baseColumnNumber = getColumnNumber(startColumnLetter);

  // Column is offset from startColumn by (date - 1)
  const columnNumber = baseColumnNumber + (parseInt(data.column) - 1);
  // Convert final column number to letter (1=A, 2=B, etc.)
  const columnLetter = getColumnLetter(columnNumber);

  // If userRow is an array, write to multiple rows. Otherwise update a single cell.
    const userRows = Array.isArray(data.date)
      ? data.date.map((r) => parseInt(r, 10))
      : [parseInt(data.date, 10)];

    // Determine values to write per row. Prefer explicit rowData (from user prompts). If absent,
    // fall back to data.data for backward compatibility.
    let rowValues = [];
    if (Array.isArray(data.rowData) && data.rowData.length === userRows.length) {
      rowValues = data.rowData;
    } else if (data.data !== undefined) {
      rowValues = userRows.map(() => data.data);
    } else {
      // No data provided; treat as empty strings
      rowValues = userRows.map(() => "");
    }

    if (userRows.length === 1) {
      // Single cell update
      const singleRange = `${sheet.properties.title}!${columnLetter}${userRows[0]}`;
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: singleRange,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[rowValues[0]]],
        },
      });

      console.log('\n' + '='.repeat(60));
      console.log('✓ SUCCESS!');
      console.log('='.repeat(60));
      console.log(`📊 Sheet: ${sheet.properties.title}`);
      console.log(`📍 Cell: ${columnLetter}${userRows[0]}`);
      console.log(`📝 Value: ${rowValues[0]}`);
      console.log('='.repeat(60) + '\n');
      return updateResponse;
    }

    // Multiple rows: prepare batchUpdate data entries (one range per row)
    const dataEntries = userRows.map((row, idx) => ({
      range: `${sheet.properties.title}!${columnLetter}${row}`,
      values: [[rowValues[idx]]],
    }));

    const batchResponse = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: "USER_ENTERED",
        data: dataEntries,
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('✓ SUCCESS!');
    console.log('='.repeat(60));
    console.log(`📊 Sheet: ${sheet.properties.title}`);
    console.log(`📍 Cells Updated: ${userRows.length}`);
    dataEntries.forEach((entry, idx) => {
      const cellRef = entry.range.split('!')[1];
      console.log(`   ${idx + 1}. ${cellRef} = ${rowValues[idx]}`);
    });
    console.log('='.repeat(60) + '\n');
    return batchResponse;
  } catch (error) {
    console.error("Error inserting data:", error.message);
    process.exit(1);
  }
};
