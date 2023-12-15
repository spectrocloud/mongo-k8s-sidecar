FROM --platform=linux/amd64 registry.access.redhat.com/ubi8/nodejs-18-minimal:1-65
RUN rm /bin/nodemon

WORKDIR /opt/spectrocloud/mongo-k8s-sidecar

COPY package.json /opt/spectrocloud/mongo-k8s-sidecar/package.json

RUN npm install --omit=dev
# This step is to update any existing packages
RUN npm update systeminformation

COPY ./src /opt/spectrocloud/mongo-k8s-sidecar/src

CMD ["npm", "start"]
