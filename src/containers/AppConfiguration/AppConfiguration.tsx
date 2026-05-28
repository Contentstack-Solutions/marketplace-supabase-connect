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

  const [connStatus, setConnStatus] = useState<Status>("idle");
  const [connMessage, setConnMessage] = useState("");

  const [tableStatus, setTableStatus] = useState<Status>("idle");
  const [tableMessage, setTableMessage] = useState("");

  // Hydrate from saved config
  useEffect(() => {
    if (loading) return;
    const saved = installationData.configuration as Record<string, unknown>;
    setSupabaseUrl((saved?.supabaseUrl as string) || "");
    setSupabaseAnonKey((saved?.supabaseAnonKey as string) || "");
    setTableName((saved?.tableName as string) || "");
    if (saved?.supabaseUrl && saved?.supabaseAnonKey) {
      setConnStatus("success");
      setConnMessage("Previously configured. Re-test if credentials changed.");
    }
    if (saved?.tableName) {
      setTableStatus("success");
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestConnection = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setConnStatus("error");
      setConnMessage("Please fill in Project URL and Anon Key.");
      return;
    }

    setConnStatus("loading");
    setConnMessage("");

    try {
      const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
      // Query a non-existent table; a 42P01 response confirms credentials are valid
      const { error } = await supabase.from("__ping__").select("*").limit(1);

      if (!error || error.code === "42P01") {
        setConnStatus("success");
        setConnMessage("Connection successful!");
        setTableStatus("idle");
        setTableMessage("");
      } else {
        setConnStatus("error");
        setConnMessage(error.message);
      }
    } catch (err: unknown) {
      setConnStatus("error");
      setConnMessage((err as { message?: string })?.message ?? "Unknown error");
    }
  }, [supabaseUrl, supabaseAnonKey]);

  const handleSearchTable = useCallback(async () => {
    if (!tableName) return;

    setTableStatus("loading");
    setTableMessage("");

    try {
      const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
      const { error } = await supabase
        .from(tableName.trim())
        .select("*")
        .limit(1);

      if (error) {
        if (error.code === "42P01") {
          setTableStatus("error");
          setTableMessage(`Table "${tableName.trim()}" not found in the public schema.`);
        } else {
          setTableStatus("error");
          setTableMessage(error.message);
        }
        return;
      }

      setTableStatus("success");
      setTableMessage("");

      // Auto-save when table is verified
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
    } catch (err: unknown) {
      setTableStatus("error");
      setTableMessage((err as { message?: string })?.message ?? "Unknown error");
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

  const canTestConn = !!supabaseUrl && !!supabaseAnonKey;
  const canSearchTable = connStatus === "success" && !!tableName;

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
                    setConnStatus("idle");
                    setConnMessage("");
                    setTableStatus("idle");
                    setTableMessage("");
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
                    setConnStatus("idle");
                    setConnMessage("");
                    setTableStatus("idle");
                    setTableMessage("");
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

          <button
            className={`${styles.btn} ${styles.btnConnect}`}
            onClick={handleTestConnection}
            disabled={!canTestConn || connStatus === "loading"}
          >
            {connStatus === "loading" ? "Testing…" : "Test Connection"}
          </button>

          {connMessage && (
            <div className={`${styles.statusMessage} ${connStatus === "success" ? styles.msgSuccess : styles.msgError}`}>
              {connMessage}
            </div>
          )}
        </div>

        {/* ── Table (revealed after connection success) ── */}
        {connStatus === "success" && (
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
                      setTableStatus("idle");
                      setTableMessage("");
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
              onClick={handleSearchTable}
              disabled={!canSearchTable || tableStatus === "loading"}
            >
              {tableStatus === "loading" ? "Searching…" : "Search Table"}
            </button>

            {tableStatus === "success" && (
              <span className={styles.tableFoundText}>Table found</span>
            )}
            {tableStatus === "error" && tableMessage && (
              <div className={`${styles.statusMessage} ${styles.msgError}`}>
                {tableMessage}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AppConfigurationExtension;
