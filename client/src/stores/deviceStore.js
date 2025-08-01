import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// Simple localStorage persistence
const persist = (config) => (set, get, api) => {
  const storageName = 'device-storage'
  
  // Load from localStorage
  const stored = localStorage.getItem(storageName)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      set(parsed)
    } catch (e) {
      console.error('Failed to parse stored data:', e)
    }
  }
  
  // Create store with automatic persistence
  const store = config(
    (...args) => {
      set(...args)
      // Save to localStorage after each update
      const state = get()
      localStorage.setItem(storageName, JSON.stringify(state))
    },
    get,
    api
  )
  
  return store
}

const useDeviceStore = create(
  persist((set, get) => ({
      deviceId: null,
      deviceName: '',
      role: 'VIEWER',
      permissions: [],
      
      // Initialize device ID
      initializeDevice: () => {
        const existingId = get().deviceId
        if (!existingId) {
          const newId = uuidv4()
          const defaultName = `Device-${newId.slice(0, 8)}`
          set({ deviceId: newId, deviceName: defaultName })
        }
      },
      
      // Set device name
      setDeviceName: (name) => set({ deviceName: name }),
      
      // Update role
      setRole: (role) => set({ role }),
      
      // Update permissions
      setPermissions: (permissions) => set({ permissions }),
      
      // Get auth headers
      getAuthHeaders: () => {
        const state = get()
        return {
          'X-Device-ID': state.deviceId,
          'X-Device-Name': state.deviceName,
        }
      }
    })
  )
)

export default useDeviceStore
