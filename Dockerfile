FROM python:3

WORKDIR /usr/src/app

COPY . .

CMD [ "python3", "-m", "http.server", "8000" ]
