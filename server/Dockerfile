# TRL — The Right Lifestyle
# Optional API image. The website itself is static and can be hosted anywhere.
FROM node:22-alpine

WORKDIR /app

# No npm install step: the server uses only the Node standard library.
COPY package.json ./
COPY server ./server
COPY assets/js/engines ./assets/js/engines
COPY assets/data ./assets/data

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/server/data

RUN mkdir -p "$DATA_DIR" && chown -R node:node /app
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.mjs"]
