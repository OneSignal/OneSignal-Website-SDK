openssl req -config ./ssl-cert-gen.conf -new -x509 -newkey rsa:2048 -nodes -keyout dev-ssl.key -days 365 -out dev-ssl.crt
