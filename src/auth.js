import { JWT } from "google-auth-library";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to authenticate with Google Sheets
export const getAuthClient = async () => {
  try {
    const credentialsPath = join(__dirname, "..", "credentials.json");
    const auth = new JWT({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return auth;
  } catch (error) {
    console.error("Error authenticating:", error.message);
    process.exit(1);
  }
};
