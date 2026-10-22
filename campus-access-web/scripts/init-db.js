import { initStore, getStoreInfo } from "../server/lib/store.js";

try {
  const data = await initStore();
  const info = getStoreInfo();

  console.log("Database initialized.");
  console.log(`Host: ${info.host}:${info.port}`);
  console.log(`Database: ${info.database}`);
  console.log(`Tables: ${info.tables.length}`);
  console.log(`Users: ${data.users.length}`);
  console.log(`People: ${data.people.length}`);
  console.log(`Access records: ${data.accessRecords.length}`);
  process.exit(0);
} catch (error) {
  console.error("Database initialization failed.");
  console.error(error.message);
  process.exit(1);
}
