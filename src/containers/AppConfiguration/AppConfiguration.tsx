import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import styles from "./AppConfiguration.module.css";
import { useInstallationData } from "../../common/hooks/useInstallationData";

type Status = "idle" | "loading" | "success" | "error";

const AppConfigurationExtension: React.FC = () => {
  const { installationData, setInstallationData, loading } = useInstallationData();

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [tableName, setTableName] = useState("");

  const [testStatus, setTestStatus] = useState<Status>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<Status>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  // Hydrate from saved config
  useEffect(() => {
    if (loading) return;
    const saved = installationData.configuration as Record<string, unknown>;
    setSupabaseUrl((saved?.supabaseUrl as string) || "");
    setSupabaseAnonKey((saved?.supabaseAnonKey as string) || "");
    setTableName((saved?.tableName as string) || "");
    if (saved?.supabaseUrl && saved?.supabaseAnonKey && saved?.tableName) {
      setTestStatus("success");
      setTestMessage(`Using table "${saved.tableName}". Test connection to verify it's still reachable.`);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey || !tableName) {
      setTestStatus("error");
      setTestMessage("Please fill in all three fields before testing.");
      return;
    }

    setTestStatus("loading");
    setTestMessage("");

    try {
      const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
      const { error } = await supabase
        .from(tableName.trim())
        .select("*")
        .limit(1);

      if (error) {
        // 42P01 = table does not exist
        if (error.code === "42P01") {
          setTestStatus("error");
          setTestMessage(`Table "${tableName.trim()}" not found in the public schema. Check the name and try again.`);
        } else {
          setTestStatus("error");
          setTestMessage(error.message);
        }
        return;
      }

      setTestStatus("success");
      setTestMessage(`Connected! Table "${tableName.trim()}" is accessible.`);
    } catch (err: unknown) {
      setTestStatus("error");
      setTestMessage((err as { message?: string })?.message ?? "Unknown error");
    }
  }, [supabaseUrl, supabaseAnonKey, tableName]);

  const handleSave = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setSaveStatus("error");
      setSaveMessage("Project URL and Anon Key are required.");
      return;
    }

    setSaveStatus("loading");
    setSaveMessage("");

    try {
      await Promise.resolve(
        setInstallationData({
          configuration: {
            supabaseUrl: supabaseUrl.trim(),
            supabaseAnonKey: supabaseAnonKey.trim(),
            tableName: tableName.trim(),
          },
          serverConfiguration: {},
        })
      );
      setSaveStatus("success");
      setSaveMessage(
        tableName.trim()
          ? "Configuration saved."
          : "Credentials saved. Add a table name to activate the custom field."
      );
      setTimeout(() => setSaveStatus("idle"), 5000);
    } catch (err: unknown) {
      setSaveStatus("error");
      setSaveMessage(
        `Save failed: ${(err as { message?: string })?.message ?? "Unknown error"}`
      );
    }
  }, [supabaseUrl, supabaseAnonKey, tableName, setInstallationData]);

  if (loading) {
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.appConfig}>
          <p className={styles.loadingText}>Loading…</p>
        </div>
      </div>
    );
  }

  const canTest = !!supabaseUrl && !!supabaseAnonKey && !!tableName;
  const canSave = !!supabaseUrl && !!supabaseAnonKey;

  return (
    <div className={styles.layoutContainer}>
      <div className={styles.appConfig}>

        {/* ── Header ── */}
        <div className={styles.appConfigLogoContainer}>
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="54" height="54" rx="10" fill="#1C1C1C" />
            <path d="M28.5 10L12 31.5H27V44L43 22.5H28.5V10Z" fill="#3ECF8E" />
          </svg>
          <p>Supabase Event Picker</p>
          <span className={styles.subtitle}>
            Connect your Supabase project and choose the table to use in the custom field
          </span>
        </div>

        {/* ── Credentials ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Supabase Credentials</h3>

          <div className={styles.configContainer}>
            <div className={styles.infoContainerWrapper}>
              <div className={styles.infoContainer}>
                <label htmlFor="sb-url">Project URL</label>
              </div>
              <div className={styles.inputContainer}>
                <input
                  id="sb-url"
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => {
                    setSupabaseUrl(e.target.value);
                    setTestStatus("idle");
                    setTestMessage("");
                  }}
                  placeholder="https://your-project.supabase.co"
                  autoComplete="off"
                  className={styles.fieldInput}
                />
              </div>
            </div>
            <div className={styles.descriptionContainer}>
              <p>Found in Supabase → Settings → API.</p>
            </div>
          </div>

          <div className={styles.configContainer}>
            <div className={styles.infoContainerWrapper}>
              <div className={styles.infoContainer}>
                <label htmlFor="sb-anon">Anon Key</label>
              </div>
              <div className={styles.inputContainer}>
                <input
                  id="sb-anon"
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => {
                    setSupabaseAnonKey(e.target.value);
                    setTestStatus("idle");
                    setTestMessage("");
                  }}
                  placeholder="sb_publishable_… or eyJhbGci…"
                  autoComplete="off"
                  className={styles.fieldInput}
                />
              </div>
            </div>
            <div className={styles.descriptionContainer}>
              <p>Found in Supabase → Settings → API. Both JWT and <code>sb_publishable_*</code> formats are supported.</p>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Table</h3>

          <div className={styles.configContainer}>
            <div className={styles.infoContainerWrapper}>
              <div className={styles.infoContainer}>
                <label htmlFor="sb-table">Table Name</label>
              </div>
              <div className={styles.inputContainer}>
                <input
                  id="sb-table"
                  type="text"
                  value={tableName}
                  onChange={(e) => {
                    setTableName(e.target.value);
                    setTestStatus("idle");
                    setTestMessage("");
                  }}
                  placeholder="e.g. icsc_events"
                  autoComplete="off"
                  className={styles.fieldInput}
                />
              </div>
            </div>
            <div className={styles.descriptionContainer}>
              <p>Exact PostgreSQL table name from the <code>public</code> schema. Rows from this table populate the custom field dropdown.</p>
            </div>
          </div>

          <button
            className={`${styles.btn} ${styles.btnConnect}`}
            onClick={handleTest}
            disabled={!canTest || testStatus === "loading"}
          >
            {testStatus === "loading" ? "Testing…" : "Test Connection"}
          </button>

          {testMessage && (
            <div className={`${styles.statusMessage} ${testStatus === "success" ? styles.msgSuccess : styles.msgError}`}>
              {testMessage}
            </div>
          )}
        </div>

        {/* ── Save ── */}
        <div className={styles.saveRow}>
          <button
            className={`${styles.btn} ${styles.btnSave}`}
            onClick={handleSave}
            disabled={!canSave || saveStatus === "loading"}
          >
            {saveStatus === "loading" ? "Saving…" : "Save Configuration"}
          </button>
          {saveMessage && (
            <div className={`${styles.statusMessage} ${saveStatus === "success" ? styles.msgSuccess : styles.msgError}`}>
              {saveMessage}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AppConfigurationExtension;
