/** Trips list + add a trip (destination, dates, who's going). */
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useCreateTrip, useProfiles, useTrips } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Card, Chip, CircleButton, ErrorNote, Screen, SectionLabel } from "../../src/components/ui";
import { COUNTRY_NAMES, parseDateInput, shortDate } from "../../src/lib/format";
import { space } from "../../src/theme/spacing";
import { type } from "../../src/theme/typography";

export default function TripsScreen() {
  const trips = useTrips();
  const profiles = useProfiles();
  const create = useCreateTrip();
  const [destination, setDestination] = useState("GB");
  const [city, setCity] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [who, setWho] = useState<string[]>([]);

  const travellers = who.length ? who : profiles.data?.filter((p) => p.relation === "self").map((p) => p.id) ?? [];
  const s = parseDateInput(starts);
  const e = parseDateInput(ends);

  const add = () =>
    create.mutate(
      { destination, city: city || undefined, starts_on: s!, ends_on: e!, traveller_ids: travellers },
      { onSuccess: (trip) => router.replace(`/travel/${trip.id}`) },
    );

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { marginLeft: space.md }]}>Trips</Text>
      </View>

      {trips.data?.map((t) => (
        <Pressable key={t.id} onPress={() => router.push(`/travel/${t.id}`)}>
          <Card style={{ marginBottom: space.sm, padding: space.lg }}>
            <Text style={type.h3}>{t.city ?? COUNTRY_NAMES[t.destination] ?? t.destination}</Text>
            <Text style={type.small}>{shortDate(t.starts_on)} to {shortDate(t.ends_on)}</Text>
          </Card>
        </Pressable>
      ))}

      <SectionLabel>Check a new trip</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
        {Object.entries(COUNTRY_NAMES).filter(([c]) => c !== "KE").map(([code, name]) => (
          <Chip key={code} label={name} active={destination === code} onPress={() => setDestination(code)} />
        ))}
      </ScrollView>
      <TextField label="City (optional)" value={city} onChangeText={setCity} />
      <TextField label="Leaving" value={starts} onChangeText={setStarts} placeholder="14 June 2027"
        error={starts && !s ? "Try “14 June 2027”" : undefined} />
      <TextField label="Coming back" value={ends} onChangeText={setEnds} placeholder="28 June 2027"
        error={ends && !e ? "Try “28 June 2027”" : s && e && e < s ? "Comes back before leaving" : undefined} />
      {profiles.data && profiles.data.length > 1 ? (
        <>
          <Text style={[type.small, { marginBottom: 6 }]}>Who's going?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
            {profiles.data.map((p) => (
              <Chip key={p.id} label={p.relation === "self" ? "Me" : p.name} active={travellers.includes(p.id)}
                onPress={() => setWho(travellers.includes(p.id) ? travellers.filter((x) => x !== p.id) : [...travellers, p.id])} />
            ))}
          </ScrollView>
        </>
      ) : null}
      {create.error ? <ErrorNote error={create.error} /> : null}
      <Button title="Check if we're ready" onPress={add} loading={create.isPending}
        disabled={!s || !e || e < s || !travellers.length} />
    </Screen>
  );
}
