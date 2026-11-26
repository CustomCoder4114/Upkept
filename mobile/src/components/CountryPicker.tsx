/** Search-as-you-type country picker. Shows the chosen country and its currency. */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { type Country, searchCountries } from "../lib/countries";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/spacing";
import { fonts, type } from "../theme/typography";
import { TextField } from "./TextField";

export function CountryPicker({ value, onChange }: { value: Country | undefined; onChange: (c: Country) => void }) {
  const [editing, setEditing] = useState(!value);
  const [q, setQ] = useState("");
  const results = searchCountries(q);

  if (!editing && value) {
    return (
      <Pressable onPress={() => { setEditing(true); setQ(""); }} accessibilityRole="button" accessibilityLabel="Change country"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Text style={type.body}>{value.name} <Text style={{ color: colors.inkSoft }}>· {value.currency}</Text></Text>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>Change</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <TextField label="Country" value={q} onChangeText={setQ} placeholder="Start typing, e.g. Kenya, Brazil" autoFocus={!!value} />
      {results.length ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
          marginTop: -4, marginBottom: space.md, overflow: "hidden" }}>
          {results.map((c, i) => (
            <Pressable key={c.code} onPress={() => { onChange(c); setEditing(false); }} accessibilityRole="button"
              style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: space.lg,
                borderBottomWidth: i === results.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <Text style={type.body}>{c.name}</Text>
              <Text style={type.small}>{c.currency}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
