#!/bin/bash

cd /home/gomer/node_servers/blendAnims

pm2 start npm --name "blendAnims" -- run dev
pm2 save
