import type { AiDriver } from "./types";

export type AiDecisionViewProps = {
  action: string;
  score: number;
  bar: number | null;
  gate: string | null;
  card: string | null;
  declinesLeft: number | null;
  drivers: AiDriver[];
  nextAction: string | null;
  reason: string;
};

export function AiDecisionView(props: AiDecisionViewProps) {
  const { action, score, bar, gate, card, declinesLeft, drivers, nextAction } = props;
  const reason = props.reason.split(" Drivers:")[0];
  const charged = action === "charge" || action === "partial";

  return (
    <div className="ai-decision">
      <div className="ai-chips">
        <span className={`tag tag-${action}`}>{charged ? "Charge" : "Skip"}</span>
        {card ? <span className="ai-chip">{card}</span> : null}
        {declinesLeft != null ? (
          <span className="ai-chip">
            {declinesLeft} decline{declinesLeft === 1 ? "" : "s"} left this month
          </span>
        ) : null}
      </div>

      {gate ? (
        <p className="ai-gate">
          <strong>Hard rule:</strong> {gate}. The model isn’t asked.
        </p>
      ) : (
        <div className="prob">
          <div className="prob-head">
            <span>
              Chance this charge succeeds: <strong>{Math.round(score * 100)}%</strong>
            </span>
            {bar != null ? <span className="muted">needs {Math.round(bar * 100)}%</span> : null}
          </div>
          <div
            className="prob-track"
            role="img"
            aria-label={`P(success) ${Math.round(score * 100)}%${bar != null ? `, bar ${Math.round(bar * 100)}%` : ""}`}
          >
            <span className={`prob-fill ${charged ? "go" : "stop"}`} style={{ width: `${Math.max(score * 100, 1.5)}%` }} />
            {bar != null ? <span className="prob-bar" style={{ left: `${bar * 100}%` }} /> : null}
          </div>
        </div>
      )}

      {gate ? null : <p className="ai-reason">{reason}</p>}

      {drivers.length ? (
        <div className="ai-drivers">
          <span className="muted">Why:</span>
          {drivers.map((driver) => (
            <span key={driver.feature} className={`driver ${driver.direction === "+" ? "up" : "down"}`}>
              {driver.direction === "+" ? "▲" : "▼"} {driver.label}
            </span>
          ))}
        </div>
      ) : null}

      {nextAction ? (
        <p className="ai-next">
          <strong>Next best action:</strong> {nextAction}
        </p>
      ) : null}
    </div>
  );
}

