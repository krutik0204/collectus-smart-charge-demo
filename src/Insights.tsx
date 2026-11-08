import { useEffect, useState } from "react";
import { fetchInsights, fetchModel } from "./api";
import type { ModelInfo, MonthBacktest, MonthStrategy } from "./types";

const AI_STRATEGY = "charge_on_repayment_plus_ai_gated_cron";

const STRATEGY_NAMES: Record<string, string> = {
  cron_only: "Today: fixed cron schedule",
  cron_plus_always_charge_on_repayment: "Charge on every repayment",
  cron_plus_simple_rule_on_repayment: "Simple rule (no AI)",
  cron_plus_smart_partials_on_repayment: "AI partials (our first version)",
  [AI_STRATEGY]: "Collectus (AI)",
};

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function change(a: number, b: number) {
  const delta = (a / b - 1) * 100;
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(0)}%`;
}

type BarChartProps = {
  title: string;
  subtitle: string;
  rows: MonthStrategy[];
  value: (row: MonthStrategy) => number;
  format: (value: number) => string;
  tip: (row: MonthStrategy) => string;
};

function BarChart({ title, subtitle, rows, value, format, tip }: BarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...rows.map(value)) || 1;
  return (
    <figure className="insight-chart">
      <figcaption>
        <h3>{title}</h3>
        <p className="muted">{subtitle}</p>
      </figcaption>
      <div className="bar-list" role="list">
        {rows.map((row) => {
          const isAi = row.strategy === AI_STRATEGY;
          const width = `${(value(row) / max) * 82}%`; // leave room for the value label
          return (
            <div
              key={row.strategy}
              role="listitem"
              className={`bar-row ${isAi ? "is-ai" : ""} ${hovered === row.strategy ? "hovered" : ""}`}
              onMouseEnter={() => setHovered(row.strategy)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(row.strategy)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={`${STRATEGY_NAMES[row.strategy] ?? row.strategy}: ${format(value(row))}`}
            >
              <span className="bar-label">{STRATEGY_NAMES[row.strategy] ?? row.strategy}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width }} />
                <span className="bar-value">{format(value(row))}</span>
              </span>
              {hovered === row.strategy ? (
                <span className="bar-tip" role="tooltip">
                  {tip(row)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

const FEATURE_NAMES: Record<string, string> = {
  pm_health: "Card health",
  recent_success: "Recent payment success",
  fails_7d: "Failed attempts (7 days)",
  days_overdue: "Days overdue",
  repayment_strength: "Amount just repaid",
  charge_fraction: "Size of the charge",
  trigger_event: "Right after a repayment",
  payday_window: "Payday window (27th–3rd)",
  network_visa: "Visa card (vs Mada)",
  network_mastercard: "Mastercard (vs Mada)",
  apple_pay: "Apple Pay",
  funding_credit: "Credit card",
  funding_prepaid: "Prepaid card",
};

function ModelLearned() {
  const [model, setModel] = useState<ModelInfo | null>(null);
  useEffect(() => {
    fetchModel().then(setModel).catch(() => setModel(null));
  }, []);
  if (!model) return null;
  const rows = Object.entries(model.coefficients)
    .map(([feature, coef]) => ({ feature, coef }))
    .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
  const max = Math.max(...rows.map((r) => Math.abs(r.coef))) || 1;
  return (
    <figure className="insight-chart learned">
      <figcaption>
        <h3>What the model learned</h3>
        <p className="muted">
          How strongly each signal moves the chance of success (standardized weights). AUC{" "}
          {model.metrics.auc?.toFixed(2)} on held-out data.
        </p>
      </figcaption>
      <div className="bar-list" role="list">
        {rows.map((row) => (
          <div
            key={row.feature}
            role="listitem"
            className="bar-row learned-row"
            aria-label={`${FEATURE_NAMES[row.feature] ?? row.feature}: ${row.coef > 0 ? "raises" : "lowers"} the chance`}
          >
            <span className="bar-label">{FEATURE_NAMES[row.feature] ?? row.feature}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(Math.abs(row.coef) / max) * 70}%` }} />
              <span className={`bar-value effect ${row.coef > 0 ? "up" : "down"}`}>
                {row.coef > 0 ? "▲ raises" : "▼ lowers"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function ImpactCalculator({ data }: { data: MonthBacktest }) {
  const [customers, setCustomers] = useState(100000);
  const [avgOverdue, setAvgOverdue] = useState(300);
  const by = Object.fromEntries(data.strategies.map((s) => [s.strategy, s]));
  const ai = by[AI_STRATEGY];
  const cron = by.cron_only;
  const total = customers * avgOverdue;
  const extra = total * (ai.recovery_rate - cron.recovery_rate);
  const fewerFails = ((cron.failed_attempts - ai.failed_attempts) / data.customers) * customers;
  const sar = (v: number) =>
    v >= 1_000_000 ? `SAR ${(v / 1_000_000).toFixed(1)}M` : `SAR ${Math.round(v / 1000)}k`;
  return (
    <div className="impact">
      <div className="impact-inputs">
        <h3>What could this mean for a portfolio?</h3>
        <label className="field">
          <span className="field-head">
            <span>Customers in overdue</span>
            <strong>{customers.toLocaleString()}</strong>
          </span>
          <input type="range" min={10000} max={500000} step={10000} value={customers} onChange={(e) => setCustomers(Number(e.target.value))} />
        </label>
        <label className="field">
          <span className="field-head">
            <span>Average overdue per customer</span>
            <strong>SAR {avgOverdue}</strong>
          </span>
          <input type="range" min={50} max={2000} step={50} value={avgOverdue} onChange={(e) => setAvgOverdue(Number(e.target.value))} />
        </label>
      </div>
      <div className="impact-outputs">
        <div className="kpi">
          <strong>+{sar(extra)}</strong>
          <span>more collected per month than today’s cron</span>
        </div>
        <div className="kpi">
          <strong>−{Math.round(fewerFails).toLocaleString()}</strong>
          <span>failed charge attempts per month</span>
        </div>
        <p className="muted impact-note">
          Applies the simulation’s recovery rates ({pct(cron.recovery_rate)} → {pct(ai.recovery_rate)} of
          overdue in 30 days) and failed attempts per customer to your inputs. Illustrative only — not
          Tamara data.
        </p>
      </div>
    </div>
  );
}

export function Insights() {
  const [data, setData] = useState<MonthBacktest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  async function load() {
    setError(null);
    try {
      setData(await fetchInsights());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load insights");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <section className="panel">
        <h2 className="section-title">Why AI?</h2>
        <p className="error">{error}</p>
        <button type="button" className="ghost" onClick={load}>
          Try again
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="panel">
        <h2 className="section-title">Why AI?</h2>
        <p className="muted">Running the 30-day simulation… (first load can take up to a minute)</p>
      </section>
    );
  }

  const by = Object.fromEntries(data.strategies.map((s) => [s.strategy, s]));
  const ai = by[AI_STRATEGY];
  const cron = by.cron_only;
  const always = by.cron_plus_always_charge_on_repayment;
  const tip = (row: MonthStrategy) =>
    `${STRATEGY_NAMES[row.strategy]}: ${pct(row.recovery_rate)} recovered · ` +
    `${row.failed_attempts.toLocaleString()} failed attempts · ` +
    `${pct(row.customers_out_of_declines, 0)} ran out of declines`;

  return (
    <section className="panel insights">
      <div className="panel-head">
        <div>
          <h2 className="section-title">Why AI? One month, {data.customers.toLocaleString()} customers</h2>
          <p className="muted">
            Same simulated customers and the same luck for every approach. Mixed cards, with decline
            limits by network: Mada {data.decline_budget} a month, Visa and Mastercard{" "}
            {data.decline_budget_visa_mc}.
          </p>
        </div>
        <button type="button" className="ghost" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show charts" : "Show table"}
        </button>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <strong>{change(ai.recovered, cron.recovered)}</strong>
          <span>more overdue recovered than today’s cron</span>
        </div>
        <div className="kpi">
          <strong>{change(ai.failed_attempts, always.failed_attempts)}</strong>
          <span>failed attempts vs charging on every repayment — for about the same money</span>
        </div>
        <div className="kpi">
          <strong>
            {pct(ai.customers_out_of_declines, 0)}{" "}
            <small>vs {pct(always.customers_out_of_declines, 0)}</small>
          </strong>
          <span>of customers run out of declines this month</span>
        </div>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="insight-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Recovered</th>
                <th>Failed attempts</th>
                <th>Success rate</th>
                <th>Ran out of declines</th>
              </tr>
            </thead>
            <tbody>
              {data.strategies.map((row) => (
                <tr key={row.strategy} className={row.strategy === AI_STRATEGY ? "is-ai" : ""}>
                  <td>{STRATEGY_NAMES[row.strategy] ?? row.strategy}</td>
                  <td>{pct(row.recovery_rate)}</td>
                  <td>{row.failed_attempts.toLocaleString()}</td>
                  <td>{pct(row.success_rate, 0)}</td>
                  <td>{pct(row.customers_out_of_declines, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-grid">
          <BarChart
            title="Overdue recovered in 30 days"
            subtitle="Higher is better"
            rows={data.strategies}
            value={(r) => r.recovery_rate}
            format={(v) => pct(v)}
            tip={tip}
          />
          <BarChart
            title="Failed charge attempts"
            subtitle="Lower is better — each one burns a scarce decline"
            rows={data.strategies}
            value={(r) => r.failed_attempts}
            format={(v) => v.toLocaleString()}
            tip={tip}
          />
        </div>
      )}

      <ImpactCalculator data={data} />

      <ModelLearned />

      <div className="insight-notes">
        <p>
          <strong>What it shows.</strong> Rules collect as much money but spend far more declines
          doing it. The model charges in full right after a repayment, skips attempts that are
          very unlikely to succeed, and guards each card’s last decline — so almost nobody runs out
          of declines before the month ends.
        </p>
        <p className="muted">
          Synthetic simulation, not real Tamara data. Real numbers come from shadow mode on real
          attempt history.
        </p>
      </div>
    </section>
  );
}
