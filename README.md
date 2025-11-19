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
3. **Google Sheets API credentials** (OAuth 2.0)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create OAuth 2.0 Credentials

Follow these steps to get your OAuth credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Configure the OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" user type (unless you have a Google Workspace)
   - Click "Create"
   - Fill in the required fields:
     - App name (e.g., "Sheet Writer")
     - User support email (your email)
     - Developer contact information (your email)
   - Click "Save and Continue"
   - On the Scopes page, click "Add or Remove Scopes"
   - Add the scope: `https://www.googleapis.com/auth/spreadsheets`
   - Click "Update" then "Save and Continue"
   - Add your email as a test user
   - Click "Save and Continue"
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Desktop app" as the application type
   - Give it a name (e.g., "Sheet Writer Desktop")
   - Click "Create"
   - Click "Download JSON" on the popup
6. **Important**: Rename the downloaded file to `credentials.json` and place it in the project root

### 3. First-Time Authorization

When you run the app for the first time:

1. The app will display an authorization URL
2. Open the URL in your browser
3. Sign in with your Google account
4. You may see "Access blocked" - click **"Advanced"** then **"Go to Sheet Writer (unsafe)"**
5. Grant the requested permissions
6. **Google will display an authorization code on the page**
7. **Copy the authorization code** (not the URL, just the code)
8. Paste it into the terminal when prompted
9. Wait for the token exchange to complete (may take 10-30 seconds)

The token is saved to `token.json` and will be reused for subsequent runs, so you only need to authorize once.

### 4. Run the Application

```bash
npm start
```

### 5. Configure Your Preferences

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
├── credentials.json         # OAuth 2.0 credentials (you provide this)
├── token.json              # OAuth access token (auto-generated after first auth)
└── README.md               # This file
```

## Troubleshooting

### "Error inserting data: Sheet '...' not found"
- Check that the sheet name in `preferences.json` exactly matches the tab name (case-sensitive)
- Verify the sheet exists in your spreadsheet

### "Authentication failed"
- Ensure `credentials.json` is in the project root
- Verify the JSON file is valid (should contain OAuth 2.0 client credentials, not service account)
- Delete `token.json` and re-authorize if you're having authentication issues

### "The caller does not have permission"
- Make sure you're signed in with a Google account that has access to the sheet
- Ensure the sheet exists and you have edit permissions
- Try deleting `token.json` and re-authorizing with the correct Google account

### "Token exchange times out"
- The token exchange can take 10-30 seconds - please be patient
- Check your internet connection
- If it times out after 30 seconds, try again with a fresh authorization code
- Make sure you're not behind a restrictive firewall that blocks Google OAuth endpoints

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
- ✅ `token.json` is git-ignored (contains your OAuth access token)
- ✅ `preferences.json` is git-ignored (contains your spreadsheet ID)
- ✅ OAuth 2.0 provides secure user authentication with limited scope access
- ✅ You only grant access to Google Sheets API, not full Google account access

## License

MIT

## Support

For issues or questions, please check the troubleshooting section above or review the code comments for more details.
