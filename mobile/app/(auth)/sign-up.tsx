import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../../src/api/client";
import { CountryPicker } from "../../src/components/CountryPicker";
import { TextField } from "../../src/components/TextField";
import { Button, ErrorNote, Screen } from "../../src/components/ui";
import { type Country, deviceCountry, deviceTimeZone } from "../../src/lib/countries";
import { colors } from "../../src/theme/colors";
import { type } from "../../src/theme/typography";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<Country | undefined>(deviceCountry());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    if (!country) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.register({
        name: name.trim(), email: email.trim(), password,
        country: country.code, currency: country.currency, timezone: deviceTimeZone(),
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
      <Text style={[type.small, { marginBottom: 6 }]}>Where do you live?</Text>
      <CountryPicker value={country} onChange={setCountry} />
      <Text style={[type.small, { marginBottom: 16 }]}>Sets your currency and which renewal guides you see. You can change it later.</Text>
      {error ? <ErrorNote error={error} /> : null}
      <Button title="Create account" onPress={submit} loading={busy} disabled={!name || !email || password.length < 8 || !country} />
      <Text style={[type.small, { textAlign: "center", marginTop: 16 }]}>We never sell your data and there are no ads.</Text>
      <Link href="/sign-in" asChild>
        <Pressable style={{ marginTop: 20 }}>
          <Text style={[type.h3, { color: colors.primary, textAlign: "center" }]}>I already have an account</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
