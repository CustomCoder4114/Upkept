import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { api } from "../../src/api/client";
import { TextField } from "../../src/components/TextField";
import { Button, ErrorNote, Screen } from "../../src/components/ui";
import { colors } from "../../src/theme/colors";
import { type } from "../../src/theme/typography";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.auth.login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: 48, marginBottom: 32 }}>
        <Text style={type.title}>Welcome back</Text>
        <Text style={[type.body, { color: colors.inkSoft, marginTop: 6 }]}>Everything that expires, in one place.</Text>
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
        autoComplete="email" textContentType="emailAddress" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"
        textContentType="password" />
      {error ? <ErrorNote error={error} /> : null}
      <Button title="Sign in" onPress={submit} loading={busy} style={{ marginTop: 12 }} />
      <Link href="/sign-up" style={[type.h3, { color: colors.primary, textAlign: "center", marginTop: 24 }]}>
        New here? Create an account
      </Link>
    </Screen>
  );
}
