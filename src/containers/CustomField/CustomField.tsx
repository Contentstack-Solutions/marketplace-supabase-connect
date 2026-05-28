import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAppConfig } from "../../common/hooks/useAppConfig";
import { useCustomField } from "../../common/hooks/useCustomField";
import "./CustomField.css";

type FetchStatus = "loading" | "success" | "error" | "unconfigured";

// Row from Supabase — any shape depending on the table
type Row = Record<string, unknown>;

// Show only the title column in the dropdown label
function rowLabel(row: Row): string {
  return (row.title as string) ?? rowKey(row);
}

// Stable key for matching the saved value back to a dropdown option
function rowKey(row: Row): string {
  return JSON.stringify(row);
}

const CustomFieldExtension = () => {
  const appConfig = useAppConfig();
  const { customField, setFieldData } = useCustomField();

  console.log("[CustomField] appConfig:", appConfig);

  const supabaseUrl = (appConfig?.supabaseUrl as string) || "";
  const supabaseAnonKey = (appConfig?.supabaseAnonKey as string) || "";
  const tableName = (appConfig?.tableName as string) || "";

  const [rows, setRows] = useState<Row[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !tableName) {
      setFetchStatus("unconfigured");
      return;
    }

    let cancelled = false;
    setFetchStatus("loading");

    const fetchRows = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.from(tableName).select("*");

        if (cancelled) return;
        if (error) throw error;

        setRows(data ?? []);
        setFetchStatus("success");
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMessage((err as { message?: string })?.message ?? "Failed to fetch rows.");
        setFetchStatus("error");
      }
    };

    fetchRows();
    return () => { cancelled = true; };
  }, [supabaseUrl, supabaseAnonKey, tableName]);

  // The saved value is a full row object — serialise it to match against option values
  const currentValue = customField ? JSON.stringify(customField) : "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const raw = e.target.value;
      if (!raw) {
        setFieldData(null);
        return;
      }
      try {
        setFieldData(JSON.parse(raw));
      } catch {
        setFieldData(raw);
      }
    },
    [setFieldData]
  );

  // ── States ──────────────────────────────────────────────────────────────────
  if (fetchStatus === "unconfigured") {
    return (
      <div className="cf-container">
        <div className="cf-state cf-state--warning">
          <span className="cf-state__icon">⚙</span>
          <p className="cf-state__title">Not Configured</p>
          <p className="cf-state__message">
            Open <strong>App Configuration</strong> in the Developer Hub to connect Supabase and choose a table.
          </p>
        </div>
      </div>
    );
  }

  if (fetchStatus === "loading") {
    return (
      <div className="cf-container">
        <div className="cf-state">
          <span className="cf-spinner" />
          <p className="cf-state__message">Loading rows from <code>{tableName}</code>…</p>
        </div>
      </div>
    );
  }

  if (fetchStatus === "error") {
    return (
      <div className="cf-container">
        <div className="cf-state cf-state--error">
          <span className="cf-state__icon">✕</span>
          <p className="cf-state__title">Failed to Load</p>
          <p className="cf-state__message">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ── Dropdown ─────────────────────────────────────────────────────────────────
  return (
    <div className="cf-container">
      <label className="cf-label" htmlFor="cf-select">
        {tableName}
      </label>

      <div className="cf-select-wrapper">
        <select
          id="cf-select"
          className="cf-select"
          value={currentValue}
          onChange={handleChange}
        >
          <option value="">— Select a row —</option>
          {rows.map((row, i) => (
            <option key={i} value={rowKey(row)}>
              {rowLabel(row)}
            </option>
          ))}
        </select>
        <span className="cf-select__chevron" aria-hidden="true">▾</span>
      </div>

      {rows.length === 0 && (
        <p className="cf-empty">Table <code>{tableName}</code> has no rows.</p>
      )}

      {currentValue && (
        <p className="cf-selected-label">Event selected</p>
      )}
    </div>
  );
};

export default CustomFieldExtension;
