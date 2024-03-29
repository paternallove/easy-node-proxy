const http = require("http");
const cors = require("cors");
const express = require("express");
const proxy = require("http-proxy-middleware");
const compression = require("compression");
const chalk = require("chalk");
const fs = require("fs");
const moment = require("moment");

const app = express();
const middlewares = require("./middlewares");

const { targetProxy, rewritePath, oldPath, config } = process.env;
let { port, host } = process.env;

// enable cors request
app.use(
  cors({
    credentials: true
  })
);

app.use(compression());

// middlewares(app);

if (config) {
  const proxyPath = `${process.cwd()}/proxy.json`;
  if (!fs.existsSync(proxyPath)) {
    console.log(
      chalk.red(
        `proxy.json doesn't exist, pls execuate 'npm run generate:config'`
      )
    );
    return;
  }

  const { localServer, proxyServer } = JSON.parse(fs.readFileSync(proxyPath));

  if (localServer) {
    localServer.port && (port = localServer.port);
    localServer.host && (host = localServer.host);
  }

  if (proxyServer && proxyServer.length > 0) {
    proxyServer.forEach(({ path, target, ...opts }) => {
      app.use(
        [path],
        proxy({
          target,
          changeOrigin: true,
          logLevel: "debug",
          logProvider: provider => {
            return {
              ...provider,
              debug: log => {
                console.log(moment().format("YYYY-MM-DD HH:mm:ss") + ":" + log);
              },
              info: log => {
                console.log(
                  chalk.green(
                    `${moment().format(
                      "YYYY-MM-DD HH:mm:ss"
                    )} :[HPM] Proxy created:${path}  ->  ${target}`
                  )
                );
              }
            };
          },
          ...opts
        })
      );
    });
  } else {
    chalk.red("proxyServer must be specified!");
    process.exit();
  }
} else {
  app.use(
    "/*",
    proxy({
      target: targetProxy,
      changeOrigin: true,
      logLevel: "debug",
      pathRewrite: {
        ["^" + oldPath]: rewritePath
      }
    })
  );
}

const server = http.createServer(app);

// Start your app.
server.listen(port, host, err => {
  if (err) {
    console.log(err);
  }

  console.log(chalk.green("node proxy start successfully!"));
  console.log(
    chalk.green(
      `The node server can proxy http://${host + ":" + port}/api/* --> /api/*`
    )
  );
});
