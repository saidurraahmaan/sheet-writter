# Sheet Writer

A terminal-based application to insert data into Google Sheets. Perfect for quickly updating attendance, status, or any tabular data from your command line.

## Features

- ✅ Insert data into Google Sheets from terminal
- ✅ Support for multiple rows (batch insert)
- ✅ Configurable start column (date 1 can map to any column, not just A)
- ✅ Persistent user preferences (spreadsheet ID, sheet name, row numbers)
- ✅ Row-specific suggestion system (coming from preferences)
- ✅ Interactive CLI with arrow key navigation
- ✅ Calendar-style mapping (date → column, user → row)

## Prerequisites

Before running this application, you need:

1. **Node.js** (v16 or higher)
2. **A Google account** with access to Google Sheets
3. **Google Sheets API credentials** (service account)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Google Service Account Credentials

Follow these steps to get your credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a service account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service account"
   - Fill in the name (e.g., "sheet-writer-service")
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"
5. Create and download the key:
   - Click on your newly created service account
   - Go to the "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON" format
   - Click "Create" - this downloads the JSON file
6. **Important**: Rename the downloaded file to `credentials.json` and place it in the project root

### 3. Share Your Google Sheet with the Service Account

**⚠️ This step is crucial - the app will fail without it!**

1. Open your Google Sheet in a browser
2. Click the "Share" button (top right)
3. Paste the service account email address from your `credentials.json` file:
   - Open `credentials.json`
   - Copy the value of the `client_email` field
   - Example: `sheet-writer-service@your-project.iam.gserviceaccount.com`
4. Set permission to "Editor"
5. Click "Send"

Now the service account can read and write to your sheet!

### 4. Run the Application

```bash
npm start
```

### 5. First-Time Setup

On first run, the app will prompt you for:

- **Your name**: Used for welcome messages
- **Row number(s)**: Comma-separated if multiple (e.g., `9,10,11`)
- **Spreadsheet ID**: From your Google Sheets URL
  - Example: In `https://docs.google.com/spreadsheets/d/1Bo1Ml91smM7ZjuQ_4mVExNXa95HqUTfRIr7XBc_JYS4/edit`
  - The ID is: `1Bo1Ml91smM7ZjuQ_4mVExNXa95HqUTfRIr7XBc_JYS4`
- **Sheet/tab name**: Name of the specific sheet/tab to write to (e.g., `Sheet1`)
- **Start column**: Column letter for day 1 (default: `A`)

These preferences are saved to `preferences.json` for future use.

## How It Works

### Date → Column Mapping

The app uses a calendar-style mapping where:
- **Date** determines the **column**
- Your configured **row** determines where your data is written
- The **start column** defines what column date 1 maps to

Example with `startColumn = "C"`:
- Date 1 → Column C
- Date 2 → Column D
- Date 28 → Column AC

### Using the App

1. Run `npm start`
2. Enter the date (1-31)
3. For each of your configured rows:
   - Select a suggestion from the list (use ↑/↓ arrows)
   - Edit and confirm the value in the input field
4. Data is written to the sheet
5. Choose whether to add another entry

### Managing Preferences

Edit `preferences.json` to change settings:
```json
{
  "userName": "Your Name",
  "userRow": [9, 10, 11],
  "spreadsheetId": "your-spreadsheet-id",
  "sheetName": "Sheet1",
  "startColumn": "A",
  "suggestions": {
    "9": ["present", "absent", "leave"],
    "10": ["present", "sick", "WFH"],
    "11": ["present", "on vacation"]
  }
}
```

## Project Structure

```
sheet-writter/
├── src/
│   ├── auth.js              # Google authentication
│   ├── userInput.js         # Interactive prompts
│   ├── sheetOperations.js   # Google Sheets API calls
│   ├── preferences.js       # Preference management
│   └── utils.js             # Helper utilities
├── index.js                 # Main application entry
├── preferences.json         # User preferences (auto-generated)
├── credentials.json         # Service account credentials (you provide this)
└── README.md               # This file
```

## Troubleshooting

### "Error inserting data: Sheet '...' not found"
- Check that the sheet name in `preferences.json` exactly matches the tab name (case-sensitive)
- Verify the sheet exists in your spreadsheet

### "Authentication failed"
- Ensure `credentials.json` is in the project root
- Verify the JSON file is valid
- Check that the service account email is added as an editor to the sheet

### "The caller does not have permission"
- Make sure you shared the sheet with the service account email from `credentials.json`
- Confirm the service account has "Editor" permission

### Preferences not saving
- Check that you have write permissions in the project directory
- Ensure `preferences.json` is not open in another program

## Development

### Running in Development Mode

```bash
node index.js
```

### Environment

- Node.js v16+ required
- Uses ES modules (import/export)
- No `.env` file needed - all config in `preferences.json`

## Security Notes

- ✅ `credentials.json` is git-ignored (never commit to version control)
- ✅ `preferences.json` is git-ignored (contains your spreadsheet ID)
- ✅ Service account principle of least privilege (only has access to sheets you explicitly share)

## License

MIT

## Support

For issues or questions, please check the troubleshooting section above or review the code comments for more details.
