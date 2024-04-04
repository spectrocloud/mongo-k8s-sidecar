FROM --platform=linux/amd64 registry.access.redhat.com/ubi8/nodejs-18-minimal:1-99
# FROM --platform=linux/amd64 registry.access.redhat.com/ubi8/nodejs-18-minimal:1-107 does not allow enabling fips mode
# required to fix PSS-23472 npm uses ip version 2.0.0
RUN npm install -g npm@10.5.0
USER root
RUN rm -rf /usr/lib/node_modules/npm
USER 1001
RUN rm /bin/nodemon

WORKDIR /opt/spectrocloud/mongo-k8s-sidecar

COPY package.json /opt/spectrocloud/mongo-k8s-sidecar/package.json

RUN npm install --omit=dev
# This step is to update any existing packages
RUN npm update systeminformation

COPY ./src /opt/spectrocloud/mongo-k8s-sidecar/src

CMD ["npm", "start"]
