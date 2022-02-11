ARG BUILD_FROM
FROM ${BUILD_FROM} as BUILD_IMAGE

WORKDIR /ring
COPY . .
RUN npm install ./ && npm run build

ARG BUILD_FROM
FROM ${BUILD_FROM}

WORKDIR /ring
COPY --from=BUILD_IMAGE /ring/lib ./lib
COPY --from=BUILD_IMAGE /ring/node_modules ./node_modules
COPY --from=BUILD_IMAGE /ring/serve-index ./serve-index

ENTRYPOINT ["/bin/bash", "-c", \
  "mkdir -p /root/video \
     && touch /root/.env \
     && node /ring/lib/examples/cameraOnDing.js /root/video/ 25 /root/.env 2>&1"]

EXPOSE 3000

VOLUME /root
