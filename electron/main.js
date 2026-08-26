const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

const DATA_DIR = path.join(app.getPath('userData'), 'mathink-data')
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (e) {
    console.error('Error reading', filePath, e)
  }
  return fallback
}

function writeJson(filePath, data) {
  ensureDataDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
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

ipcMain.handle('load-history', () => {
  return readJson(HISTORY_FILE, [])
})

ipcMain.handle('save-history', (_event, history) => {
  writeJson(HISTORY_FILE, history)
  return true
})

ipcMain.handle('load-settings', () => {
  return readJson(SETTINGS_FILE, {})
})

ipcMain.handle('save-settings', (_event, settings) => {
  writeJson(SETTINGS_FILE, settings)
  return true
})
