const { app, BrowserWindow, ipcMain } = require('electron')
const { initParser, analyzeCode, executeTrace } = require('./analyzer')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

ipcMain.handle('analyze', async (event, { code, lang }) => {
  try {
    await initParser(lang)
    const points = analyzeCode(code)
    return points
  } catch (err) {
    console.error('Error in analyze:', err)
    throw err
  }
})

ipcMain.handle('trace', async (event, { code, offset }) => {
  try {
    const traceData = await executeTrace(code, offset)
    return traceData
  } catch (err) {
    console.error('Error in trace:', err)
    throw err
  }
})