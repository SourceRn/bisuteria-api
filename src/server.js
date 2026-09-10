import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { testConnection } from "./config/db.js";
import { iniciarJobsDeSnapshot } from "./jobs/snapshotJobs.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`[server] Yatzari API corriendo en http://localhost:${PORT}`);
  await testConnection();
  iniciarJobsDeSnapshot();
});