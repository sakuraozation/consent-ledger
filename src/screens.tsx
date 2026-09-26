// 3つの画面。どれも判定を持たず、ledger の verdict をそのまま映す。
import { Hono } from "hono";
import { getPendingByRequest, pollApproval, startApproval, sweep } from "./approval";
import { readChainDelegation } from "./chain";
import { activeFor, grant as grantDelegation, listFor, roster, withdraw } from "./delegation";
import { bySubject, check, put, record, revoke, summaryFor, usesBySubject } from "./ledger";
import { Boundary, ChainPanel, EngagementCard, Page, ScopeGrid, UseLog, VerdictBox } from "./ui";
import { type Proof, REQUIRED_LEVEL, verifyProof } from "./worldid";

export const screens = new Hono<{ Bindings: Env }>();

/** content-type の無い POST で Hono の formData() が投げる。空として扱い、500 にしない。 */
const form = async (c: { req: { formData: () => Promise<FormData> } }): Promise<FormData> => {
  try {
    return await c.req.formData();
  } catch {
    return new FormData();
  }
};

const DEMO_SUBJECT = "model-a";
/** この作品で扱う範囲。委任はこの単位で掛かる（全か無かにしない）。 */
const SCOPES = ["ad-image", "social-post", "lookbook", "nsfw"] as const;

screens.get("/", (c) => c.redirect("/generate"));

/** 期間の選択を期日にする。契約の期間は月単位・デモ用の90秒だけ別扱い。 */
const termToExpiry = (term: string): number => {
  if (term === "demo") return Date.now() + 90_000;
  if (term === "quarter") return Date.now() + 90 * 86_400_000;
  return Date.UTC(2026, 11, 31, 23, 59, 59);
};

type ChangeRequest = { id: string; subject: string; consentId?: string; at: number };

/** 範囲ごとにチェーン上の役割を読む。表に出すためだけの読み取り。 */
const rolesByScope = async (env: Env, subject?: string): Promise<Record<string, boolean>> => {
  const states = await Promise.all(SCOPES.map((sc) => readChainDelegation(env, env.ENS_CUSTODIAN, sc, subject)));
  const out: Record<string, boolean> = {};
  SCOPES.forEach((sc, i) => {
    const st = states[i];
    if (st?.ok) out[sc] = st.granted === true;
  });
  return out;
};

/** まだ電話していない申し出。会話は持たない＝1行が立つだけ。 */
const openRequests = async (db: D1Database): Promise<ChangeRequest[]> => {
  const { results } = await db
    .prepare("SELECT id, subject, consent_id, at FROM change_requests WHERE handled_at IS NULL ORDER BY at DESC")
    .all<{ id: string; subject: string; consent_id: string | null; at: number }>();
  return results.map((r) => ({ id: r.id, subject: r.subject, consentId: r.consent_id ?? undefined, at: r.at }));
};

/**
 * 事務所の一覧。**複数のモデルを代理している**のが実態なので、入口は名簿。
 * 渡されている範囲がモデルごとに違うことも、ここで一目で分かる。
 * 台帳に名前は持たない（subject は識別子）＝誰なのかは事務所の側の情報。
 */
