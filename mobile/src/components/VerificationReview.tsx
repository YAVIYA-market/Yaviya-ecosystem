import { useCallback, useEffect, useState } from "react";
import { Image, Platform, Text } from "react-native";
import { api, apiBase, sessionHeaders } from "../lib/api";
import type { Verification } from "../lib/types";
import { Button, Card, ErrorText, Field, styles } from "./ui";
function Document({ userId }: { userId: string }) {
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let blobUrl = "";
    const url = `${apiBase}/api/verification/document?country=CD&userId=${encodeURIComponent(userId)}`;
    if (Platform.OS !== "web") return;
    fetch(url, {
      headers: sessionHeaders(),
      credentials: "omit",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Pièce inaccessible");
        blobUrl = URL.createObjectURL(await r.blob());
        setSrc(blobUrl);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [userId]);
  const documentSrc =
    Platform.OS === "web"
      ? src
      : `${apiBase}/api/verification/document?country=CD&userId=${encodeURIComponent(userId)}`;
  return (
    <>
      <ErrorText error={error} />
      {documentSrc && (
        <Image
          accessibilityLabel="Document confidentiel à vérifier"
          source={{ uri: documentSrc, headers: sessionHeaders() }}
          style={{ width: "100%", height: 250 }}
          resizeMode="contain"
        />
      )}
    </>
  );
}
function Review({
  row,
  refresh,
}: {
  row: Verification;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [identity, setIdentity] = useState(false),
    [company, setCompany] = useState(false),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const decision = async (value: string) => {
    setBusy(true);
    try {
      await api("/api/verification/reviews?country=CD", {
        userId: row.userId,
        decision: value,
        identityChecked: identity,
        companyChecked: company,
        note,
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={styles.heading}>{row.companyName || row.name}</Text>
      <Text style={styles.text}>
        {row.kind === "seller" ? "Vendeur" : "Livreur"} · {row.status}
      </Text>
      <Text style={styles.muted}>
        {row.phone} · {row.issuingCountry} · {row.documentType}
      </Text>
      <ErrorText error={error} />
      <Button
        outline
        title={open ? "Masquer la pièce" : "Examiner la pièce d’identité"}
        onPress={() => setOpen(!open)}
      />
      {open && <Document userId={row.userId} />}{" "}
      {row.status === "pending" && (
        <>
          <Button
            outline
            title={`${identity ? "✓ " : ""}J’ai vérifié la pièce et l’identité`}
            onPress={() => setIdentity(!identity)}
          />
          {row.kind === "seller" && (
            <Button
              outline
              title={`${company ? "✓ " : ""}J’ai vérifié l’activité de la boutique`}
              onPress={() => setCompany(!company)}
            />
          )}
          <Field
            label="Note de vérification / motif de refus"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Button
            title="Valider le dossier"
            disabled={busy || !identity || (row.kind === "seller" && !company)}
            onPress={() => decision("approve")}
          />
          <Button
            outline
            title="Refuser avec ce motif"
            disabled={busy || !note.trim()}
            onPress={() => decision("reject")}
          />
        </>
      )}
    </Card>
  );
}
export function VerificationReviews() {
  const [rows, setRows] = useState<Verification[]>([]),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<Verification[]>("/api/verification/reviews?country=CD")
        .then((value) => {
          setRows(value);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <ErrorText error={error} />
      <Button outline title="Actualiser les dossiers" onPress={load} />
      {rows.map((row) => (
        <Review key={row.userId} row={row} refresh={load} />
      ))}
      {!rows.length && (
        <Text style={styles.text}>Aucun dossier à examiner.</Text>
      )}
    </>
  );
}
