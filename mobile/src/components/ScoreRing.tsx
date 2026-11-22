import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ScoreRing({ score, size = 76 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Life in Order score ${score} out of 100`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#3A3B3E" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={colors.accent} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c * filled} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: colors.onDark }}>{score}</Text>
      </View>
    </View>
  );
}
