FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-eng fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.js ./
COPY --chown=node:node src ./src
RUN mkdir -p /app/uploads && chown node:node /app/uploads
ENV NODE_ENV=production PORT=10000 OMP_THREAD_LIMIT=1
USER node
EXPOSE 10000
CMD ["node", "server.js"]
