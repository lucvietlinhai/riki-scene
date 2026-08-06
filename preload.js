const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startRender(config) {
    ipcRenderer.send("render:start", config);
  },
  cancelRender() {
    ipcRenderer.send("render:cancel");
  },
  openOutput(filePath) {
    ipcRenderer.send("render:open-output", filePath);
  },
  async showSaveDialog(options) {
    return ipcRenderer.invoke("dialog:show-save", options);
  },
  async previewVoice(data) {
    return ipcRenderer.invoke("voice:preview", data);
  },
  onLog(callback) {
    ipcRenderer.on("render:log", (_event, data) => callback(data));
  },
  onDone(callback) {
    ipcRenderer.on("render:done", (_event, data) => callback(data));
  },
  onProgress(callback) {
    ipcRenderer.on("render:progress", (_event, pct) => callback(pct));
  },
  async updateCode() {
    return ipcRenderer.invoke("app:update-code");
  },
});
