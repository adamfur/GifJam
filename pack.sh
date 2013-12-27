#!/bin/bash

rm -f image.animation_mode:none.zip
convert jam.xcf -flatten -transparent white -resize 128x128 logo128.png
convert jam.xcf -flatten -transparent white -resize 64x64 logo64.png
convert jam.xcf -flatten -transparent white -resize 32x32 logo32.png
zip gif_jam.zip *.js manifest.json logo*.png
