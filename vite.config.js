import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import fs from 'fs'
import path from 'path'

const certDir = path.resolve(__dirname, 'cert')

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    https: fs.existsSync(path.join(certDir, 'cert.pem'))
      ? {
          key: fs.readFileSync(path.join(certDir, 'key.pem')),
          cert: fs.readFileSync(path.join(certDir, 'cert.pem'))
        }
      : false
  }
})
