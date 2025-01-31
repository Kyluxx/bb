import { connectDB, connection } from "./connection.js";

// Callable function to add a game
async function addGame(gameName, gameGenre) {
  try {
    await connectDB(); // Ensure DB is connected

    // Example query to add a new game
    const query = "INSERT INTO games (name, genre) VALUES (?, ?)";
    const [result] = await connection.execute(query, [gameName, gameGenre]);
    
    console.log("Game added successfully:", result);
    return result; // You can return the result if needed
  } catch (error) {
    console.error("❌ Error adding game:", error.message);
  }
}

export { addGame };
