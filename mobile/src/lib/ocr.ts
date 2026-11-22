/**
 * Free, on-phone text reading with Google ML Kit (Android and iPhone).
 * Needs a development build (`npx expo run:android`); it does not run in Expo Go.
 * The photo never leaves the phone at this step, only the text does.
 */
import TextRecognition from "@react-native-ml-kit/text-recognition";

export async function readText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);
  return result.text ?? "";
}
