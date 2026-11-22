/** App lock with fingerprint, face, or the phone's PIN. */
import * as LocalAuthentication from "expo-local-authentication";

export async function canUseBiometrics() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function unlock(): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Upkept",
    fallbackLabel: "Use PIN",
    disableDeviceFallback: false, // allow the phone's own PIN if biometrics fail
  });
  return res.success;
}