screens.get("/agency", async (c) => {
  const [people, requests, chainByScope] = await Promise.all([
    roster(c.env.DB),
    openRequests(c.env.DB),
    rolesByScope(c.env),
  ]);
  const summaries = await Promise.all(people.map((d) => summaryFor(c.env.DB, d.subject)));
  const chainSubject = c.env.ENS_SUBJECT;
  return c.html(
    <Page title="Agency — your roster" here="agency">
      <h1>Your roster</h1>
      <Boundary
        holds="This page holds rights: for each person, what may be used, in what scope, until when."
        stays="Bookings, casting, scheduling and the negotiation stay yours. Nothing here replaces a phone call."
      />
      {requests.length > 0 ? (
        <>
          <h2>They asked you to call them</h2>
          <p class="sub">
            Terms are settled between people. This only says who to ring — there is no message to read here
            and no reply to send.
          </p>
          {requests.map((r) => (
            <div class="card">
              <div class="row">
                <strong>{r.subject}</strong>
                <form method="post" action={`/agency/requests/${r.id}/handled`}>
                  <button type="submit" class="ghost">
                    I called them
                  </button>
                </form>
              </div>
              <div class="meta">
                asked about an engagement at {new Date(r.at).toISOString().slice(11, 19)}Z
                {r.consentId ? ` · ${r.consentId.slice(0, 8)}` : ""}
              </div>
            </div>
          ))}
        </>
      ) : null}

      <h2>Who you represent</h2>
      <p class="sub">
        Not everyone hands over the same things. What each person delegated is the first thing on their
        row, because it decides what you can do at all.
      </p>
      {people.length === 0 ? (
        <p class="dim">Nobody has put you on record yet.</p>
      ) : (
        people.map((d, i) => {
          const sum = summaries[i];
          const withheld = SCOPES.filter((sc) => !d.scopes.includes(sc));
          return (
            <div class="card">
              <div class="row">
                <a href={`/agency/${encodeURIComponent(d.subject)}`} class="term">
                  {d.subject}
                </a>
                <span class={`pill ${sum && sum.live > 0 ? "allow" : "ask"}`}>
                  {sum ? `${sum.live} live` : "—"}
                </span>
              </div>
              <div class="meta">
                you handle <strong>{d.scopes.join(", ") || "nothing"}</strong>
                {withheld.length > 0 ? ` · they kept ${withheld.join(", ")}` : ""}
              </div>
              <div class="meta dim">
                {sum ? `${sum.lapsed} lapsed · ${sum.ended} ended early · ${sum.refusals} requests refused` : ""}
              </div>
            </div>
          );
        })
      )}

      <h2>Where the authority is held</h2>
      <p class="sub">
        Each scope is a separate role on the person's own ENS name — so what they kept cannot be widened from
        here, by us or by you. One name was registered for this build
        {chainSubject ? (
          <>
            {" "}
            (<strong>{chainSubject}</strong>); the rest are recorded in this service only
          </>
        ) : null}
        .
      </p>
      <ScopeGrid
        all={SCOPES}
        delegated={people.find((d) => d.subject === chainSubject)?.scopes ?? []}
        audience="agency"
        onChain={chainByScope}
      />
    </Page>,
  );
});

/** モデル1人の詳細。ここが実際の作業面（載せる・早期に終える）。 */
screens.get("/agency/:subject", async (c) => {
  const subject = c.req.param("subject");
  const [consents, delegation, requests, chainByScope, uses] = await Promise.all([
    bySubject(c.env.DB, subject),
    activeFor(c.env.DB, subject),
    openRequests(c.env.DB),
    rolesByScope(c.env, subject),
    usesBySubject(c.env.DB, subject),
  ]);
  const now = Date.now();
  const live = consents.filter((x) => x.revokedAt === undefined && x.expiresAt > now);
  const done = consents.filter((x) => !(x.revokedAt === undefined && x.expiresAt > now));
  const mine = requests.filter((r) => r.subject === subject);
  return c.html(
    <Page title={`Agency — ${subject}`} here="agency">
      <p class="meta">
        <a href="/agency" class="dim">
          ← Your roster
        </a>
      </p>
      <h1>{subject}</h1>
      {delegation ? (
        <p class="sub">
          On record with you since {new Date(delegation.grantedAt).toISOString().slice(11, 19)}Z. You act
          only within what they delegated.
        </p>
      ) : (
        <p class="sub deny">
          Nothing is on record for this person. Until it is, anything you put here will be refused.
        </p>
      )}

      {mine.length > 0 ? (
        <div class="card">
          <div class="row">
            <strong>They asked you to call them</strong>
            <form method="post" action={`/agency/requests/${mine[0]?.id}/handled`}>
              <button type="submit" class="ghost">
                I called them
              </button>
            </form>
          </div>
          <div class="meta">Settle the terms on the phone, then change the record here.</div>
        </div>
      ) : null}

      <h2>What they delegated to you</h2>
      <ScopeGrid
        all={SCOPES}
        delegated={delegation?.scopes ?? []}
        audience="agency"
        onChain={chainByScope}
      />
      <p class="meta dim">
        A scope they kept is not yours to act on. A request for it goes to them directly, and only they can
        answer it.
      </p>

      {delegation && delegation.scopes.length > 0 ? (
        <>
          <h2>Put an engagement on the record</h2>
          <form method="post" action="/agency/consents">
            <input type="hidden" name="subject" value={subject} />
            <select name="scope" aria-label="scope">
              {delegation.scopes.map((sc) => (
                <option value={sc}>{sc}</option>
              ))}
            </select>{" "}
            <select name="term" aria-label="term">
              <option value="year">until 31 Dec 2026</option>
              <option value="quarter">for 3 months</option>
              <option value="demo">90 seconds — to watch a term lapse</option>
            </select>{" "}
            <button type="submit">Record it</button>
          </form>
          <p class="meta dim">
            The period is the part that does the work. Most engagements end by running out, not by anyone
            pressing anything.
          </p>
        </>
      ) : null}

      <h2>Live</h2>
      {live.length === 0 ? (
        <p class="dim">Nothing is live.</p>
      ) : (
        live.map((x) => (
          <EngagementCard
            c={x}
            action={
              x.approvedBySub
                ? undefined
                : { label: "Stop this use", href: `/agency/${x.id}/revoke`, method: "post", ghost: true }
            }
          />
        ))
      )}
      <p class="meta dim">
        Stop this use is for a deal that genuinely ends early. What the person answered themselves is not
        yours to end.
      </p>

      <h2>Lapsed and ended</h2>
      {done.length === 0 ? <p class="dim">Nothing yet.</p> : done.map((x) => <EngagementCard c={x} />)}

      <h2>Every request, including the refusals</h2>
      <UseLog uses={uses} />
    </Page>,
  );
});

