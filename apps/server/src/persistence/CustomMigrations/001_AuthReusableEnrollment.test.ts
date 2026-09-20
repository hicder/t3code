import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";

import { runCustomMigrations, runMigrations } from "../Migrations.ts";

const withMemoryDatabase = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
  effect.pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" })));

const readSourceColumn = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const columns = yield* sql<{ readonly name: string; readonly notnull: number }>`
    PRAGMA table_info(auth_sessions)
  `;
  return columns.find((column) => column.name === "source_pairing_link_id");
});

describe("custom/001_AuthReusableEnrollment", () => {
  it.effect("adds the enrollment source column after upstream migrations", () =>
    withMemoryDatabase(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* runMigrations();
        assert.equal(yield* readSourceColumn, undefined);
        yield* runCustomMigrations();

        const source = yield* readSourceColumn;
        assert.equal(source?.notnull, 0);

        const recorded = yield* sql<{ readonly migration_id: number; readonly name: string }>`
          SELECT migration_id, name FROM effect_custom_sql_migrations
        `;
        assert.deepStrictEqual(
          recorded.map((row) => [Number(row.migration_id), row.name]),
          [[1, "AuthReusableEnrollment"]],
        );
      }),
    ),
  );

  it.effect("tolerates databases that added the column under an upstream slot", () =>
    withMemoryDatabase(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        yield* runMigrations();
        yield* sql`ALTER TABLE auth_sessions ADD COLUMN source_pairing_link_id TEXT`;

        assert.deepStrictEqual(yield* runCustomMigrations(), [[1, "AuthReusableEnrollment"]]);
        assert.equal((yield* readSourceColumn)?.name, "source_pairing_link_id");
      }),
    ),
  );
});
