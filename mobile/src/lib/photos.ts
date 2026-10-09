import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
export type Photo = { uri: string; name: string; type: string };
export async function choosePhotos(multiple = false): Promise<Photo[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 8 : 1,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    name: a.fileName || "photo.jpg",
    type: a.mimeType || "image/jpeg",
  }));
}
export async function appendPhoto(form: FormData, key: string, photo: Photo) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(photo.uri)).blob();
    form.append(key, blob, photo.name);
  } else
    form.append(key, {
      uri: photo.uri,
      name: photo.name,
      type: photo.type,
    } as unknown as Blob);
}
