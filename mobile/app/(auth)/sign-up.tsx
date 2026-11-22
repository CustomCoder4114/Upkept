import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../../src/api/client";
import { TextField } from "../../src/components/TextField";
import { Button, Chip, ErrorNote, Screen } from "../../src/components/ui";
import { COUNTRY_NAMES } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { type } from "../../src/theme/typography";

/** Phase 1 launches in one country; more appear here as their guides are ready. */
const LAUNCH_COUNTRIES = [{ code: "KE", currency: "KES", timezone: "Africa/Nairobi" }];

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState(LAUNCH_COUNTRIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.register({
        name: name.trim(), email: email.trim(), password,
        country: country.code, currency: country.currency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || country.timezone,
      });
      router.replace("/onboarding");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: 32, marginBottom: 24 }}>
        <Text style={type.title}>Create your account</Text>
        <Text style={[type.body, { color: colors.inkSoft, marginTop: 6 }]}>Takes about 2 minutes, including your first 3 items.</Text>
      </View>
      <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Text style={[type.small, { marginBottom: 8 }]}>Country</Text>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        {LAUNCH_COUNTRIES.map((c) => (
          <Chip key={c.code} label={COUNTRY_NAMES[c.code] ?? c.code} active={c.code === country.code} onPress={() => setCountry(c)} />
        ))}
      </View>
      {error ? <ErrorNote error={error} /> : null}
      <Button title="Create account" onPress={submit} loading={busy} disabled={!name || !email || password.length < 8} />
      <Text style={[type.small, { textAlign: "center", marginTop: 16 }]}>
        We never sell your data and there are no ads.
      </Text>
      <Link href="/sign-in" asChild>
        <Pressable style={{ marginTop: 20 }}>
          <Text style={[type.h3, { color: colors.primary, textAlign: "center" }]}>I already have an account</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
