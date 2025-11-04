import inquirer from "inquirer";
import { getAuthClient } from "./src/auth.js";
import { getUserInput, setupPreferences } from "./src/userInput.js";
import { appendToSheet } from "./src/sheetOperations.js";
import { loadPreferences } from "./src/preferences.js";

// Main function
const main = async () => {
  try {
    const auth = await getAuthClient();
    console.log("Authentication successful!");

    // Check if preferences exist or need to be set up
    let preferences;
    try {
      preferences = await loadPreferences();
      console.log(`Welcome back, ${preferences.userName}!`);
    } catch {
      console.log("First time setup...");
      preferences = await setupPreferences();
    }

    let shouldContinue = true;
    while (shouldContinue) {
      const userData = await getUserInput();
      await appendToSheet(auth, userData);

      const { continue: wantsToContinue } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continue",
          message: "Do you want to add another entry?",
          default: false,
        },
      ]);
      
      shouldContinue = wantsToContinue;
    }

    console.log("Goodbye!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

// Start the application
main();
