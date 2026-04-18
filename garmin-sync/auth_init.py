#!/usr/bin/env python3
"""
Run this ONCE locally to generate Garmin auth tokens,
then upload them to the server volume.

Usage:
  pip install garminconnect==0.2.22
  python auth_init.py

Then copy the generated ./garmin_tokens/ directory to the server:
  scp -r ./garmin_tokens/ mua@192.168.252.251:/tmp/garmin_tokens_init/
  ssh mua@192.168.252.251 "
    docker run --rm \
      -v codeandrun_apps_garmin-tokens:/data/garmin_tokens \
      -v /tmp/garmin_tokens_init:/src \
      alpine sh -c 'cp -r /src/. /data/garmin_tokens/'
  "
"""

import os
import getpass
from garminconnect import Garmin

TOKEN_DIR = "./garmin_tokens"
os.makedirs(TOKEN_DIR, exist_ok=True)

email = input("Garmin email: ")
password = getpass.getpass("Garmin password: ")

api = Garmin(email, password)
api.login()
api.garth.dump(TOKEN_DIR)

print(f"\nToken salvati in {TOKEN_DIR}/")
print("Ora copia la directory sul server seguendo le istruzioni nel commento del file.")
