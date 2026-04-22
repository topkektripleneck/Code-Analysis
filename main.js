const { app, BrowserWindow, ipcMain } = require('electron')
const { initParser, analyzeCode } = require('./analyzer')
const os = require('os')
const pty = require('node-pty')

let lastPoints = []

let hubWin
let mainWin

function createHubWindow() {
  hubWin = new BrowserWindow({
    width: 900,
    height: 650,
    resizable: false,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  hubWin.loadFile('hub.html')
  hubWin.on('closed', () => { hubWin = null })
}

function createAnalyzerWindow(lang) {
  mainWin = new BrowserWindow({
    width: 1300,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  
  mainWin.loadFile('index.html', { query: { lang: lang } })

  // Setup PTY for the main window
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.USERPROFILE || process.env.HOME || process.cwd(),
    env: process.env
  })

  ptyProcess.onData((data) => {
    if (mainWin) mainWin.webContents.send('terminal-incData', data)
  })

  // Remove previous listeners before adding new ones to avoid accumulation
  ipcMain.removeAllListeners('terminal-into')
  ipcMain.removeAllListeners('terminal-resize')

  ipcMain.on('terminal-into', (event, data) => {
    ptyProcess.write(data)
  })

  ipcMain.on('terminal-resize', (event, { cols, rows }) => {
    ptyProcess.resize(cols, rows)
  })

  mainWin.on('closed', () => {
    mainWin = null
    ptyProcess.kill()
    ipcMain.removeAllListeners('terminal-into')
    ipcMain.removeAllListeners('terminal-resize')
  })
}

app.whenReady().then(createHubWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!hubWin && !mainWin) createHubWindow()
})

ipcMain.on('launch-analyzer', (event, lang) => {
  createAnalyzerWindow(lang)
  if (hubWin) hubWin.close()
})

ipcMain.on('launch-hub', () => {
  createHubWindow()
  if (mainWin) mainWin.close()
})

ipcMain.handle('analyze', async (event, { code, lang }) => {
  try {
    await initParser(lang)
    const result = analyzeCode(code)
    lastPoints = result.points
    return result
  } catch (err) {
    console.error('Error in analyze:', err)
    throw err
  }
})

ipcMain.handle('export-fingerprint', async () => {
  return JSON.stringify(lastPoints.map(p => p.fingerprint), null, 2)
})

ipcMain.handle('trace', async (event, { code, offset }) => {
  try {
    const { executeTrace } = require('./analyzer')
    // Wire terminal output back to the requesting window
    executeTrace._terminalEmit = (text) => {
      if (mainWin) mainWin.webContents.send('terminal-incData', text)
    }
    const traceData = await executeTrace(code, offset)
    return traceData
  } catch (err) {
    console.error('Error in trace:', err)
    throw err
  }
})