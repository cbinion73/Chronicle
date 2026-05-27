import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('chronicleDesktop', {
  isDesktopApp: true,
  platform: process.platform,
});
