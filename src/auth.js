import { OAuth2Client } from "google-auth-library";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, writeFile } from "fs/promises";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const TOKEN_PATH = join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = join(__dirname, "..", "credentials.json");

// Function to get OAuth2 client
async function loadCredentials() {
  const content = await readFile(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id } = credentials.installed || credentials.web;
  // Use out-of-band flow for better compatibility
  const redirectUri = "urn:ietf:wg:oauth:2.0:oob";
  return new OAuth2Client(client_id, client_secret, redirectUri);
}

// Function to get new token after prompting for user authorization
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\nAuthorize this app by visiting this url:\n", authUrl);
  console.log("\nAfter authorizing, Google will show you an authorization code.");
  console.log("Copy that code and paste it here:\n");

  // Use dynamic import for inquirer
  const inquirer = (await import("inquirer")).default;

  const { code } = await inquirer.prompt([
    {
      type: "input",
      name: "code",
      message: "Enter the authorization code:",
    },
  ]);

  try {
    if (!code || code.trim() === "") {
      throw new Error("No authorization code provided");
    }

    console.log("Exchanging authorization code for tokens...");

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Token exchange timed out after 30 seconds")), 30000)
    );

    const { tokens } = await Promise.race([
      oAuth2Client.getToken(code.trim()),
      timeoutPromise
    ]);

    oAuth2Client.setCredentials(tokens);

    // Store the token to disk for later program executions
    await writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log("\nToken stored to", TOKEN_PATH);
    console.log("Authentication successful!\n");

    return oAuth2Client;
  } catch (error) {
    console.error("\nError details:", error);
    throw new Error(`Failed to get token: ${error.message}`);
  }
}

// Function to authenticate with Google Sheets
export const getAuthClient = async () => {
  try {
    const oAuth2Client = await loadCredentials();

    // Check if we have previously stored a token
    try {
      const token = await readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    } catch (err) {
      // No token found, get a new one
      return await getNewToken(oAuth2Client);
    }
  } catch (error) {
    console.error("Error authenticating:", error.message);
    console.error(
      "\nMake sure you have downloaded OAuth 2.0 credentials from Google Cloud Console"
    );
    console.error(
      "and saved them as 'credentials.json' in the project root directory."
    );
    process.exit(1);
  }
};