screens.post("/agency/consents", async (c) => {
  const f = await form(c);
  const subject = String(f.get("subject") ?? DEMO_SUBJECT);
  const delegation = await activeFor(c.env.DB, subject);
  // 権限が記録されていなければ事務所は載せられない。ここが権利の線。
  if (!delegation) return c.redirect("/agency");
  await put(c.env.DB, {
    id: crypto.randomUUID(),
    subject,
    scopes: [String(f.get("scope") ?? "ad-image")],
    expiresAt: termToExpiry(String(f.get("term") ?? "year")),
    custodian: delegation.custodian,
    delegationId: delegation.id,
  });
  return c.redirect(`/agency/${encodeURIComponent(subject)}`);
});

/** 電話した、の記録。会話の内容は持たない。 */
screens.post("/agency/requests/:id/handled", async (c) => {
  await c.env.DB.prepare("UPDATE change_requests SET handled_at = ? WHERE id = ?")
    .bind(Date.now(), c.req.param("id"))
    .run();
  return c.redirect("/agency");
});

/** 日常の取り消しは事務所がやる（本人から連絡が来たら押す）。 */
screens.post("/agency/:id/revoke", async (c) => {
  await revoke(c.env.DB, c.req.param("id"), "custodian");
  return c.redirect("/agency");
});

