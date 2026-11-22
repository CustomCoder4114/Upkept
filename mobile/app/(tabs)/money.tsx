/** Money view: monthly and yearly cost, upcoming charges. Built from items, no bank login. */
import { Text, View } from "react-native";

import { useMoney } from "../../src/api/hooks";
import { Card, ErrorNote, Loading, Screen, SectionLabel } from "../../src/components/ui";
import { CATEGORY_LABELS } from "../../src/lib/checklists";
import { money, shortDate } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

export default function MoneyScreen() {
  const m = useMoney();

  return (
    <Screen>
      <Text style={type.title}>Money</Text>
      <Text style={[type.small, { marginTop: 4 }]}>From your subscriptions, policies and bills. No bank login needed.</Text>

      {m.isLoading ? <Loading /> : m.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={m.error} /></View> : null}

      {m.data && Object.entries(m.data.totals).map(([cur, t]) => (
        <View key={cur}>
          <Card dark style={{ marginTop: space.lg }}>
            <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft }}>Every month, on average</Text>
            <Text style={{ fontFamily: fonts.heading, fontSize: 36, color: colors.onDark }}>{money(t.monthly_minor, cur)}</Text>
            <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft, marginTop: 4 }}>{money(t.yearly_minor, cur)} a year</Text>
          </Card>
          <SectionLabel>By area, per year</SectionLabel>
          <Card style={{ padding: 0 }}>
            {Object.entries(t.by_category).sort((a, b) => b[1] - a[1]).map(([cat, v], idx, arr) => (
              <View key={cat} style={{ flexDirection: "row", justifyContent: "space-between", padding: space.lg,
                borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                <Text style={type.body}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                <Text style={type.h3}>{money(v, cur)}</Text>
              </View>
            ))}
          </Card>
        </View>
      ))}

      {m.data?.upcoming.length ? (
        <>
          <SectionLabel>Next 90 days</SectionLabel>
          <Card style={{ padding: 0 }}>
            {m.data.upcoming.map((u, idx) => (
              <View key={`${u.title}-${u.on}`} style={{ flexDirection: "row", justifyContent: "space-between", padding: space.lg,
                borderBottomWidth: idx === m.data!.upcoming.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                <View>
                  <Text style={type.h3}>{u.title}</Text>
                  <Text style={type.small}>{shortDate(u.on)}</Text>
                </View>
                <Text style={type.h3}>{money(u.amount_minor, u.currency)}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {m.data && !Object.keys(m.data.totals).length ? (
        <Text style={[type.body, { marginTop: space.xl }]}>Add a subscription or a policy with its cost to see your money calendar.</Text>
      ) : null}
    </Screen>
  );
}
