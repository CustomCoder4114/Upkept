/**
 * Free, on-phone text reading with Google ML Kit (Android and iPhone).
 * Needs the Upkept app build; it does not run in Expo Go.
 * The photo never leaves the phone at this step, only the text does.
 * Loaded only when first used, so the app still opens without it.
 */
export async function readText(imageUri: string): Promise<string> {
  let TextRecognition: typeof import("@react-native-ml-kit/text-recognition").default;
  try {
    TextRecognition = require("@react-native-ml-kit/text-recognition").default;
  } catch {
    throw new Error("Reading documents needs the Upkept app build, not Expo Go. Tap ✎ to type it in.");
  }
  const result = await TextRecognition.recognize(imageUri);
  return result.text ?? "";
}