/** 本人の画面。押す物がひとつだけある。窓口を通さずに効く。 */
screens.get("/me", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  const asked = c.req.query("asked");
  const [mine, uses, delegations, chain, chainByScope] = await Promise.all([
    bySubject(c.env.DB, subject),
    usesBySubject(c.env.DB, subject),
    listFor(c.env.DB, subject),
    readChainDelegation(c.env, c.env.ENS_CUSTODIAN, undefined, subject),
    rolesByScope(c.env, subject),
  ]);
  const live = delegations.find((d) => d.withdrawnAt === undefined);
  return c.html(
    <Page title="What you are tied to" here="me">
      <h1>What you are tied to, and until when</h1>
      <p class="sub">
        Your agency handles the deals — the calls, the bookings, the negotiation. This page is so you can
        see what you are tied to, and until when.
      </p>
      <Boundary
        holds="What you see here: the engagements on record, their terms, and every time someone asked to use your data."
        stays="What stays with people: changing a deal. Ask your agency and they will call you back."
      />

      <h2>Who acts for you</h2>
      {live ? (
        <div class="card">
          <div class="row">
            <strong>{live.custodian}</strong>
            <span class="pill allow">on record</span>
          </div>
          <div class="meta">
            Representing you since {new Date(live.grantedAt).toISOString().slice(11, 19)}Z. They put the
            terms you agreed onto the record; they cannot go outside them.
          </div>
        </div>
      ) : null}
      {live ? (
        <>
          <p class="sub">
            You do not have to hand over everything. They act for you only in what you gave them — the rest
            is yours, and nobody can agree to it on your behalf.
          </p>
          <ScopeGrid
            all={SCOPES}
            delegated={live.scopes}
            audience="model"
            onChain={chainByScope}
            chainOk={chain.configured ? chain.ok : undefined}
          />
        </>
      ) : null}
      {!live ? (
        <div class="card">
          <div class="row">
            <strong class="dim">Nobody is on record for you</strong>
          </div>
          <div class="meta">Until they are, nothing they agree to will be honoured.</div>
          <form method="post" action="/me/delegations" style="display:block;margin-top:.75rem">
            <input type="hidden" name="subject" value={subject} />
            <div class="meta" style="margin-bottom:.4rem">Choose what they may handle:</div>
            {SCOPES.map((sc) => (
              <label class="meta" style="margin-right:1rem">
                <input type="checkbox" name={sc} checked={sc !== "nsfw"} /> {sc}
              </label>
            ))}
            <p style="margin:.6rem 0 0">
              <button type="submit">Put my agency on record</button>
            </p>
          </form>
        </div>
      ) : null}

      <h2>What you are tied to</h2>
      <p class="sub">
        Each one ends when its term ends. Nobody has to do anything for that to happen — which is why the
        date is the first thing on the card.
      </p>
      {mine.length === 0 ? (
        <p class="dim">Nothing on record.</p>
      ) : (
        mine.map((x) => (
          <EngagementCard
            c={x}
            action={
              x.revokedAt === undefined && x.expiresAt > Date.now()
                ? {
                    label: "Ask to change this",
                    href: `/me/requests?consent=${x.id}&subject=${encodeURIComponent(subject)}`,
                    method: "post",
                    ghost: true,
                  }
                : undefined
            }
          />
        ))
      )}
      {asked ? <p class="meta allow">Your agency has been told to call you.</p> : null}

      <h2>Where your data was used</h2>
      <p class="sub">
        Every time someone asked to generate from your data it is here, including the times they were
        refused. This is the part you could never see before.
      </p>
      <UseLog uses={uses} />

      <h2>The same authority, on chain</h2>
      <p class="sub">
        Who may speak for you is not only recorded in this app. On ENSv2 it is a role on your name, scoped
        to the one record that holds your consent — so your agency can write that and nothing else. No
        server has to cooperate for that limit to hold.
      </p>
      <ChainPanel s={chain} />

      {live ? (
        <div class="exception">
          <h2>If something happened that no agreement covers</h2>
          <p class="sub">
            A leaked scan. Something generated that no deal covers. Someone acting as you. These are not
            deals running their course, and they are the only time you act directly instead of calling your
            agency. This ends the authority itself, and every engagement under it stops at once.
          </p>
          <p>
            <a href={`/me/delegations/${live.id}/withdraw`} class="btnlink">
              Take back all authority
            </a>
          </p>
          <p class="meta dim">
            We check that a real person is doing this, because it overrides an agreement rather than
            following one. You will probably never need it.
          </p>
        </div>
      ) : null}
    </Page>,
  );
});

/** 申し出。会話は持たない＝事務所の画面に1行立てて、電話に戻す。 */
screens.post("/me/requests", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  await c.env.DB.prepare("INSERT INTO change_requests (id, subject, consent_id, at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), subject, c.req.query("consent") ?? null, Date.now())
    .run();
  return c.redirect(`/me?subject=${encodeURIComponent(subject)}&asked=1`);
});

/** 委任する。実運用では World ID の承認を通す（デモでは1クリック）。 */
screens.post("/me/delegations", async (c) => {
  const f = await form(c);
  const picked = SCOPES.filter((sc) => f.get(sc) !== null);
  await grantDelegation(c.env.DB, {
    subject: String(f.get("subject") ?? DEMO_SUBJECT),
    scopes: picked.length > 0 ? [...picked] : ["ad-image"],
    custodian: "Tokyo Model Agency",
  });
  return c.redirect("/me");
});

/**
 * 本人だけの一手。**押す前に本人確認を通す**——この操作は他の誰にも代行させられない
 * ものとして設計してあるのに、誰でも押せるままでは主張が成立しない。
 * 要る資格は「実在する人間で、前と同じ人」だけ＝Proof of Human で足りる（身元は不要）。
 */
