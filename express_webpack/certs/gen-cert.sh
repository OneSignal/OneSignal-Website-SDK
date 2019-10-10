FILE=./certs/dev-ssl.crt
if test -f "$FILE"; then
  echo "express_webpack: dev-ssl.crt already exists."
  echo "express_webpack: skipping SSL cert generation."
else
  echo "express_webpack:\n------ generating new SSL certs ------"
  echo "copy dev-ssl.crt from container to host with:\n>   docker cp <containerId>:sdk/express_webpack/certs/dev-ssl.crt ."
  echo "add cert to keychain (MacOSX):\n>   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/dev-ssl.crt\n"
  echo "restart browser\n--------------------------------------"
  
  # generate cert/key based on conf file
  # defaults to use Common Name: texas
  openssl req -config ./certs/ssl-cert-gen.conf -subj '/C=US/CN=texas' -new -x509 -newkey rsa:2048 -nodes -keyout certs/dev-ssl.key -days 365 -out certs/dev-ssl.crt
fi
