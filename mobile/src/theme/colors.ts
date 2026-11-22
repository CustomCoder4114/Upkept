/** Colours taken from the four app designs. */
export const colors = {
  background: "#F3F1EC", // warm off-white page
  card: "#FFFFFF",
  border: "#E6E2DA",
  ink: "#1A1A1A",
  inkSoft: "#5F5F5F", // body text on light backgrounds (passes WCAG AA on #F3F1EC)
  inkMuted: "#6E6E6E",
  dark: "#1B1C1E", // "Get it done" and score cards
  onDark: "#FFFFFF",
  onDarkSoft: "#C9C9C9",

  primary: "#12664F", // main buttons
  primaryText: "#FFFFFF",
  accent: "#2E9E6A", // progress bar, ticks, score ring
  mint: "#E3F0EA", // reminder note, travel banner
  mintText: "#12664F",

  amber: "#9A5B00", // darker than the design's amber so text stays readable
  amberBg: "#FCEFD9",
  red: "#A8201A",
  redBg: "#FBE3E1",
  neutralBg: "#EEECE7",
  neutralText: "#4A4A4A",
} as const;
