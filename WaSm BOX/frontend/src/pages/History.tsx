import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../lib/context";
import {
  Badge,
  ErrorBox,
  formatDate,
  Heading,
  Json,
  Loading,
  Pagination,
  Panel,
} from "../components/ui";
import { ExecutionTable } from "./Dashboard";
export function History() {
  const [page, setPage] = useState(0),
    [bot, setBot] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [date, setDate] = useState("");
  const bots = useResource("studio");
  const query = new URLSearchParams({
    resource: "executions",
    page: String(page),
    bot,
    status,
    source,
    date,
  });
  const { data, loading, error, reload } = useResource(`studio?${query}`);
  return (
    <>
      <Heading
        eyebrow="OBSERVABILITY"
        title="Execution history"
        description="Inspect inputs, outputs, and performance for every run."
      />
      <Panel>
        <div className="filters">
          <label>
            Bot<select
              value={bot}
              onChange={(e) => {
                setBot(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All bots</option>
              {bots.data?.bots.map((b: any) => (
                <option value={b.id} key={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status<select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {[
                "SUCCESS",
                "RUNTIME_ERROR",
                "VALIDATION_ERROR",
                "TIMEOUT",
                "MEMORY_LIMIT",
                "BLOCKED",
                "RATE_LIMITED",
              ].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Source<select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All sources</option>
              {["DASHBOARD", "PUBLIC_PAGE", "API", "EMBED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Date (UTC)<input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        {loading
          ? <Loading />
          : error
          ? <ErrorBox error={error} retry={reload} />
          : (
            <>
              <ExecutionTable rows={data.executions} />
              <Pagination
                page={page}
                setPage={setPage}
                count={data.executions.length}
              />
            </>
          )}
      </Panel>
    </>
  );
}
export function ExecutionDetail() {
  const { id } = useParams();
  const { data, loading, error } = useResource(
    `studio?resource=executions&id=${id}`,
  );
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const e = data.executions[0];
  if (!e) return <ErrorBox error="Execution not found." />;
  return (
    <>
      <Heading title="Execution detail" description={e.request_id}>
        <Badge>{e.status}</Badge>
        <Link className="secondary" to={`/bots/${e.bot_id}/executions`}>
          Open bot
        </Link>
      </Heading>
      <Panel>
        <dl>
          <dt>Bot</dt>
          <dd>{e.bots.name}</dd>
          <dt>Source</dt>
          <dd>{e.source}</dd>
          <dt>Time</dt>
          <dd>{formatDate(e.created_at)}</dd>
          <dt>Execution</dt>
          <dd>{e.execution_time_ms} ms</dd>
          <dt>Memory</dt>
          <dd>{e.memory_used ?? "—"} bytes</dd>
          <dt>Production version</dt>
          <dd>
            {e.bot_deployments ? `v${e.bot_deployments.version}` : "Draft"}
          </dd>
        </dl>
        {e.error_message && <ErrorBox error={e.error_message} />}
      </Panel>
      <div className="two-col">
        <Panel title="Input">
          <Json value={e.input} />
        </Panel>
        <Panel title="Output">
          <Json value={e.output} />
        </Panel>
      </div>
    </>
  );
}
