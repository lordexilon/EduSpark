// =====================================================
// CoreSpark — Model Router
// Selección data-driven de modelo por prestancia y costo
// (Bedrock + Ollama + Qwen) con presupuesto y fallback.
// Consumido por las especializaciones (EduSpark, BusinessSpark, ...).
// =====================================================

// ---------- Tipos ----------
export type Tier = "local" | "economy" | "premium" | "fallback";
export type Provider = "bedrock" | "ollama" | "qwen";

export interface ModelEntry {
  model_key: string;
  provider: Provider;
  model_id: string;
  display_name: string;
  tier: Tier;
  input_cost_per_mtok: number;
  output_cost_per_mtok: number;
  supports_tools: boolean;
  supports_vision: boolean;
  context_window: number;
  max_output_tokens: number;
  enabled: boolean;
  priority: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface RouteRequest {
  userQuery: string;
  messages: ChatMessage[];
  systemInstruction: string;
  hasTools: boolean;
  institutionId: number;
  userId?: string;
  stream: boolean;
  temperature?: number;
}

export interface BudgetState {
  allowed: boolean;
  current_monthly_cost: number;
  remaining_budget: number;
  monthly_limit: number;
}

export interface RouteDecision {
  entry: ModelEntry;
  reason: string;
  estimatedCost: number;
  fallbackChain: ModelEntry[];
}

// ---------- Clasificación de consulta ----------
const SIMPLE_QUERY_MAX_CHARS = 120;

export function classifyQuery(userQuery: string, hasTools: boolean): "tools" | "simple" | "complex" {
  if (hasTools) return "tools";
  const trimmed = String(userQuery || "").trim();
  const looksSimple =
    trimmed.length <= SIMPLE_QUERY_MAX_CHARS &&
    !/explic|analiz|compar|cómo funciona|por qué|detall|profund|resuelv|razon/i.test(trimmed);
  return looksSimple ? "simple" : "complex";
}

// ---------- Carga de registro ----------
export async function loadRegistry(
  supabaseAdmin: any,
  force = false
): Promise<ModelEntry[]> {
  let cache = (globalThis as any).__modelRegistryCache as
    | { at: number; data: ModelEntry[] }
    | undefined;

  if (!force && cache && Date.now() - cache.at < 60_000) {
    return cache.data;
  }

  const { data, error } = await supabaseAdmin
    .from("model_registry")
    .select("*")
    .eq("enabled", true)
    .order("tier")
    .order("priority", { ascending: true });

  if (error) throw new Error(`Error cargando model_registry: ${error.message}`);
  const entries = (data || []) as ModelEntry[];
  (globalThis as any).__modelRegistryCache = { at: Date.now(), data: entries };
  return entries;
}

// ---------- Orden de fallback ----------
const TIER_ORDER: Tier[] = ["premium", "economy", "fallback", "local"];

export function buildFallbackChain(entries: ModelEntry[], chosen: ModelEntry): ModelEntry[] {
  // Siempre prefiere nube (premium → economy → fallback) antes que local,
  // sin importar el tier elegido, para degradar a nube si local está caído.
  return TIER_ORDER.flatMap((t) =>
    entries.filter((e) => e.tier === t && e.model_key !== chosen.model_key)
  );
}

// ---------- Estimación de costo ----------
export function estimateCost(entry: ModelEntry, inputTokens: number): number {
  const outputTokens = entry.max_output_tokens;
  const inCost = (inputTokens / 1_000_000) * entry.input_cost_per_mtok;
  const outCost = (outputTokens / 1_000_000) * entry.output_cost_per_mtok;
  return inCost + outCost;
}

function estimateInputTokens(userQuery: string, systemInstruction: string): number {
  return Math.ceil((userQuery.length + systemInstruction.length) / 4);
}

// ---------- Selección de modelo ----------
export async function selectModel(
  supabaseAdmin: any,
  req: RouteRequest,
  budget: BudgetState
): Promise<RouteDecision> {
  const entries = await loadRegistry(supabaseAdmin);
  if (entries.length === 0) throw new Error("model_registry vacío");

  const byTier = (t: Tier) => entries.filter((e) => e.tier === t);
  const kind = classifyQuery(req.userQuery, req.hasTools);

  let chosen: ModelEntry | undefined;
  let reason = "";

  if (kind === "tools") {
    chosen = byTier("premium").find((e) => e.supports_tools) || byTier("economy").find((e) => e.supports_tools);
    reason = "tools: requiere tool-calling";
  } else if (!budget.allowed) {
    chosen = byTier("local")[0];
    reason = "presupuesto agotado: degradar a local";
  } else if (kind === "simple") {
    chosen = byTier("economy")[0] || byTier("local")[0] || byTier("premium")[0];
    reason = "consulta simple: tier economy";
  }

  if (!chosen) {
    chosen = byTier("premium")[0] || byTier("fallback")[0] || byTier("local")[0];
    reason = "default: tier premium";
  }

  const estimatedCost = estimateCost(
    chosen,
    estimateInputTokens(req.userQuery, req.systemInstruction)
  );

  return {
    entry: chosen,
    reason,
    estimatedCost,
    fallbackChain: buildFallbackChain(entries, chosen),
  };
}

// ---------- Adaptadores de proveedor ----------

function openAiMessages(systemInstruction: string, messages: ChatMessage[], lastQuery: string) {
  const out: { role: string; content: string }[] = [
    { role: "system", content: systemInstruction },
  ];
  for (const m of messages) {
    const role = m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user";
    if (!m.content) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += "\n\n" + m.content;
    else out.push({ role, content: m.content });
  }
  if (out.length === 1) out.push({ role: "user", content: lastQuery });
  return out;
}

export async function callOllama(entry: ModelEntry, payload: unknown): Promise<Response> {
  const base = Deno.env.get("OLLAMA_BASE_URL") || "http://host.docker.internal:11434";
  return await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(payload as object), model: entry.model_id }),
  });
}

