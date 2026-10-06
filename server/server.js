const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const { query, getPool } = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "..", "public");
const data = JSON.parse(fs.readFileSync(path.join(publicDir, "data.json"), "utf8"));

app.disable("x-powered-by");
app.use(helmet());
app.use(rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(publicDir));

function abjadTotal(text = "") {
  let total = 0;
  const parts = [];
  for (const letter of [...String(text)]) {
    if (Object.prototype.hasOwnProperty.call(data.abjad, letter)) {
      const value = data.abjad[letter];
      total += value;
      parts.push({ letter, value });
    }
  }
  return { total, parts };
}

function reduceBy12(total) {
  if (total <= 0) return 0;
  const remainder = total % 12;
  return remainder === 0 ? 12 : remainder;
}


function jwtSecret() {
  return process.env.JWT_SECRET || "DEV_ONLY_CHANGE_ME";
}
function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), { expiresIn: "7d" });
}
function authUser(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try { return jwt.verify(header.slice(7), jwtSecret()); } catch (_) { return null; }
}
function requireAuth(req, res, next) {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "AUTH_REQUIRED" });
  req.auth = user;
  next();
}

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const displayName = String(req.body.displayName || "").trim();

  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED", minPasswordLength: 8 });

  if (!getPool())
    return res.status(503).json({ error: "DATABASE_REQUIRED_FOR_ACCOUNTS" });

  try {
    const existing = await query("select id from users where email=$1", [email]);
    if (existing.rowCount) return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 12);
    await query(
      "insert into users(id,email,password_hash) values($1,$2,$3)",
      [id, email, hash]
    );
    await query(
      "insert into user_profiles(user_id,display_name) values($1,$2)",
      [id, displayName || null]
    );

    const token = signToken({ id, email });
    res.status(201).json({ user: { id, email, displayName }, token });
  } catch (e) {
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
  if (!getPool()) return res.status(503).json({ error: "DATABASE_REQUIRED_FOR_ACCOUNTS" });

  try {
    const r = await query(
      `select u.id,u.email,u.password_hash,p.display_name
       from users u left join user_profiles p on p.user_id=u.id
       where u.email=$1`, [email]
    );
    if (!r.rowCount) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const token = signToken(user);
    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name || "" },
      token
    });
  } catch (_) {
    res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const r = await query(
      `select u.id,u.email,p.display_name,p.locale
       from users u left join user_profiles p on p.user_id=u.id
       where u.id=$1`, [req.auth.sub]
    );
    if (!r.rowCount) return res.status(404).json({ error: "USER_NOT_FOUND" });
    res.json(r.rows[0]);
  } catch (_) {
    res.status(500).json({ error: "PROFILE_READ_FAILED" });
  }
});

app.patch("/api/me", requireAuth, async (req, res) => {
  const displayName = String(req.body.displayName || "").trim();
  const locale = String(req.body.locale || "fr").slice(0, 10);
  try {
    await query(
      `insert into user_profiles(user_id,display_name,locale)
       values($1,$2,$3)
       on conflict(user_id) do update set display_name=excluded.display_name,
       locale=excluded.locale,updated_at=now()`,
      [req.auth.sub, displayName || null, locale]
    );
    res.json({ ok: true });
  } catch (_) {
    res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
  }
});


app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const r = await query(
      `select id, reading_type, title, input_data, result_data, created_at
       from saved_readings where user_id=$1 order by created_at desc limit 50`,
      [req.auth.sub]
    );
    const subscription = await query(
      `select status, provider, created_at from subscriptions
       where user_id=$1 order by created_at desc limit 1`, [req.auth.sub]
    );
    res.json({
      readings: r.rows,
      subscription: subscription.rows[0] || {status:"free"}
    });
  } catch (_) {
    res.status(500).json({error:"DASHBOARD_READ_FAILED"});
  }
});

