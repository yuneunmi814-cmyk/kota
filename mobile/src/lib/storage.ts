import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDED = 'tp_onboarded'

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDED)) === '1'
}
export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED, '1')
}