export async function callQwen(entry: ModelEntry, payload: unknown): Promise<Response> {
  const key = Deno.env.get("QWEN_API_KEY") || "";
  return await fetch(
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...(payload as object), model: entry.model_id }),
    }
  );
}

// ---------- Bedrock (Converse API + SigV4) ----------
async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: BufferSource, msg: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder().encode(msg);
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, enc);
}

async function sigV4Headers(
  method: string,
  url: URL,
  region: string,
  accessKey: string,
  secretKey: string,
  body: string
): Promise<Record<string, string>> {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "bedrock";
  const payloadHash = await sha256Hex(body);

  const headers: Record<string, string> = {
    "host": url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "content-type": "application/json",
  };
  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headers[k].trim()}`).join("\n") + "\n";
  const signedHeaders = sortedKeys.join(";");

  const canonicalRequest = [
    method,
    url.pathname,
    url.search,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = await hmac(kSigning, stringToSign);
  const signatureHex = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  return { ...headers, Authorization: auth };
}

function toConversePayload(entry: ModelEntry, payload: any): Record<string, unknown> {
  const messages = payload.messages as { role: string; content: string }[];
  const systemText = messages.find((m) => m.role === "system")?.content ?? "";
  const rest = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: [{ text: m.content }],
  }));

  const converse: Record<string, unknown> = {
    modelId: entry.model_id,
    messages: rest,
    inferenceConfig: {
      maxTokens: entry.max_output_tokens,
      temperature: payload.temperature ?? 0.5,
    },
  };
  if (systemText) converse.system = [{ text: systemText }];
  if (payload.tools) {
    converse.toolConfig = { tools: payload.tools };
  }
  return converse;
}

export async function callBedrock(entry: ModelEntry, payload: any): Promise<Response> {
  const region = Deno.env.get("AWS_REGION") || "us-east-1";
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";
  if (!accessKey || !secretKey) {
    throw new Error("AWS Bedrock no configurado: faltan AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY");
  }

  const stream = payload.stream === true;
  const url = new URL(
    `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(entry.model_id)}/${stream ? "converse-stream" : "converse"}`
  );
  const body = JSON.stringify(toConversePayload(entry, payload));
  const headers = await sigV4Headers("POST", url, region, accessKey, secretKey, body);

  return await fetch(url.toString(), { method: "POST", headers, body });
}

// ---------- Despacho con fallback ----------
export async function dispatch(
  decision: RouteDecision,
  payload: unknown
): Promise<{ response: Response; entry: ModelEntry }> {
  const chain = [decision.entry, ...decision.fallbackChain];
  let lastError: Error | null = null;

  for (const entry of chain) {
    try {
      let res: Response;
      if (entry.provider === "bedrock") res = await callBedrock(entry, payload);
      else if (entry.provider === "ollama") res = await callOllama(entry, payload);
      else res = await callQwen(entry, payload);

      if (res.ok) return { response: res, entry };
      lastError = new Error(`Provider ${entry.provider} respondió ${res.status}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error("Todos los proveedores fallaron");
}

// ---------- Orquestador principal ----------
export async function routeAndGenerate(
  supabaseAdmin: any,
  req: RouteRequest
): Promise<{ response: Response; entry: ModelEntry; estimatedCost: number }> {
  // 1. Verificar presupuesto
  const inputTokens = estimateInputTokens(req.userQuery, req.systemInstruction);
  const { data: budgetRows } = await supabaseAdmin.rpc("check_tutor_cost_limit", {
    p_user_id: req.userId || null,
    p_estimated_cost: 0.01, // estimación gruesa previa; se refina tras selección
  });

  const budget: BudgetState = {
    allowed: budgetRows?.[0]?.allowed ?? true,
    current_monthly_cost: budgetRows?.[0]?.current_monthly_cost ?? 0,
    remaining_budget: budgetRows?.[0]?.remaining_budget ?? 0,
    monthly_limit: budgetRows?.[0]?.monthly_limit ?? 50,
  };

  // 2. Seleccionar modelo
  const decision = await selectModel(supabaseAdmin, req, budget);

  // 3. Construir payload OpenAI-compatible (los adaptadores lo transforman)
  const payload = {
    model: decision.entry.model_id,
    messages: openAiMessages(req.systemInstruction, req.messages, req.userQuery),
    stream: req.stream,
    temperature: req.temperature ?? 0.5,
    max_tokens: decision.entry.max_output_tokens,
  };

  // 4. Despachar con fallback
  const { response, entry } = await dispatch(decision, payload);

  // 5. Registrar consumo real (best-effort, no bloquea la respuesta)
  if (req.userId) {
    try {
      await supabaseAdmin.rpc("track_tutor_interaction_cost", {
        p_user_id: req.userId,
        p_cost: decision.estimatedCost,
        p_tokens_used: inputTokens + entry.max_output_tokens,
      });
    } catch (e) {
      console.error("Error registrando costo (no crítico):", e);
    }
  }

  return { response, entry, estimatedCost: decision.estimatedCost };
}
