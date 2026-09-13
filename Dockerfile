FROM node:24.14.1-alpine

# tzdata is what makes the TZ env var mean anything: without the zone
# database, Alpine silently ignores TZ and the container stays on UTC.
RUN apk add --no-cache bash tzdata
RUN npm i -g @nestjs/cli typescript ts-node

COPY package*.json /tmp/app/
RUN cd /tmp/app && npm install

COPY . /usr/src/app
RUN cp -a /tmp/app/node_modules /usr/src/app
COPY ./wait-for-it.sh /opt/wait-for-it.sh
RUN chmod +x /opt/wait-for-it.sh
COPY ./startup.relational.dev.sh /opt/startup.relational.dev.sh
RUN chmod +x /opt/startup.relational.dev.sh
RUN sed -i 's/\r//g' /opt/wait-for-it.sh
RUN sed -i 's/\r//g' /opt/startup.relational.dev.sh

WORKDIR /usr/src/app
# No env file is baked into the image: docker-compose injects the selected
# env/.env.<name> file at runtime via `env_file:`.
RUN npm run build

CMD ["/opt/startup.relational.dev.sh"]
