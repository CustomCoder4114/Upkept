import type { TextStyle } from "react-native";

import { colors } from "./colors";

/** Space Grotesk for headings and numbers, Inter for everything else. */
export const fonts = {
  heading: "SpaceGrotesk_700Bold",
  headingMedium: "SpaceGrotesk_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodyBold: "Inter_600SemiBold",
};

export const type: Record<string, TextStyle> = {
  title: { fontFamily: fonts.heading, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.heading, fontSize: 20, color: colors.ink },
  h3: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  bigNumber: { fontFamily: fonts.heading, fontSize: 48, color: colors.ink, letterSpacing: -1.5 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft, letterSpacing: 0.8 },
  button: { fontFamily: fonts.bodyBold, fontSize: 16 },
};
