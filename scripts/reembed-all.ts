import { config } from "dotenv";
config({ path: ".env.local" });

import { scrollAll, backfillEmbeddings } from "../lib/elastic";

async function main() {
  console.log("Fetching all entries from Elasticsearch...");
  const entries = await scrollAll();
  console.log(`Found ${entries.length} entries. Re-embedding with retrieval.passage task type...`);

  await backfillEmbeddings(entries, (msg) => console.log(msg));

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
