import { Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "../theme/colors";
import { radius, space } from "../theme/spacing";
import { fonts, type } from "../theme/typography";

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.small, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={{
          height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: error ? colors.red : colors.border,
          backgroundColor: colors.card, paddingHorizontal: space.lg, fontFamily: fonts.body, fontSize: 16, color: colors.ink,
        }}
        {...props}
      />
      {error ? <Text style={[type.small, { color: colors.red, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

/**
 * One row of the "Is this right?" table. Fields the reader was unsure about
 * (confidence < 0.7) get an amber outline so people actually check them.
 */
export function ConfirmRow({ label, value, onChange, confidence, last, placeholder, keyboardType, secure }: {
  label: string; value: string; onChange: (v: string) => void; confidence?: number; last?: boolean;
  placeholder?: string; keyboardType?: TextInputProps["keyboardType"]; secure?: boolean;
}) {
  const unsure = confidence !== undefined && confidence < 0.7;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", minHeight: 56, paddingHorizontal: space.lg,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border,
      backgroundColor: unsure ? colors.amberBg : "transparent",
    }}>
      <Text style={[type.small, { width: 96 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? "Add"}
        placeholderTextColor={colors.inkMuted}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        accessibilityLabel={unsure ? `${label}, please check` : label}
        style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, paddingVertical: 12 }}
      />
      {unsure ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.amber }}>Check</Text> : null}
    </View>
  );
}
