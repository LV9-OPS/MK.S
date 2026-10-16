import path from "node:path";

process.env.DATABASE_URL = "file:./test.db";
process.env.STORAGE_DIR = path.resolve(__dirname, "../../storage-test");
process.env.TEAM_TIMEZONE = "Europe/Paris";
process.env.FACEIT_API_KEY = "";
process.env.FACEIT_GAME_ID = "";
