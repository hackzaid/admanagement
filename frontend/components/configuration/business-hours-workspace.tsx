"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { ConfigurationOverview, updateBusinessHours } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";

import { ConfigurationShell } from "./config-shell";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function intValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function BusinessHoursWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [businessHours, setBusinessHours] = useState(overview.business_hours);
  const [draft, setDraft] = useState({
    timezone_name: overview.business_hours.timezone_name,
    start_hour: String(overview.business_hours.start_hour),
    end_hour: String(overview.business_hours.end_hour),
    working_days: overview.business_hours.working_days,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await updateBusinessHours({
        timezone_name: draft.timezone_name,
        start_hour: intValue(draft.start_hour, businessHours.start_hour),
        end_hour: intValue(draft.end_hour, businessHours.end_hour),
        working_days: draft.working_days,
      });
      setBusinessHours(saved);
      setDraft({
        timezone_name: saved.timezone_name,
        start_hour: String(saved.start_hour),
        end_hour: String(saved.end_hour),
        working_days: saved.working_days,
      });
      setMessage("Business hours updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigurationShell
      overview={{ ...overview, business_hours: businessHours }}
      subtitle="Define the working window that distinguishes expected admin activity from after-hours risk."
      title="Business Hours"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Risk context window" title="Business Hours">
        <div className="config-form-grid">
          <label className="config-field">
            <span>Timezone</span>
            <input value={draft.timezone_name} onChange={(event) => setDraft((current) => ({ ...current, timezone_name: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Start Hour</span>
            <input max={23} min={0} type="number" value={draft.start_hour} onChange={(event) => setDraft((current) => ({ ...current, start_hour: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>End Hour</span>
            <input max={23} min={0} type="number" value={draft.end_hour} onChange={(event) => setDraft((current) => ({ ...current, end_hour: event.target.value }))} />
          </label>
          <div className="config-field config-field-full">
            <span>Working Days</span>
            <div className="config-checkbox-grid">
              {WEEKDAYS.map((day) => (
                <label className="config-toggle" key={day}>
                  <input
                    checked={draft.working_days.includes(day)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        working_days: event.target.checked
                          ? [...current.working_days, day]
                          : current.working_days.filter((item) => item !== day),
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="config-actions">
          <button className="dashboard-apply-button" disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Saving..." : "Save Business Hours"}
          </button>
          <span className="config-meta">Updated {formatDisplayDateTime(businessHours.updated_at_utc, "No update recorded")}</span>
        </div>
      </SectionPanel>
    </ConfigurationShell>
  );
}
