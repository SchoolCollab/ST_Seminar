#!/bin/bash
killall node
cd ./backend && npm install && npm audit && node server.js &
cd ./frontend-web && npm install && npm audit && npm run dev &
cd ./frontend-admin && npm install && npm audit && npm run dev &
