import { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";
import { api } from "../lib/api";
import { Button, Card, ErrorText, Field, styles } from "./ui";
type Thread = { userId: string; name: string };
type Data = {
  threads: Thread[];
  messages: { id: string; sender: string; message: string }[];
};
export function AdminChat({
  role,
  kind,
}: {
  role: "seller" | "courier" | "admin";
  kind: "seller" | "courier";
}) {
  const [target, setTarget] = useState(""),
    [data, setData] = useState<Data | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const endpoint = `/api/${kind}-messages?country=CD&view=${role}${target ? `&${kind}UserId=${encodeURIComponent(target)}` : ""}`;
  const load = useCallback(
    () =>
      api<Data>(endpoint)
        .then((value) => {
          setData(value);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [endpoint],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Card>
      <Text style={styles.heading}>
        {role === "admin"
          ? `Discussions ${kind === "courier" ? "livreurs" : "vendeurs"}`
          : "Échanger avec l’administration"}
      </Text>
      <ErrorText error={error} />
      {role === "admin" &&
        data?.threads.map((t) => (
          <Button
            key={t.userId}
            outline
            title={t.name}
            onPress={() => setTarget(t.userId)}
          />
        ))}
      {data?.messages.map((m) => (
        <Text key={m.id} style={styles.text}>
          {m.sender} : {m.message}
        </Text>
      ))}
      <Button outline title="Actualiser la discussion" onPress={load} />
      {(role !== "admin" || target) && (
        <>
          <Field
            label="Message à l’administration"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Button
            title="Envoyer le message"
            disabled={busy || !message.trim()}
            onPress={async () => {
              setBusy(true);
              try {
                await api(endpoint, {
                  message,
                  ...(target ? { [`${kind}UserId`]: target } : {}),
                  ...(role === kind
                    ? { [kind === "courier" ? "asCourier" : "asSeller"]: true }
                    : {}),
                });
                setMessage("");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Card>
  );
}
