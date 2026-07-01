module.exports = {
  apps: [
    {
      name: "motosaas-backend",
      script: "src/server.js",
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "512M",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      time: true
    }
  ]
};
