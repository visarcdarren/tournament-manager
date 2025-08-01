import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// Device ID should be permanent - create once and never change
const DEVICE_STORAGE_KEY = 'tournament-device-id'
const DEVICE_NAME_KEY = 'tournament-device-name'

// Get or create permanent device ID
const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY)
  if (!deviceId) {
    deviceId = uuidv4()
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId)
    console.log('Created new permanent device ID:', deviceId)
  }
  return deviceId
}

// Get or create device name
const getOrCreateDeviceName = () => {
  let deviceName = localStorage.getItem(DEVICE_NAME_KEY)
  if (!deviceName) {
    const deviceId = getOrCreateDeviceId()
    deviceName = `Device-${deviceId.slice(0, 8)}`
    localStorage.setItem(DEVICE_NAME_KEY, deviceName)
  }
  return deviceName
}

const useDeviceStore = create((set, get) => ({
  deviceId: getOrCreateDeviceId(),
  deviceName: getOrCreateDeviceName(),
  
  // Initialize device - ensures ID exists but never changes it
  initializeDevice: () => {
    const state = get()
    if (!state.deviceId) {
      // This should never happen with the new logic, but just in case
      set({ 
        deviceId: getOrCreateDeviceId(),
        deviceName: getOrCreateDeviceName()
      })
    }
    console.log('Device initialized:', state.deviceId)
  },
  
  // Set device name (updates both store and localStorage)
  setDeviceName: (name) => {
    localStorage.setItem(DEVICE_NAME_KEY, name)
    set({ deviceName: name })
  },
  
  // Get auth headers for API calls
  getAuthHeaders: () => {
    const state = get()
    return {
      'X-Device-ID': state.deviceId,
      'X-Device-Name': state.deviceName,
    }
  },
  
  // Debug method to reset device (for development only)
  resetDevice: () => {
    localStorage.removeItem(DEVICE_STORAGE_KEY)
    localStorage.removeItem(DEVICE_NAME_KEY)
    const newId = getOrCreateDeviceId()
    const newName = getOrCreateDeviceName()
    set({ deviceId: newId, deviceName: newName })
    console.log('Device reset. New ID:', newId)
  }
}))

export default useDeviceStore
