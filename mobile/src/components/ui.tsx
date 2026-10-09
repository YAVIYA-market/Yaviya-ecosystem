import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export const colors = {
  orange: "#c2410c",
  light: "#fff2e8",
  ink: "#19232d",
  muted: "#62707c",
  line: "#e7e9ec",
  white: "#fff",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#faf9f7" },
  content: {
    padding: 18,
    gap: 16,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  heading: { fontSize: 19, fontWeight: "700", color: colors.ink },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  price: { fontSize: 20, fontWeight: "800", color: colors.orange },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d7dce0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: colors.ink,
    width: "100%",
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontSize: 15, fontWeight: "700" },
  error: {
    backgroundColor: "#fff0ee",
    borderRadius: 12,
    padding: 14,
    color: "#9b2118",
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "white",
  },
  chipText: { color: colors.ink, fontSize: 14 },
  selected: { borderColor: colors.orange, backgroundColor: colors.light },
});
export function Page({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.page} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  disabled = false,
  outline = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        outline && {
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: colors.orange,
        },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, outline && { color: colors.orange }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6, width: "100%" }}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && { minHeight: 90 }]}
        {...props}
      />
    </View>
  );
}
export function Choices({
  values,
  value,
  onChange,
}: {
  values: { id: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.row}>
      {values.map((v) => (
        <Pressable
          key={v.id}
          accessibilityRole="radio"
          accessibilityLabel={v.label}
          accessibilityState={{
            selected: value === v.id,
            disabled: !!v.disabled,
          }}
          disabled={v.disabled}
          onPress={() => onChange(v.id)}
          style={[
            styles.chip,
            value === v.id && styles.selected,
            v.disabled && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.chipText}>{v.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Button
        outline
        title={`${label} : ${value || "Choisir"}`}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <Card>
          <Field
            label={`Rechercher ${label.toLowerCase()}`}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {options
              .filter((x) => x.toLowerCase().includes(query.toLowerCase()))
              .map((v) => (
                <Pressable
                  accessibilityRole="button"
                  key={v}
                  onPress={() => {
                    onChange(v);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={styles.text}>{v}</Text>
                </Pressable>
              ))}
          </ScrollView>
        </Card>
      )}
    </View>
  );
}
export function ErrorText({ error }: { error: string }) {
  return error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  ) : null;
}
export function Loading() {
  return <ActivityIndicator size="large" color={colors.orange} />;
}
export const money = (amount: number) =>
  `${(amount || 0).toLocaleString("fr-FR")} FC`;
