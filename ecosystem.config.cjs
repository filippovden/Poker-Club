// PM2 process manager config — keeps the site (and the Telegram bot,
// which runs inside the same Next.js process via instrumentation.ts)
// alive 24/7: restarts it if it crashes and on server reboot.
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "royal63",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
