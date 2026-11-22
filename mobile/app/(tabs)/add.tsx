/** Placeholder route for the centre "+" tab; the button opens /add/scan instead. */
import { Redirect } from "expo-router";

export default function AddTab() {
  return <Redirect href="/add/scan" />;
}
