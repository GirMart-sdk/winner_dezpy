module.exports = {
  apps: [
    {
      name: "winner-store",
      script: "backend/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PM2_LOG_FILE: "./logs/winner-store-pm2.log",
      },
      env_production: {
        NODE_ENV: "production",
        PM2_LOG_FILE: "./logs/winner-store-pm2.log",
        // SSL/TLS Configuration
        CERT_PATH: "./certs/cert.pem",
        KEY_PATH: "./certs/key.pem",
        HTTPS_PORT: "443",
        HTTP_PORT: "80",
        // Security
        ADMIN_USER: "admin",
        JWT_SECRET: "prod-jwt-secret-winner-2026-secure",
        API_KEY: "prod-api-key-winner-2026",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/winner-store-err.log",
      out_file: "./logs/winner-store-out.log",
      time: true,
      // Windows Server optimizaciones
      exec_mode: "fork",
      node_args: "--max-old-space-size=1024",
      kill_timeout: 5000,
    },
  ],
};