screens.get("/me/delegations/:id/withdraw", async (c) => {
  const appId = c.env.WORLD_APP_ID;
  const action = c.env.WORLD_WITHDRAW_ACTION ?? c.env.WORLD_ACTION;
  const id = c.req.param("id");
  const failed = c.req.query("failed");
  return c.html(
    <Page title="Confirm it is you" here="me">
      <h1>Taking back all authority</h1>
      <p class="sub">
        This stops every consent your agency issued under the delegation, at once, and they cannot undo it.
        Because nobody may do this on your behalf, we check that a real person is doing it — and that it is
        the same person as before. We do not learn who you are.
      </p>
      <div class="card">
        <div class="meta">
          Credential required: <strong>{REQUIRED_LEVEL}</strong> (Proof of Human). Not a passport, not a
          selfie — identity is not what this needs. Continuity is.
        </div>
      </div>
      {failed ? (
        <div class="card">
          <div class="row">
            <strong>Authority not taken back</strong>
            <span class="pill deny">refused</span>
          </div>
          <div class="meta">{failed}</div>
        </div>
      ) : null}
      {appId && action ? (
        <>
          <p>
            <button type="button" id="go">
              Verify with World ID, then take it back
            </button>{" "}
            <a href="/me" class="dim">
              Cancel
            </a>
          </p>
          <pre id="out" class="paste" />
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 自前の定数スクリプト */}
          <script
            type="module"
            dangerouslySetInnerHTML={{
              __html: `
import "https://cdn.jsdelivr.net/npm/@worldcoin/idkit-standalone@2/build/index.global.js";
const out = document.getElementById("out");
const show = (t) => { out.textContent = t; };
IDKit.init({
  app_id: ${JSON.stringify(appId)},
  action: ${JSON.stringify(action)},
  verification_level: ${JSON.stringify(REQUIRED_LEVEL)},
  handleVerify: async (proof) => {
    // 証明はサーバへ渡すだけ。ここでの成功をそのまま権限に使わない。
    const r = await fetch(location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proof),
    });
    const body = await r.json();
    if (!r.ok) { show("Refused: " + (body.detail || body.reason)); throw new Error(body.reason); }
    location.href = "/me";
  },
  onError: (e) => show("Cancelled or failed — nothing was withdrawn. " + (e?.code ?? "")),
});
document.getElementById("go").addEventListener("click", () => IDKit.open());
`,
            }}
          />
          <p class="dim">
            If you close the window, or the credential is not strong enough, the delegation stays exactly as
            it is. Refusing to verify does not withdraw anything.
          </p>
        </>
      ) : (
        <p class="dim">World ID is not configured on this deployment, so this action cannot be confirmed.</p>
      )}
      <p class="dim">Delegation {id}</p>
    </Page>,
  );
});

