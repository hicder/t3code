import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

// Sessions minted from reusable enrollment credentials retain their source so
// access management can distinguish each device session from the shared key.
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string }>`
    PRAGMA table_info(auth_sessions)
  `;

  if (!columns.some((column) => column.name === "source_pairing_link_id")) {
    yield* sql`
      ALTER TABLE auth_sessions
      ADD COLUMN source_pairing_link_id TEXT
    `;
  }

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_source_pairing_link
    ON auth_sessions(source_pairing_link_id)
  `;
});
