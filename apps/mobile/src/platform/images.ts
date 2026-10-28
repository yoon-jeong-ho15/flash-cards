import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { store } from './runtime';
import { uploadImage } from './cloud';

export async function chooseImage(camera = false): Promise<string | null> {
  const session = store.getState().session;
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('설정에서 카메라 접근을 허용해 주세요.');
  }
  const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }) :
    await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if ((asset.fileSize || 0) > 15 * 1024 * 1024) throw new Error('15MB 이하의 이미지를 선택해 주세요.');
  const context = ImageManipulator.manipulate(asset.uri);
  const ratio = Math.min(1, 1600 / Math.max(asset.width, asset.height));
  context.resize({ width: Math.max(1, Math.round(asset.width * ratio)), height: Math.max(1, Math.round(asset.height * ratio)) });
  const rendered = await context.renderAsync();
  const compressed = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.65, base64: true });
  if (!compressed.base64) throw new Error('이미지를 읽지 못했습니다. 다른 사진을 선택해 주세요.');
  if (compressed.base64.length > 500000) throw new Error('이미지가 너무 큽니다. 잘라내거나 작은 사진을 선택해 주세요.');
  if (session !== store.getState().session) throw new Error('계정이 변경되었습니다. 다시 첨부해 주세요.');
  const data = `data:image/jpeg;base64,${compressed.base64}`;
  const { user, online } = store.getState();
  if (user && online) {
    try { return await uploadImage(data, user.uid, () => session === store.getState().session); }
    catch { /* Durable data URL is uploaded by the outbox on the next successful sync. */ }
  }
  if (session !== store.getState().session) throw new Error('계정이 변경되었습니다.');
  return data;
}
