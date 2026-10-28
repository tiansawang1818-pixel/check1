import { CanvasArtwork } from "../components/CanvasArtwork";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Flag, Layers3 } from "lucide-react";
import { api } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { BotForm, Output } from "../components/BotForm";
import { Badge, ErrorBox, Loading } from "../components/ui";
import { useAction } from "../lib/context";
export function PublicBot() {
  const location = useLocation();
  return <PublicBotPage key={location.pathname} />;
}
function PublicBotPage() {
  const { slug } = useParams();
  const location = useLocation();
  const embed = location.pathname.startsWith("/embed/");
  const [parentOrigin, setParentOrigin] = useState<string | null>(
    window.parent === window ? window.location.origin : null,
  );
  const [bot, setBot] = useState<any>(null),
    [error, setError] = useState(""),
    [result, setResult] = useState<any>(null),
    [report, setReport] = useState(false),
    [reason, setReason] = useState("Broken Bot"),
    [description, setDescription] = useState("");
  const { run, busy } = useAction();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!embed || parent === window) return;
    try {
      if (document.referrer) setParentOrigin(new URL(document.referrer).origin);
    } catch { /* Wait for verified parent message. */ }
    const receive = (e: MessageEvent) => {
      if (e.source === parent && e.data?.type === "wasmbot:origin") {
        setParentOrigin(e.origin);
      }
    };
    window.addEventListener("message", receive);
    parent.postMessage({ type: "wasmbot:ready" }, "*");
    return () => window.removeEventListener("message", receive);
  }, [embed]);
  const path = `public-bot?slug=${encodeURIComponent(slug!)}&embed=${embed}`;
  const headers = embed && parentOrigin
    ? { "x-embed-origin": parentOrigin }
    : undefined;
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    if (embed && !parentOrigin) return;
    setError("");
    setBot(null);
    setResult(null);
    void api(
      path,
      "GET",
      undefined,
      embed && parentOrigin ? { "x-embed-origin": parentOrigin } : undefined,
      { signal: controller.signal },
    ).then((d) => {
      if (current) setBot(d.bot);
    }).catch((e) => {
      if (current) setError(friendlyError(e, "โหลดบอทไม่สำเร็จ กรุณาลองใหม่"));
    });
    return () => {
      current = false;
      controller.abort();
    };
  }, [path, embed, parentOrigin, retry]);
  useEffect(() => {
    if (!embed || !parentOrigin || parent === window) return;
    const observer = new ResizeObserver(() =>
      parent.postMessage({
        type: "wasmbot:resize",
        height: document.documentElement.scrollHeight,
      }, parentOrigin)
    );
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [embed, parentOrigin, bot]);
  const query = new URLSearchParams(location.search);
  const requestedTheme = query.get("theme") || bot?.widget?.theme;
  const theme = requestedTheme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : requestedTheme === "dark"
    ? "dark"
    : "light";
  return (
    <div
      className={`public-layout ${embed ? "embedded" : ""} ${
        query.get("compact") === "true" ? "compact" : ""
      }`}
      data-theme={theme}
    >
      {!embed && (
        <header>
          <Link className="brand" to="/">
            <Layers3 />WasmBot<span>Studio</span>
          </Link>
          <span className="muted">บอทสาธารณะ</span>
        </header>
      )}
      {!embed && <CanvasArtwork />}
      <main className="public-card">
        {error ? <ErrorBox error={error} retry={() => setRetry((value) => value + 1)} /> : !bot
          ? (
            <>
              <Loading />
              {embed && !parentOrigin && (
                <p className="muted">
                  กำลังรอการเชื่อมต่อจากเว็บไซต์ที่ฝังบอท
                </p>
              )}
            </>
          )
          : (
            <>
              {(bot.widget.showBotName || bot.widget.title) && (
                <>
                  <div className="eyebrow">
                    {embed ? "" : "ให้บอทช่วยจัดการงานของคุณ"}
                  </div>
                  <h1>{bot.widget.title || bot.name}</h1>
                </>
              )}
              <p className="muted">{bot.description}</p>
              <BotForm
                fields={bot.input_schema.fields}
                placeholder={bot.widget.placeholder}
                buttonText={bot.widget.buttonText || "เริ่มใช้งานบอท"}
                onRun={async (input) => {
                  setResult(null);
                  setResult(await api(path, "POST", { input }, headers));
                }}
              />
              {result && (
                <div className="public-result">
                  <div className="panel-heading">
                    <h2>ผลลัพธ์</h2>
                    <Badge>SUCCESS</Badge>
                  </div>
                  <Output value={result.output} type={bot.output_schema.type} />
                  <small>
                    {result.executionTimeMs} ms · เวอร์ชัน {result.version}
                  </small>
                </div>
              )}
              {bot.widget.showPoweredBy && (
                <Link
                  className="powered"
                  to="/"
                  target={embed ? "_blank" : undefined}
                  rel={embed ? "noreferrer" : undefined}
                >
                  <Layers3 size={15} />Powered by WasmBot Studio
                </Link>
              )}
              {!embed && (
                <>
                  <button
                    className="text-link report-link"
                    onClick={() => setReport(!report)}
                  >
                    <Flag size={14} />รายงานปัญหาบอท
                  </button>
                  {report && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          await api(path, "POST", {
                            action: "report",
                            reason,
                            description,
                          });
                          setReport(false);
                        }, "ส่งรายงานเรียบร้อยแล้ว");
                      }}
                    >
                      <label>
                        เหตุผล<select
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        >
                          {[
                            ["Spam", "สแปม"],
                            ["Abusive Content", "เนื้อหาไม่เหมาะสม"],
                            ["Suspicious Behavior", "พฤติกรรมน่าสงสัย"],
                            ["Broken Bot", "บอททำงานผิดปกติ"],
                            ["Other", "อื่น ๆ"],
                          ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label>
                        รายละเอียด<textarea
                          maxLength={2000}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </label>
                      <button className="secondary" disabled={busy}>
                        ส่งรายงาน
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
      </main>
    </div>
  );
}
