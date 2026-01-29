const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "InsurTech Policy Manager",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Your Render URL
  win.loadURL('https://insurtech-r36f.onrender.com');

  // Handle connection errors
  win.webContents.on('did-fail-load', () => {
    win.loadURL(`data:text/html,
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center; background: #1e293b; color: white;">
          <h1>Connection Error</h1>
          <p>Unable to connect to InsurTech server.</p>
          <p>Please check your internet connection and restart the application.</p>
          <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer; margin-top: 20px;">
            Retry
          </button>
        </body>
      </html>
    `);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
