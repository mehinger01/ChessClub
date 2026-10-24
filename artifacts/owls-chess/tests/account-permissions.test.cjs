const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { accountConfiguration, displayNameSchema } = require("../src/lib/accounts.ts");

test("account configuration stays local until explicitly enabled and rejects secret/legacy keys", () => {
  assert.deepEqual(accountConfiguration({}), { enabled: false });
  assert.throws(() => accountConfiguration({ VITE_CHESS_ACCOUNTS_ENABLED: "true" }));
  for (const key of ["sb_secret_test", "service_role", "eyJhbGciOiJIUzI1NiJ9.test"]) {
    assert.throws(() => accountConfiguration({ VITE_CHESS_ACCOUNTS_ENABLED: "true", VITE_SUPABASE_URL: "https://test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: key }));
  }
  assert.equal(accountConfiguration({ VITE_CHESS_ACCOUNTS_ENABLED: "true", VITE_SUPABASE_URL: "https://test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }).enabled, true);
  assert.equal(displayNameSchema.parse("  Chess player  "), "Chess player");
});

test("actual Postgres RLS isolates students and clubs, permits scoped staff reads and prevents self-promotion", async () => {
  const db = new PGlite();
  const ids = { a: "00000000-0000-4000-8000-000000000001", b: "00000000-0000-4000-8000-000000000002", teacher: "00000000-0000-4000-8000-000000000003", outsider: "00000000-0000-4000-8000-000000000004" };
  const clubs = { a: "00000000-0000-4000-8000-000000000011", b: "00000000-0000-4000-8000-000000000012" };
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    const dir = path.resolve(__dirname, "../../../supabase/migrations");
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const [name, id] of Object.entries(ids)) {
      await db.query("insert into auth.users values ($1)", [id]);
      await db.query("insert into chess_profiles(user_id,display_name) values($1,$2)", [id, "Player " + name]);
    }
    await db.query("insert into chess_clubs(id,name) values($1,'Falcons'),($2,'Other Club')", [clubs.a, clubs.b]);
    for (const [name, role] of [["a", "student"], ["b", "student"], ["teacher", "teacher"]]) await db.query("insert into chess_memberships(club_id,user_id,role) values($1,$2,$3)", [clubs.a, ids[name], role]);
    await db.query("insert into chess_memberships(club_id,user_id,role) values($1,$2,'student')", [clubs.b, ids.outsider]);
    async function asUser(id, query, params = []) {
      await db.exec("begin; set local role authenticated;");
      try {
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
        const result = await db.query(query, params); await db.exec("commit"); return result.rows;
      } catch (error) { await db.exec("rollback"); throw error; }
    }
    assert.equal((await asUser(ids.a, "select * from chess_profiles")).length, 1);
    assert.equal((await asUser(ids.a, "select * from chess_memberships")).length, 1);
    assert.equal((await asUser(ids.a, "select * from chess_clubs")).length, 1);
    assert.equal((await asUser(ids.teacher, "select * from chess_profiles")).length, 3);
    assert.equal((await asUser(ids.teacher, "select * from chess_memberships")).length, 3);
    assert.equal((await asUser(ids.outsider, "select * from chess_profiles")).length, 1);
    assert.equal((await asUser(ids.a, "update chess_profiles set display_name='Mine' where user_id=$1 returning *", [ids.a])).length, 1);
    assert.equal((await asUser(ids.a, "update chess_profiles set display_name='Hacked' where user_id=$1 returning *", [ids.b])).length, 0);
    await assert.rejects(asUser(ids.a, "update chess_profiles set user_id=$1 where user_id=$2", [ids.b, ids.a]));
    await assert.rejects(asUser(ids.a, "update chess_memberships set role='admin' where user_id=$1", [ids.a]));
    await assert.rejects(asUser(ids.a, "insert into chess_memberships(club_id,user_id,role) values($1,$2,'admin')", [clubs.b, ids.a]));
    await assert.rejects(asUser(ids.a, "insert into chess_profiles(user_id,display_name) values($1,'Fake')", ["00000000-0000-4000-8000-000000000099"]));
    await db.query("update chess_memberships set active=false where user_id=$1", [ids.teacher]);
    assert.equal((await asUser(ids.teacher, "select * from chess_profiles")).length, 1);
    assert.equal((await asUser(ids.teacher, "select * from chess_clubs")).length, 0);
    await db.exec("begin; set local role anon");
    await assert.rejects(db.query("select * from chess_profiles"));
    await db.exec("rollback");
    const policies = await db.query("select relname,relrowsecurity from pg_class where relname in ('chess_profiles','chess_clubs','chess_memberships')");
    assert.equal(policies.rows.length, 3);
    assert.equal(policies.rows.every(row => row.relrowsecurity), true);
  } finally { await db.close(); }
});
