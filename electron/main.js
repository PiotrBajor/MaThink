const { app, BrowserWindow, ipcMain } = require('electron')
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
  profile: null,
  taskResults: [],
  history: [],
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