screens.post("/me/delegations/:id/withdraw", async (c) => {
  const proof = (await c.req.json().catch(() => null)) as Proof | null;
  if (!proof) {
    // 証明なしの POST は通さない（フォームからの直叩きもここで止まる）
    return c.json({ reason: "proof_required", detail: "Verify with World ID first." }, 400);
  }
  const action = c.env.WORLD_WITHDRAW_ACTION ?? c.env.WORLD_ACTION ?? "";
  const checked = await verifyProof(c.env, proof, { action, db: c.env.DB });
  if (!checked.ok) {
    // 検証が通らない限り委任はそのまま。ここが「本人の一手」の実装。
    return c.json({ reason: checked.reason, detail: checked.detail }, checked.status);
  }
  const d = await withdraw(c.env.DB, c.req.param("id"));
  if (!d) return c.json({ reason: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE delegations SET withdrawn_by_nullifier = ? WHERE id = ?")
    .bind(checked.nullifier, d.id)
    .run();
  return c.json({ ok: true, withdrawn: d.id, verifiedAs: checked.nullifier });
});

/** 生成する側。押すと、生成の前に照会が走る。 */
screens.get("/generate", async (c) => {
  const subject = c.req.query("subject") ?? DEMO_SUBJECT;
  const scope = c.req.query("scope") ?? "ad-image";
  const asked = c.req.query("asked");
  const chain = await readChainDelegation(c.env, c.env.ENS_CUSTODIAN, scope, subject);
  const v = asked ? await check(c.env.DB, { subject, scope, chain }) : undefined;
  if (v) await record(c.env.DB, { subject, scope, verdict: v, requester: "pipeline-a (demo)" });

  return c.html(
    <Page title="Inside a brand's pipeline" here="generate">
      <h1>One call, from inside a brand's own pipeline</h1>
      <Boundary
        holds="Nobody opens this page in real life. A brand's generation pipeline makes this one call from its own code, before it produces anything."
        stays="Their tools, their interface, their workflow. We are a step inside it, not a product they log into."
      />
      <p class="sub">
        The button below stands in for that call so a person can watch it happen. The request and the
        response are exactly what their code sends and receives.
      </p>
      <form method="get" action="/generate">
        <input type="hidden" name="asked" value="1" />
        <input type="text" name="subject" value={subject} aria-label="subject" />{" "}
        <select name="scope" aria-label="scope">
          {SCOPES.map((sc) => (
            <option value={sc} selected={scope === sc}>
              {sc}
            </option>
          ))}
        </select>{" "}
        <button type="submit">Generate</button>
      </form>

      <pre class="paste">{`POST /check\n{ "subject": "${subject}", "scope": "${scope}" }`}</pre>

      {v ? (
        <>
          <VerdictBox v={v} />
          <pre class="paste">{JSON.stringify({ decision: v.decision, reason: v.reason }, null, 2)}</pre>
          {v.decision === "allow" ? (
            <p class="dim">
              The image would be produced here. Stop the use on the person's page, then press Generate again.
            </p>
          ) : null}
          {v.decision === "ask" && v.requestId ? (
            <form method="post" action="/generate/ask">
              <input type="hidden" name="requestId" value={v.requestId} />
              <input type="hidden" name="subject" value={subject} />
              <input type="hidden" name="scope" value={scope} />
              <button type="submit">Ask the human</button>
            </form>
          ) : null}
          {v.decision === "deny" || v.decision === "revoked" ? (
            <p class="dim">Nothing was generated.</p>
          ) : null}
        </>
      ) : null}
    </Page>,
  );
});

/** 人に聞く。コードを出して待つ。待っている間は何も生成しない。 */
screens.post("/generate/ask", async (c) => {
  const f = await form(c);
  const requestId = String(f.get("requestId"));
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.text("World OIDC client is not configured", 500);
  await startApproval(c.env.DB, {
    requestId,
    subject: String(f.get("subject")),
    scope: String(f.get("scope")),
    clientId,
    clientSecret,
  });
  return c.redirect(`/generate/waiting/${requestId}`);
});

screens.get("/generate/waiting/:requestId", async (c) => {
  const requestId = c.req.param("requestId");
  const clientId = c.env.WORLD_OIDC_CLIENT_ID;
  const clientSecret = c.env.WORLD_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.text("World OIDC client is not configured", 500);

  await sweep(c.env.DB);
  const r = await pollApproval(c.env.DB, { requestId, clientId, clientSecret });
  const p = r.pending ?? (await getPendingByRequest(c.env.DB, requestId));

  if (r.status === "approved" && p) {
    await put(c.env.DB, {
      id: crypto.randomUUID(),
      subject: p.subject,
      scopes: [p.scope],
      expiresAt: Date.now() + 60_000,
      custodian: p.sub,
    });
  }

  const left = p ? Math.max(0, Math.round((p.expiresAt - Date.now()) / 1000)) : 0;
  return c.html(
    <Page
      title="Waiting for a human"
      here="generate"
      refresh={r.status === "waiting" ? 3 : undefined}
    >
      <h1>Asking the person</h1>
      <p class="sub">The generation has not started. It will not start unless they say yes.</p>
      {p && r.status === "waiting" ? (
        <div class="card">
          <div class="meta">They enter this code at sandbox.auth.world.org/device</div>
          <div class="code">{p.userCode}</div>
          <div class="meta">
            {left}s left. If nobody answers, this request expires and nothing is generated.
          </div>
          <div class="meta dim" style="margin-top:.75rem">
            In this industry the message goes over chat, so it is written to be pasted:
          </div>
          <pre class="paste">{`Approval needed for "${p.scope}".\nCode: ${p.userCode}\nOpen: https://sandbox.auth.world.org/device\nExpires in ${left}s — nothing is generated until you answer.`}</pre>
        </div>
      ) : null}
      <div class={`verdict ${r.status === "approved" ? "allow" : r.status === "waiting" ? "ask" : "deny"}`}>
        <h3>{r.status}</h3>
        <p>{r.reason}</p>
      </div>
      <p>
        <a href="/generate?asked=1">Back to the pipeline</a>
      </p>
    </Page>,
  );
});
