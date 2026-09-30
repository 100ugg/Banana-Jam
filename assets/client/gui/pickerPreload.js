// Banana Jam: bridge for the separate colour picker window
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wzPickerBridge", {
  color: (hex, final, cancelled) => ipcRenderer.send("wz-picker-color", { hex, final: !!final, cancelled: !!cancelled }),
  close: () => ipcRenderer.send("wz-picker-close"),
  size: (width, height) => ipcRenderer.send("wz-picker-size", { width, height }),
});
