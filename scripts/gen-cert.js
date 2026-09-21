// 生成自签名 HTTPS 证书（包含本地 IP 作为 SAN）
const selfsigned = require('selfsigned')
const fs = require('fs')
const path = require('path')

const LOCAL_IP = '192.168.101.5'

async function main() {
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'IM Dev' }
  ]

  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    days: 365,
    algorithm: 'sha256',
    extensions: [
      { name: 'subjectAltName', altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: LOCAL_IP }
      ] },
      { name: 'extKeyUsage', serverAuth: true }
    ]
  })

  console.log('pems keys:', Object.keys(pems))

  const certDir = path.join(__dirname, '..', 'cert')
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })

  fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private)
  fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert)

  console.log('证书已生成:')
  console.log('  key:  ' + path.join(certDir, 'key.pem'))
  console.log('  cert: ' + path.join(certDir, 'cert.pem'))
  console.log('  SAN:  localhost, 127.0.0.1, ' + LOCAL_IP)
}

main().catch((e) => {
  console.error('生成失败:', e)
  process.exit(1)
})
