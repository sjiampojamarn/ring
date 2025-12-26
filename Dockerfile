ARG BUILD_FROM=node:lts-alpine

FROM ${BUILD_FROM} AS build-image
WORKDIR /ring
COPY . .
RUN npm install ./ && npm run build

FROM ${BUILD_FROM}
WORKDIR /ring
COPY --from=build-image /ring/packages ./packages
COPY --from=build-image /ring/node_modules ./node_modules
COPY --from=build-image /ring/serve-index ./serve-index

RUN apk --no-cache add bash wget

ENTRYPOINT ["/bin/bash", "-c", \
  "mkdir -p /root/video \
     && touch /root/.env \
     && node /ring/packages/examples/lib/cameraOnDing.js /root/video/ 25 /root/.env 2>&1"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

VOLUME /root
