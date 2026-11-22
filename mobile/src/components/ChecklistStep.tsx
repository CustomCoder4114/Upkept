import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { space } from "../theme/spacing";
import { fonts } from "../theme/typography";

/** One tickable step in the dark "Get it done" card. */
export function ChecklistStep({ title, detail, done, onToggle }: {
  title: string; detail: string; done: boolean; onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={{ flexDirection: "row", paddingVertical: space.sm }}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 6, marginRight: space.md, marginTop: 1, alignItems: "center",
        justifyContent: "center", borderWidth: done ? 0 : 1.5, borderColor: "#8A8B8E",
        backgroundColor: done ? colors.accent : "transparent",
      }}>
        {done ? <Feather name="check" size={15} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onDark }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.onDarkSoft }}>{detail}</Text>
      </View>
    </Pressable>
  );
}
