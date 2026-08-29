import { AppData, normalizeData } from './data'

const LS_KEY = 'mathink-data'

function hasElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}

export async function loadData(): Promise<AppData> {
  if (hasElectron()) {
    try {
      const d = await window.electronAPI.loadData()
      if (d) return normalizeData(d)
    } catch (e) { console.error('loadData (electron)', e) }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? normalizeData(JSON.parse(raw)) : normalizeData(null)
  } catch (e) {
    console.error('loadData (local)', e)
    return normalizeData(null)
  }
}

export async function saveData(data: AppData): Promise<boolean> {
  if (hasElectron()) {
    try {
      await window.electronAPI.saveData(data)
      return true
    } catch (e) { console.error('saveData (electron)', e) }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch (e) { console.error('saveData (local)', e) }
  return true
}

export async function resetData(): Promise<boolean> {
  if (hasElectron()) {
    try {
      await window.electronAPI.resetData()
      return true
    } catch (e) { console.error('resetData (electron)', e) }
  }
  try {
    localStorage.removeItem(LS_KEY)
  } catch (e) { console.error('resetData (local)', e) }
  return true
}