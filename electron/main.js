const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(app.getPath('userData'), 'mathink-data')
const DATA_FILE = path.join(DATA_DIR, 'appdata.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

const DEFAULT_DATA = {
  version: 2,
  profile: null,
  taskResults: [],
  history: [],
  settings: { sound: true, theme: 'dark' },
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Error loading data', e)
  }
  return DEFAULT_DATA
}

function saveData(data) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    title: 'MaThink',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const distPath = path.join(__dirname, '../dist/index.html')
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath)
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('load-data', () => {
  return loadData()
})

ipcMain.handle('save-data', (_event, data) => {
  saveData(data)
  return true
})

ipcMain.handle('reset-data', () => {
  saveData(DEFAULT_DATA)
  return true
})

ipcMain.handle('export-data', async (event) => {
  const data = loadData()
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export MaThink progress',
    defaultPath: `mathink-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return false
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('Export failed', e)
    return false
  }
})

ipcMain.handle('import-data', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import MaThink progress',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'))
    if (!parsed || typeof parsed !== 'object') return null
    saveData(parsed)
    return parsed
  } catch (e) {
    console.error('Import failed', e)
    return null
  }
})