app.post("/api/readings", requireAuth, async (req, res) => {
  const type = String(req.body.readingType || "");
  if (!["astrology","abjad","zawj"].includes(type))
    return res.status(400).json({error:"INVALID_READING_TYPE"});
  try {
    const r = await query(
      `insert into saved_readings(user_id,reading_type,title,input_data,result_data)
       values($1,$2,$3,$4::jsonb,$5::jsonb)
       returning id,reading_type,title,input_data,result_data,created_at`,
      [
        req.auth.sub, type, String(req.body.title || ""),
        JSON.stringify(req.body.inputData || {}),
        JSON.stringify(req.body.resultData || {})
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (_) {
    res.status(500).json({error:"READING_SAVE_FAILED"});
  }
});

app.delete("/api/readings/:id", requireAuth, async (req, res) => {
  try {
    await query(
      "delete from saved_readings where id=$1 and user_id=$2",
      [req.params.id, req.auth.sub]
    );
    res.json({ok:true});
  } catch (_) {
    res.status(500).json({error:"READING_DELETE_FAILED"});
  }
});


function requirePremium(req, res, next) {
  query(
    `select 1 from subscriptions
     where user_id=$1 and status='active'
     and (expires_at is null or expires_at > now())
     order by created_at desc limit 1`,
    [req.auth.sub]
  ).then(r => {
    if (!r.rowCount) return res.status(402).json({error:"PREMIUM_REQUIRED"});
    next();
  }).catch(() => res.status(500).json({error:"SUBSCRIPTION_CHECK_FAILED"}));
}

app.get("/api/plans", async (_req, res) => {
  try {
    const r = await query("select id,name,price_xof,currency,interval from plans where active=true order by price_xof");
    res.json(r.rows);
  } catch (_) {
    res.status(500).json({error:"PLANS_READ_FAILED"});
  }
});

/*
  Provider-neutral checkout.
  Set PAYMENT_PROVIDER and its credentials in .env, then implement the
  provider adapter in server/payments/<provider>.js.
*/
app.post("/api/billing/checkout", requireAuth, async (req, res) => {
  const planId = String(req.body.planId || "premium_monthly");
  try {
    const p = await query("select * from plans where id=$1 and active=true", [planId]);
    if (!p.rowCount) return res.status(404).json({error:"PLAN_NOT_FOUND"});

    const provider = process.env.PAYMENT_PROVIDER || "";
    if (!provider)
      return res.status(503).json({error:"PAYMENT_PROVIDER_NOT_CONFIGURED"});

    const sub = await query(
      `insert into subscriptions(user_id,plan_id,status,provider)
       values($1,$2,'pending',$3) returning id,plan_id,status,provider`,
      [req.auth.sub, planId, provider]
    );

    // Real payment URL/reference is intentionally created only by the
    // configured provider adapter; never fake a successful payment.
    res.status(201).json({
      subscription: sub.rows[0],
      payment: {status:"pending", provider, checkoutUrl:null}
    });
  } catch (_) {
    res.status(500).json({error:"CHECKOUT_INIT_FAILED"});
  }
});

app.get("/api/billing/status", requireAuth, async (req, res) => {
  try {
    const r = await query(
      `select s.id,s.status,s.provider,s.started_at,s.expires_at,
              p.name,p.price_xof,p.currency,p.interval
       from subscriptions s join plans p on p.id=s.plan_id
       where s.user_id=$1 order by s.created_at desc limit 1`,
      [req.auth.sub]
    );
    res.json(r.rows[0] || {status:"free"});
  } catch (_) {
    res.status(500).json({error:"BILLING_STATUS_FAILED"});
  }
});

/* Example protected Premium endpoint. */
app.get("/api/premium/check", requireAuth, requirePremium, (_req, res) => {
  res.json({premium:true, message:"Fonction Premium autorisée."});
});

app.get("/api/deployment/status", (_req, res) => {
  res.json({
    app: "LISTIXAAR",
    version: "10.0.0",
    environment: process.env.NODE_ENV || "development",
    httpsExpected: (process.env.NODE_ENV === "production"),
    paymentConfigured: Boolean(process.env.PAYMENT_PROVIDER && process.env.MERCHANT_CODE),
    publicLaunchReady: Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
  });
});

app.get("/api/payment/config", (_req,res) => {
  res.json({
    configured:Boolean(process.env.PAYMENT_PROVIDER && process.env.MERCHANT_CODE),
    provider:process.env.PAYMENT_PROVIDER || null,
    merchantCodeConfigured:Boolean(process.env.MERCHANT_CODE)
  });
});

app.get("/api/health", async (_req, res) => {
  let database = "json-fallback";
  try {
    if (getPool()) {
      await query("select 1");
      database = "postgresql";
    }
  } catch (_) {
    database = "postgresql-error";
  }
  res.json({ ok: true, app: "LISTIXAAR", version: "5.0.0", database });
});

app.get("/api/signs", async (_req, res) => {
  try {
    if (getPool()) {
      const r = await query("select id, symbol, name_fr as name from signs order by sort_order");
      return res.json(r.rows);
    }
  } catch (_) {}
  res.json(data.signs);
});

app.get("/api/signs/:id/elements", async (req, res) => {
  try {
    if (getPool()) {
      const r = await query(
        "select element_number as number, element_name as name, content from sign_elements where sign_id=$1 order by element_number",
        [req.params.id]
      );
      return res.json(r.rows);
    }
  } catch (_) {}
  res.json(data.elements.map(e => ({
    number: e.number,
    name: e.name,
    content: null
  })));
});

app.get("/api/structure", (_req, res) => res.json(data.elements));
app.get("/api/abjad", (_req, res) => res.json(data.abjad));

app.post("/api/abjad/calculate", (req, res) => {
  const result = abjadTotal(req.body.text || "");
  res.json({ ...result, reducedBy12: reduceBy12(result.total) });
});

app.post("/api/zawj/calculate", async (req, res) => {
  const manName = abjadTotal(req.body.manName || "");
  const manMother = abjadTotal(req.body.manMotherName || "");
  const womanName = abjadTotal(req.body.womanName || "");
  const womanMother = abjadTotal(req.body.womanMotherName || "");

  const manTotal = manName.total + manMother.total;
  const womanTotal = womanName.total + womanMother.total;
  const manReduced = reduceBy12(manTotal);
  const womanReduced = reduceBy12(womanTotal);
  const difference = Math.abs(manReduced - womanReduced);
  const result = {
    man: { total: manTotal, reducedBy12: manReduced },
    woman: { total: womanTotal, reducedBy12: womanReduced },
    difference,
    resultCode: difference === 0 ? 0 : difference
  };

  // V5 can persist the calculation once a user id is supplied.
  if (getPool() && req.body.userId) {
    try {
      await query(
        `insert into zawj_readings
        (user_id, man_name, man_mother_name, woman_name, woman_mother_name, calculation)
        values ($1,$2,$3,$4,$5,$6::jsonb)`,
        [req.body.userId, req.body.manName || "", req.body.manMotherName || "",
         req.body.womanName || "", req.body.womanMotherName || "", JSON.stringify(result)]
      );
    } catch (_) {}
  }

  res.json(result);
});

app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.listen(PORT, () => console.log(`LISTIXAAR V5 running on ${PORT}`));
