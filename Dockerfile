FROM --platform=linux/amd64 python:3.11-slim-bullseye AS build

WORKDIR /usr/src/app

COPY . .

CMD [ "python3", "-m", "http.server", "8000" ]
