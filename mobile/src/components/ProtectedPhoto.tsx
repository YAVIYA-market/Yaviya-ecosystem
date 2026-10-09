import { useEffect, useState } from "react";
import { Image, Platform, Text } from "react-native";
import { apiBase, sessionHeaders } from "../lib/api";
import { styles } from "./ui";
// Native Image supports authenticated headers; web Image does not, so fetch a private blob.
export function ProtectedPhoto({
  path,
  label,
  height = 180,
}: {
  path: string;
  label: string;
  height?: number;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const source = apiBase + path;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const controller = new AbortController();
    let blob = "";
    fetch(source, {
      headers: sessionHeaders(),
      credentials: "omit",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Photo inaccessible");
        blob = URL.createObjectURL(await response.blob());
        setUrl(blob);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => {
      controller.abort();
      if (blob) URL.revokeObjectURL(blob);
    };
  }, [source]);
  const uri = Platform.OS === "web" ? url : source;
  return error ? (
    <Text style={styles.error}>{error}</Text>
  ) : uri ? (
    <Image
      accessibilityLabel={label}
      source={{ uri, headers: sessionHeaders() }}
      resizeMode="contain"
      style={{ width: "100%", height }}
    />
  ) : null;
}
